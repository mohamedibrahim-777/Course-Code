import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query(
  'SELECT id, name, email, role FROM users ORDER BY role, email'
);
console.log(`\nTotal users: ${rows.length}\n`);
console.table(rows);
await pool.end();
