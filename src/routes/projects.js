const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../lib/prisma');
const {
  requireAuth,
  requireProjectMember,
  requireProjectAdmin,
} = require('../middleware/auth');

router.use(requireAuth);

// --- Schemas ---
const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional().nullable(),
});

const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const roleUpdateSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

// GET /api/projects — projects the user is a member of
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          where: { userId: req.user.id },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    // Flatten "my role" for convenience
    const result = projects.map((p) => ({
      ...p,
      myRole: p.members[0]?.role || 'MEMBER',
      members: undefined,
    }));
    res.json({ projects: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — creator becomes ADMIN automatically
router.post('/', async (req, res, next) => {
  try {
    const data = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'ADMIN' },
        },
      },
    });
    res.status(201).json({ project });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    next(err);
  }
});

// GET /api/projects/:id — full detail
router.get('/:id', requireProjectMember, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json({ project, myRole: req.membership.role });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:id — admins only
router.patch('/:id', requireProjectMember, requireProjectAdmin, async (req, res, next) => {
  try {
    const data = projectSchema.partial().parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ project });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    next(err);
  }
});

// DELETE /api/projects/:id — owner only
router.delete('/:id', requireProjectMember, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this project' });
    }
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/members — invite by email (admin only)
router.post(
  '/:id/members',
  requireProjectMember,
  requireProjectAdmin,
  async (req, res, next) => {
    try {
      const data = memberSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (!user) return res.status(404).json({ error: 'No user with that email' });

      const existing = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.params.id, userId: user.id } },
      });
      if (existing) return res.status(409).json({ error: 'Already a member' });

      const member = await prisma.projectMember.create({
        data: { projectId: req.params.id, userId: user.id, role: data.role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      res.status(201).json({ member });
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', issues: err.issues });
      }
      next(err);
    }
  }
);

// PATCH /api/projects/:id/members/:userId — change role (admin only)
router.patch(
  '/:id/members/:userId',
  requireProjectMember,
  requireProjectAdmin,
  async (req, res, next) => {
    try {
      const data = roleUpdateSchema.parse(req.body);
      const project = await prisma.project.findUnique({ where: { id: req.params.id } });
      // Don't allow demoting the owner
      if (project.ownerId === req.params.userId && data.role !== 'ADMIN') {
        return res.status(400).json({ error: 'Cannot demote the project owner' });
      }
      const member = await prisma.projectMember.update({
        where: {
          projectId_userId: { projectId: req.params.id, userId: req.params.userId },
        },
        data: { role: data.role },
      });
      res.json({ member });
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', issues: err.issues });
      }
      next(err);
    }
  }
);

// DELETE /api/projects/:id/members/:userId — remove (admin only, cannot remove owner)
router.delete(
  '/:id/members/:userId',
  requireProjectMember,
  requireProjectAdmin,
  async (req, res, next) => {
    try {
      const project = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (project.ownerId === req.params.userId) {
        return res.status(400).json({ error: 'Cannot remove the project owner' });
      }
      await prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId: req.params.id, userId: req.params.userId },
        },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
