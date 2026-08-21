// TEMPORARY — one-shot migration runner, added because the operator's network
// cannot reach the production Postgres host directly (P1001) and the pooler
// connection was hanging. Vercel's own runtime already has working DB access
// (proven by every other endpoint), so this runs the two pending migrations
// via the already-connected Prisma Client instead of a fresh CLI connection.
// DELETE THIS FILE (and its mount in server.ts) immediately after use.
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma/client';

const router = Router();
const SECRET = '6b941e1347f0ce5187e54707b2d6101690e69837e17aad43';

const MIGRATIONS = [
  '20260820084708_add_duplicate_detection',
  '20260820114405_add_permission_system',
];

router.post('/', async (req: Request, res: Response) => {
  if (req.headers['x-migrate-secret'] !== SECRET) return res.status(404).json({ error: 'Not found' });

  const results: any[] = [];
  try {
    for (const name of MIGRATIONS) {
      const already = await prisma.$queryRawUnsafe<any[]>(
        `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`, name
      );
      if (already.length > 0) { results.push({ name, status: 'already applied, skipped' }); continue; }

      const sqlPath = path.join(__dirname, '..', '..', 'prisma', 'migrations', name, 'migration.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const statements = sql
        .split(/;\s*(?:\n|$)/)
        .map(s => s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim())
        .filter(s => s.length > 0);

      const startedAt = new Date();
      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }
      const finishedAt = new Date();

      const id = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        id, checksum, finishedAt, name, startedAt, statements.length
      );
      results.push({ name, status: 'applied', statementsRun: statements.length });
    }
    res.json({ ok: true, results });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message, results });
  }
});

export default router;
