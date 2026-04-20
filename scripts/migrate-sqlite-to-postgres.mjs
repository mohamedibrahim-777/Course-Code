// One-shot migration: copy every row from local database.db (SQLite) into Supabase Postgres.
// Idempotent — uses ON CONFLICT DO NOTHING, safe to re-run.

import 'dotenv/config';
import Database from 'better-sqlite3';
import pg from 'pg';
import { join } from 'path';

const { Pool } = pg;

const sqlite = new Database(join(process.cwd(), 'database.db'), { readonly: true });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Tables in foreign-key safe order. Insert columns are explicit so SQLite/Postgres column
// drift can't cause silent data corruption.
const TABLES = [
  { name: 'users',              cols: ['id', 'name', 'email', 'password', 'role', 'bio', 'profile_pic'] },
  { name: 'courses',            cols: ['id', 'title', 'description', 'language', 'level', 'thumbnail', 'created_by', 'created_at'] },
  { name: 'lessons',            cols: ['id', 'course_id', 'title', 'content', 'video_url', 'resource_url', 'resource_type', 'order_index'] },
  { name: 'progress',           cols: ['id', 'user_id', 'lesson_id', 'completed_at'] },
  { name: 'comments',           cols: ['id', 'lesson_id', 'user_id', 'parent_id', 'content', 'created_at'] },
  { name: 'otps',               cols: ['email', 'otp', 'expires_at'] },
  { name: 'otp_requests',       cols: ['email', 'requested_at'] },
  { name: 'focus_sessions',     cols: ['id', 'user_id', 'type', 'duration', 'completed_at'] },
  { name: 'course_enrollments', cols: ['id', 'user_id', 'course_id', 'enrolled_at'] },
];

let totalCopied = 0;

try {
  for (const { name, cols } of TABLES) {
    let exists;
    try {
      sqlite.prepare(`SELECT 1 FROM ${name} LIMIT 1`).get();
      exists = true;
    } catch {
      exists = false;
    }
    if (!exists) {
      console.log(`[skip] ${name}: not present in SQLite`);
      continue;
    }

    const rows = sqlite.prepare(`SELECT ${cols.join(', ')} FROM ${name}`).all();
    if (rows.length === 0) {
      console.log(`[skip] ${name}: empty`);
      continue;
    }

    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    let copied = 0;
    for (const r of rows) {
      const values = cols.map((c) => r[c] ?? null);
      const res = await pool.query(sql, values);
      copied += res.rowCount ?? 0;
    }
    console.log(`[copy] ${name}: ${copied}/${rows.length}`);
    totalCopied += copied;
  }
  console.log(`\n[done] ${totalCopied} rows migrated`);
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
} finally {
  sqlite.close();
  await pool.end();
}
