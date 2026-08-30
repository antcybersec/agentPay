import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Ensure DATABASE_URL is set before PrismaClient initializes
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (!process.env.DATABASE_URL) {
  if (isServerless) {
    process.env.DATABASE_URL = 'file:/tmp/dev.db';
  } else {
    process.env.DATABASE_URL = 'file:./dev.db';
  }
}

// In serverless environments, ensure the SQLite database file exists in writable /tmp directory
if (isServerless && process.env.DATABASE_URL.startsWith('file:/tmp/')) {
  try {
    const tmpDbPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.join(path.resolve(), 'prisma', 'dev.db'),
      ];
      let copied = false;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          fs.copyFileSync(candidate, tmpDbPath);
          console.log(`[AgentPay Prisma] Copied pre-seeded database from ${candidate} to ${tmpDbPath}`);
          copied = true;
          break;
        }
      }
      if (!copied) {
        console.log(`[AgentPay Prisma] No pre-seeded database found at ${candidates.join(', ')}. Initializing new DB at ${tmpDbPath}`);
      }
    }
  } catch (err) {
    console.warn('[AgentPay Prisma] Notice during /tmp DB setup:', err);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
