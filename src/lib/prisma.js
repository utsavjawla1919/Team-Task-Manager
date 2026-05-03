const { PrismaClient } = require('@prisma/client');

// Single shared Prisma instance — important in serverless / dev hot-reload
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;
