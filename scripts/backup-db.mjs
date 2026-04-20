#!/usr/bin/env node
// Hot-backup the SQLite database to backups/ as a gzipped, timestamped file.
// Usage: node scripts/backup-db.mjs
// Cron (Linux):  0 3 * * *  cd /app && node scripts/backup-db.mjs
// Keeps the last 14 backups.

import Database from 'better-sqlite3';
import { createGzip } from 'zlib';
import { createReadStream, createWriteStream, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pipeline } from 'stream/promises';

const ROOT = process.cwd();
const DB_PATH = join(ROOT, 'database.db');
const BACKUP_DIR = join(ROOT, 'backups');
const KEEP = 14;

mkdirSync(BACKUP_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const tmpFile = join(tmpdir(), `db-backup-${stamp}.db`);
const outFile = join(BACKUP_DIR, `database-${stamp}.db.gz`);

const db = new Database(DB_PATH, { readonly: true });
await db.backup(tmpFile);
db.close();

await pipeline(createReadStream(tmpFile), createGzip(), createWriteStream(outFile));
unlinkSync(tmpFile);

console.log(`[backup] wrote ${outFile}`);

const backups = readdirSync(BACKUP_DIR)
  .filter((f) => f.endsWith('.db.gz'))
  .map((f) => ({ f, mtime: statSync(join(BACKUP_DIR, f)).mtime.getTime() }))
  .sort((a, b) => b.mtime - a.mtime);

for (const old of backups.slice(KEEP)) {
  unlinkSync(join(BACKUP_DIR, old.f));
  console.log(`[backup] pruned ${old.f}`);
}
