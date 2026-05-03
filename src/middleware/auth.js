const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-in-production';

// Verifies JWT, attaches { id, email, name } to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Checks the user is a member of :projectId, attaches req.membership
async function requireProjectMember(req, res, next) {
  const projectId = req.params.projectId || req.params.id;
  if (!projectId) return res.status(400).json({ error: 'Missing project id' });

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.id } },
  });

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this project' });
  }
  req.membership = membership;
  next();
}

// Must come AFTER requireProjectMember in the chain
function requireProjectAdmin(req, res, next) {
  if (req.membership?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  requireAuth,
  requireProjectMember,
  requireProjectAdmin,
  signToken,
};
