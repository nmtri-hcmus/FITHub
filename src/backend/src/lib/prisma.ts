import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// We need to attach the global object in a way that works cleanly in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set!');
  }
  
  // We use the PrismaPg driver adapter, which is required for Prisma v7
  const adapter = new PrismaPg({
    connectionString,
  });
  
  return new PrismaClient({ adapter });
}

// Ensure we don't accidentally create 10,000 database connections if the 
// server reloads during local development
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}