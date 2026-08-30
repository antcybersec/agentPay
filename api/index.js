import app from '../dist/app.js';
import { ensureDatabaseSeeded } from '../dist/services/dbInit.js';

// Auto-initialize the database on serverless cold start
ensureDatabaseSeeded().catch((err) => {
  console.warn('[Vercel Serverless Entry] DB init warning:', err);
});

export default app;
