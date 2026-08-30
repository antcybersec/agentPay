import app from '../src/app.js';
import { ensureDatabaseSeeded } from '../src/services/dbInit.js';

// Eagerly initialize the database on serverless worker cold start
ensureDatabaseSeeded().catch((err) => {
  console.warn('[Vercel Serverless Entry] DB init warning:', err);
});

export default app;
