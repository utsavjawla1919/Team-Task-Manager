const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/dashboard — stats for the logged-in user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Project IDs the user is a member of (used for "all visible tasks")
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    const [
      projectCount,
      myTasks,
      statusBreakdown,
      overdueTasks,
      recentTasks,
    ] = await Promise.all([
      prisma.project.count({ where: { id: { in: projectIds } } }),
      prisma.task.findMany({
        where: { assigneeId: userId, status: { not: 'DONE' } },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          status: { not: 'DONE' },
          dueDate: { lt: now },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Normalize status breakdown to { TODO, IN_PROGRESS, DONE }
    const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const row of statusBreakdown) counts[row.status] = row._count._all;

    res.json({
      projectCount,
      myOpenTaskCount: myTasks.length,
      overdueCount: overdueTasks.length,
      statusCounts: counts,
      myTasks,
      overdueTasks,
      recentTasks,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
