import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const r = await pool.query('SELECT version(), now()');
  console.log('OK:', r.rows[0]);
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
