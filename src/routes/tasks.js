const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  projectId: z.string(),
});

const taskUpdateSchema = taskCreateSchema.partial().omit({ projectId: true });

// Helper — verify user can act on a task
async function loadTaskWithMembership(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) return { error: { status: 404, message: 'Task not found' } };

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: task.projectId, userId } },
  });
  if (!membership) return { error: { status: 403, message: 'Not a project member' } };

  return { task, membership };
}

// POST /api/tasks — create a task in a project
router.post('/', async (req, res, next) => {
  try {
    const data = taskCreateSchema.parse(req.body);

    // Caller must be a member of the target project
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: data.projectId, userId: req.user.id } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a project member' });

    // If assignee provided, they must also be a member
    if (data.assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: data.projectId, userId: data.assigneeId },
        },
      });
      if (!assigneeMember) {
        return res.status(400).json({ error: 'Assignee is not a project member' });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId: data.projectId,
        assigneeId: data.assigneeId || null,
        createdById: req.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ task });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    next(err);
  }
});

// PATCH /api/tasks/:id — update
// Members can update tasks they created or are assigned to.
// Admins can update any task in the project.
router.patch('/:id', async (req, res, next) => {
  try {
    const data = taskUpdateSchema.parse(req.body);
    const result = await loadTaskWithMembership(req.params.id, req.user.id);
    if (result.error) return res.status(result.error.status).json({ error: result.error.message });
    const { task, membership } = result;

    const isAdmin = membership.role === 'ADMIN';
    const isCreator = task.createdById === req.user.id;
    const isAssignee = task.assigneeId === req.user.id;
    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ error: 'Not allowed to edit this task' });
    }

    // If reassigning, verify new assignee is a project member
    if (data.assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: task.projectId, userId: data.assigneeId },
        },
      });
      if (!assigneeMember) {
        return res.status(400).json({ error: 'Assignee is not a project member' });
      }
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.json({ task: updated });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    next(err);
  }
});

// DELETE /api/tasks/:id — admins or creators
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await loadTaskWithMembership(req.params.id, req.user.id);
    if (result.error) return res.status(result.error.status).json({ error: result.error.message });
    const { task, membership } = result;

    const isAdmin = membership.role === 'ADMIN';
    const isCreator = task.createdById === req.user.id;
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Only admins or the creator can delete this task' });
    }
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
