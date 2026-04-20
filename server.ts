import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

dotenv.config();

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (IS_PROD) {
    console.error('FATAL: JWT_SECRET must be set to a strong random value (>=32 chars) in production.');
    process.exit(1);
  }
  console.warn('[warn] JWT_SECRET is missing or weak. Set a strong value in .env before deploying.');
}
const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-only-insecure-fallback';
const SEED_PASSWORD = process.env.SEED_PASSWORD || (IS_PROD ? null : 'admin123');
if (IS_PROD && !SEED_PASSWORD) {
  console.error('FATAL: SEED_PASSWORD must be set in production.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL must be set (Supabase Postgres connection string).');
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (for file uploads).');
  process.exit(1);
}

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

// ========== DATABASE ==========
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

const q = (sql: string, params?: any[]) => pool.query(sql, params);
const qOne = async <T = any>(sql: string, params?: any[]): Promise<T | null> => {
  const r = await pool.query(sql, params);
  return (r.rows[0] as T) ?? null;
};
const qAll = async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
  const r = await pool.query(sql, params);
  return r.rows as T[];
};
const withTxn = async <T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Schema is applied externally (scripts/init-supabase-schema.mjs). Verify on startup.
const verifySchema = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM pg_tables WHERE schemaname='public' AND tablename='users'`
    );
    if (rows[0].c === 0) {
      console.error('FATAL: users table missing. Run: node scripts/init-supabase-schema.mjs');
      process.exit(1);
    }
  } catch (e: any) {
    console.error('FATAL: cannot reach database:', e.message);
    process.exit(1);
  }
};
await verifySchema();

// ========== SUPABASE STORAGE ==========
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false },
});

// Ensure the uploads bucket exists and is public.
const ensureBucket = async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === SUPABASE_BUCKET)) {
    const { error } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
    });
    if (error && !/already exists/i.test(error.message)) {
      console.error('FATAL: failed to create bucket:', error.message);
      process.exit(1);
    }
  }
};
await ensureBucket();

// ========== SEED ADMINS ==========
const seedAdmins = async () => {
  const admins = [
    { name: 'HOD User', email: process.env.HOD_EMAIL || 'hod@example.com', role: 'hod' },
    { name: 'Staff One', email: process.env.STAFF1_EMAIL || 'staff1@example.com', role: 'staff' },
    { name: 'Staff Two', email: process.env.STAFF2_EMAIL || 'staff2@example.com', role: 'staff' },
    { name: 'Student User', email: 'student@coursecode.com', role: 'student' },
  ];
  for (const admin of admins) {
    const existing = await qOne('SELECT id FROM users WHERE email = $1', [admin.email]);
    if (!existing) {
      const hashed = bcrypt.hashSync(SEED_PASSWORD!, 10);
      await q('INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)', [
        randomUUID(), admin.name, admin.email, hashed, admin.role,
      ]);
      console.log(`Seeded admin: ${admin.email}`);
    }
  }
};
await seedAdmins();

// ========== APP ==========
const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      // No whitelist configured → reflect any origin (suitable for same-origin apps).
      // Browsers send an Origin header even for same-origin requests when assets use
      // crossorigin attributes, so an empty whitelist must NOT be treated as deny-all.
      if (corsOrigins.length === 0) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, try again later.' },
});

app.use(express.json({ limit: '5mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ========== UPLOAD / DOWNLOAD ==========
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/mp4', 'audio/wav',
  'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

// Wraps async route handlers so thrown errors hit the global error handler.
const asyncH =
  (fn: (req: any, res: any, next: any) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireStaff = (req: any, res: any, next: any) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  next();
};

const isString = (v: any, max = 1000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const sanitize = (v: string) => v.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const parsePagination = (req: any) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  return { limit, offset };
};

app.post(
  '/api/upload',
  authenticate,
  requireStaff,
  (req, res, next) => upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 50MB)' });
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  }),
  asyncH(async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file selected' });
    const sanitized = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${Date.now()}-${sanitized}`;
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(key, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) return res.status(500).json({ error: error.message });
    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(key);
    res.json({ success: true, url: data.publicUrl, filename: req.file.originalname });
  })
);

// Proxy download with original filename preserved (Supabase URLs lack Content-Disposition).
app.get('/api/download', asyncH(async (req, res) => {
  const fileUrl = req.query.url as string;
  const name = req.query.name as string;
  if (!fileUrl) return res.status(400).json({ error: 'Missing url' });

  // Allow only Supabase Storage URLs from our project; reject anything else to prevent
  // turning the endpoint into an open redirect / SSRF gadget.
  let parsed: URL;
  try {
    parsed = new URL(fileUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  const supabaseHost = new URL(process.env.SUPABASE_URL!).host;
  if (parsed.host !== supabaseHost) return res.status(400).json({ error: 'Forbidden host' });

  const upstream = await fetch(fileUrl);
  if (!upstream.ok || !upstream.body) return res.status(404).json({ error: 'File not found' });

  const downloadName = name || path.basename(parsed.pathname).replace(/^\d+-/, '');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName.replace(/"/g, '')}"`);
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
  const len = upstream.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);
  const { Readable } = await import('stream');
  Readable.fromWeb(upstream.body as any).pipe(res);
}));

// ========== AUTH ==========
app.use('/api/auth', authLimiter);

app.post('/api/auth/login', asyncH(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isString(email, 200) || !isString(password, 200)) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = await qOne<any>('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user: payload });
}));

app.post('/api/auth/register-request', asyncH(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!isString(name, 100) || !isString(email, 200) || !isString(password, 200)) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }
  if (password.length < 4) return res.status(400).json({ error: 'Password too short (min 4)' });

  await q("DELETE FROM otp_requests WHERE requested_at < NOW() - INTERVAL '10 minutes'");
  const recent = await qOne<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM otp_requests WHERE email = $1 AND requested_at >= NOW() - INTERVAL '10 minutes'",
    [email]
  );
  if ((recent?.c ?? 0) >= 3) return res.status(429).json({ error: 'Too many OTP requests. Try again in 10 minutes.' });

  const existing = await qOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

  await q('DELETE FROM otps WHERE email = $1', [email]);
  await q('INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)', [email, otp, expiresAt]);
  await q('INSERT INTO otp_requests (email) VALUES ($1)', [email]);

  console.log(`\n========================================`);
  console.log(`  OTP for ${email}: ${otp}`);
  console.log(`========================================\n`);
  res.json({ success: true, message: 'OTP sent! Check the server console.' });
}));

app.post('/api/auth/verify-register', asyncH(async (req, res) => {
  const { name, email, password, otp, role } = req.body || {};
  if (!isString(name, 100) || !isString(email, 200) || !isString(password, 200) || !isString(otp, 10)) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const record = await qOne<any>('SELECT * FROM otps WHERE email = $1 AND otp = $2', [email, otp]);
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }
  const finalRole = role === 'staff' ? 'staff' : 'student';
  await q('DELETE FROM otps WHERE email = $1', [email]);
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = randomUUID();
    await q('INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)', [
      id, name, email, hashedPassword, finalRole,
    ]);
    const user = { id, name, email, role: finalRole };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user });
  } catch {
    res.status(400).json({ error: 'Registration failed. Email may already exist.' });
  }
}));

app.put('/api/auth/change-password', authenticate, asyncH(async (req: any, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isString(currentPassword, 200) || !isString(newPassword, 200)) {
    return res.status(400).json({ error: 'Both passwords required' });
  }
  if (newPassword.length < 4) return res.status(400).json({ error: 'New password too short' });
  const user = await qOne<any>('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  await q('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
  res.json({ success: true });
}));

app.post('/api/auth/change-email-request', authenticate, asyncH(async (req: any, res) => {
  const { newEmail } = req.body || {};
  if (!isString(newEmail, 200) || !newEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const existing = await qOne('SELECT id FROM users WHERE email = $1', [newEmail]);
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  await q("DELETE FROM otp_requests WHERE requested_at < NOW() - INTERVAL '10 minutes'");
  const recent = await qOne<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM otp_requests WHERE email = $1 AND requested_at >= NOW() - INTERVAL '10 minutes'",
    [newEmail]
  );
  if ((recent?.c ?? 0) >= 3) return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
  await q('DELETE FROM otps WHERE email = $1', [newEmail]);
  await q('INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)', [newEmail, otp, expiresAt]);
  await q('INSERT INTO otp_requests (email) VALUES ($1)', [newEmail]);

  console.log(`\n========================================`);
  console.log(`  Email change OTP for ${newEmail}: ${otp}`);
  console.log(`========================================\n`);
  res.json({ success: true });
}));

app.put('/api/auth/change-email', authenticate, asyncH(async (req: any, res) => {
  const { newEmail, otp } = req.body || {};
  if (!isString(newEmail, 200) || !isString(otp, 10)) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }
  const record = await qOne<any>('SELECT * FROM otps WHERE email = $1 AND otp = $2', [newEmail, otp]);
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }
  const existing = await qOne('SELECT id FROM users WHERE email = $1', [newEmail]);
  if (existing) return res.status(400).json({ error: 'Email already in use' });
  await q('DELETE FROM otps WHERE email = $1', [newEmail]);
  await q('UPDATE users SET email = $1 WHERE id = $2', [newEmail, req.user.id]);
  const user = await qOne<any>('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
  const token = jwt.sign(user!, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user });
}));

// ========== COURSES ==========
app.get('/api/courses', authenticate, asyncH(async (req: any, res) => {
  const { limit, offset } = parsePagination(req);
  const filter = req.query.filter as string;

  if (req.user.role === 'student') {
    if (filter === 'browse') {
      const courses = await qAll(`
        SELECT c.*, u.name AS created_by_name
        FROM courses c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id NOT IN (SELECT course_id FROM course_enrollments WHERE user_id = $1)
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
      `, [req.user.id, limit, offset]);
      return res.json(courses);
    }
    const courses = await qAll(`
      SELECT c.*, u.name AS created_by_name, 1 AS enrolled
      FROM courses c
      INNER JOIN course_enrollments e ON e.course_id = c.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);
    return res.json(courses);
  }

  const courses = await qAll(`
    SELECT c.*, u.name AS created_by_name
    FROM courses c
    LEFT JOIN users u ON c.created_by = u.id
    ORDER BY c.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  res.json(courses);
}));

app.get('/api/courses/:id', authenticate, asyncH(async (req: any, res) => {
  const course = await qOne<any>(`
    SELECT c.*, u.name AS created_by_name
    FROM courses c LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = $1
  `, [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (req.user.role === 'student') {
    const enrolled = await qOne(
      'SELECT id FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, req.params.id]
    );
    if (!enrolled) return res.status(403).json({ error: 'You are not enrolled in this course' });
  }

  const lessons = await qAll('SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index', [req.params.id]);
  res.json({ ...course, lessons });
}));

app.post('/api/courses', authenticate, requireStaff, asyncH(async (req: any, res) => {
  const { title, description, language, level, thumbnail } = req.body || {};
  if (!isString(title, 200)) return res.status(400).json({ error: 'Title required (max 200 chars)' });
  if (description && typeof description !== 'string') return res.status(400).json({ error: 'Invalid description' });
  if (description && description.length > 5000) return res.status(400).json({ error: 'Description too long' });
  if (!isString(language, 50)) return res.status(400).json({ error: 'Language required' });
  if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  if (thumbnail && typeof thumbnail !== 'string') return res.status(400).json({ error: 'Invalid thumbnail' });

  const id = randomUUID();
  await q(
    'INSERT INTO courses (id, title, description, language, level, thumbnail, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, escapeHtml(title.trim()), description ? escapeHtml(description.trim()) : '', language.trim(), level, thumbnail || null, req.user.id]
  );
  res.json({ success: true, id });
}));

app.put('/api/courses/:id', authenticate, requireStaff, asyncH(async (req: any, res) => {
  const course = await qOne<any>('SELECT created_by FROM courses WHERE id = $1', [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (req.user.role !== 'hod' && course.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own courses' });
  }
  const { title, description, language, level, thumbnail } = req.body || {};
  if (!isString(title, 200)) return res.status(400).json({ error: 'Title required' });
  if (!isString(language, 50)) return res.status(400).json({ error: 'Language required' });
  if (!['beginner', 'intermediate', 'advanced'].includes(level)) return res.status(400).json({ error: 'Invalid level' });
  await q(
    'UPDATE courses SET title = $1, description = $2, language = $3, level = $4, thumbnail = $5 WHERE id = $6',
    [escapeHtml(title.trim()), description ? escapeHtml(String(description).trim()) : '', language.trim(), level, thumbnail || null, req.params.id]
  );
  res.json({ success: true });
}));

app.delete('/api/courses/:id', authenticate, requireStaff, asyncH(async (req: any, res) => {
  const course = await qOne<any>('SELECT created_by FROM courses WHERE id = $1', [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (req.user.role !== 'hod' && course.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own courses' });
  }
  await withTxn(async (c) => {
    await c.query(
      `DELETE FROM comments WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id = $1)`,
      [req.params.id]
    );
    await c.query(
      `DELETE FROM progress WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id = $1)`,
      [req.params.id]
    );
    await c.query('DELETE FROM lessons WHERE course_id = $1', [req.params.id]);
    await c.query('DELETE FROM course_enrollments WHERE course_id = $1', [req.params.id]);
    await c.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
  });
  res.json({ success: true });
}));

// ========== ENROLLMENT ==========
app.post('/api/courses/:id/enroll', authenticate, asyncH(async (req: any, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can enroll' });
  const course = await qOne('SELECT id FROM courses WHERE id = $1', [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  try {
    await q('INSERT INTO course_enrollments (id, user_id, course_id) VALUES ($1, $2, $3)', [
      randomUUID(), req.user.id, req.params.id,
    ]);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Already enrolled' });
  }
}));

app.delete('/api/courses/:id/enroll', authenticate, asyncH(async (req: any, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can unenroll' });
  await q('DELETE FROM course_enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, req.params.id]);
  res.json({ success: true });
}));

app.post('/api/courses/:id/contact', authenticate, asyncH(async (req: any, res) => {
  const { message } = req.body || {};
  if (!isString(message, 2000)) return res.status(400).json({ error: 'Message required' });
  const course = await qOne('SELECT id FROM courses WHERE id = $1', [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const firstLesson = await qOne<any>(
    'SELECT id FROM lessons WHERE course_id = $1 ORDER BY order_index LIMIT 1',
    [req.params.id]
  );
  if (!firstLesson) return res.status(400).json({ error: 'No lessons available to attach message to' });
  const id = randomUUID();
  await q(
    'INSERT INTO comments (id, lesson_id, user_id, parent_id, content) VALUES ($1, $2, $3, $4, $5)',
    [id, firstLesson.id, req.user.id, null, `[Contact Instructor]\n${escapeHtml(message.trim())}`]
  );
  res.json({ success: true });
}));

// ========== LESSONS ==========
app.post('/api/lessons', authenticate, requireStaff, asyncH(async (req: any, res) => {
  const { course_id, title, content, video_url, resource_url, resource_type, order_index } = req.body || {};
  if (!isString(course_id, 100)) return res.status(400).json({ error: 'course_id required' });
  if (!isString(title, 200)) return res.status(400).json({ error: 'Title required' });
  if (content && content.length > 50000) return res.status(400).json({ error: 'Content too long' });

  const course = await qOne<any>('SELECT created_by FROM courses WHERE id = $1', [course_id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (req.user.role !== 'hod' && course.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only add lessons to your own courses' });
  }

  const id = randomUUID();
  await q(
    'INSERT INTO lessons (id, course_id, title, content, video_url, resource_url, resource_type, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, course_id, escapeHtml(title.trim()), content ? sanitize(content) : '', video_url || null, resource_url || null, resource_type || null, parseInt(order_index) || 0]
  );
  res.json({ success: true, id });
}));

app.put('/api/lessons/:id', authenticate, requireStaff, asyncH(async (req: any, res) => {
  const lesson = await qOne<any>(`
    SELECT l.id, c.created_by
    FROM lessons l JOIN courses c ON l.course_id = c.id
    WHERE l.id = $1
  `, [req.params.id]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (req.user.role !== 'hod' && lesson.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit lessons in your own courses' });
  }
  const { title, content, video_url, resource_url, resource_type, order_index } = req.body || {};
  if (!isString(title, 200)) return res.status(400).json({ error: 'Title required' });
  if (content && content.length > 50000) return res.status(400).json({ error: 'Content too long' });
  await q(
    'UPDATE lessons SET title = $1, content = $2, video_url = $3, resource_url = $4, resource_type = $5, order_index = $6 WHERE id = $7',
    [escapeHtml(title.trim()), content ? sanitize(content) : '', video_url || null, resource_url || null, resource_type || null, parseInt(order_index) || 0, req.params.id]
  );
  res.json({ success: true });
}));

app.delete('/api/lessons/:id', authenticate, requireStaff, asyncH(async (req: any, res) => {
  const lesson = await qOne<any>(`
    SELECT l.id, c.created_by
    FROM lessons l JOIN courses c ON l.course_id = c.id
    WHERE l.id = $1
  `, [req.params.id]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (req.user.role !== 'hod' && lesson.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete lessons in your own courses' });
  }
  await withTxn(async (c) => {
    await c.query('DELETE FROM comments WHERE lesson_id = $1', [req.params.id]);
    await c.query('DELETE FROM progress WHERE lesson_id = $1', [req.params.id]);
    await c.query('DELETE FROM lessons WHERE id = $1', [req.params.id]);
  });
  res.json({ success: true });
}));

// ========== ANALYTICS ==========
app.get('/api/analytics/summary', authenticate, requireStaff, asyncH(async (_req: any, res) => {
  const totalStudents = (await qOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM users WHERE role = 'student'"))!.c;
  const totalStaff = (await qOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM users WHERE role = 'staff'"))!.c;
  const totalCourses = (await qOne<{ c: number }>('SELECT COUNT(*)::int AS c FROM courses'))!.c;
  const totalLessons = (await qOne<{ c: number }>('SELECT COUNT(*)::int AS c FROM lessons'))!.c;
  const totalCompleted = (await qOne<{ c: number }>('SELECT COUNT(*)::int AS c FROM progress'))!.c;
  const totalEnrollments = (await qOne<{ c: number }>('SELECT COUNT(*)::int AS c FROM course_enrollments'))!.c;
  const avgProgress = totalLessons > 0 && totalStudents > 0
    ? Math.round((totalCompleted / (totalStudents * totalLessons)) * 100)
    : 0;
  res.json({ totalStudents, totalStaff, totalCourses, totalLessons, totalCompleted, totalEnrollments, avgProgress });
}));

app.post('/api/progress', authenticate, asyncH(async (req: any, res) => {
  const { lesson_id } = req.body || {};
  if (!isString(lesson_id, 100)) return res.status(400).json({ error: 'lesson_id required' });
  if (req.user.role === 'student') {
    const enrolled = await qOne(`
      SELECT 1 FROM lessons l
      INNER JOIN course_enrollments e ON e.course_id = l.course_id
      WHERE l.id = $1 AND e.user_id = $2
    `, [lesson_id, req.user.id]);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this course' });
  }
  await q(
    'INSERT INTO progress (id, user_id, lesson_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, lesson_id) DO NOTHING',
    [randomUUID(), req.user.id, lesson_id]
  );
  res.json({ success: true });
}));

app.get('/api/progress', authenticate, asyncH(async (req: any, res) => {
  const progress = await qAll('SELECT * FROM progress WHERE user_id = $1', [req.user.id]);
  res.json(progress);
}));

app.get('/api/analytics/students', authenticate, requireStaff, asyncH(async (_req: any, res) => {
  const rows = await qAll<any>(`
    SELECT u.id, u.name, u.email,
           (SELECT COUNT(*)::int FROM progress WHERE user_id = u.id) AS lessons_completed,
           (SELECT COUNT(*)::int FROM course_enrollments WHERE user_id = u.id) AS enrollments
    FROM users u WHERE u.role = 'student'
  `);
  res.json(rows);
}));

app.get('/api/analytics/staff', authenticate, asyncH(async (req: any, res) => {
  if (req.user.role !== 'hod') return res.status(403).json({ error: 'Forbidden' });
  const rows = await qAll<any>(`
    SELECT u.id, u.name, u.email,
           (SELECT COUNT(*)::int FROM courses WHERE created_by = u.id) AS courses_created
    FROM users u WHERE u.role = 'staff'
  `);
  res.json(rows);
}));

// ========== COMMENTS / DOUBTS ==========
app.get('/api/lessons/:id/comments', authenticate, asyncH(async (req: any, res) => {
  if (req.user.role === 'student') {
    const enrolled = await qOne(`
      SELECT 1 FROM lessons l INNER JOIN course_enrollments e ON e.course_id = l.course_id
      WHERE l.id = $1 AND e.user_id = $2
    `, [req.params.id, req.user.id]);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled' });
  }
  const comments = await qAll(`
    SELECT c.*, u.name AS user_name, u.role AS user_role, u.profile_pic
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.lesson_id = $1 ORDER BY c.created_at
  `, [req.params.id]);
  res.json(comments);
}));

app.post('/api/lessons/:id/comments', authenticate, asyncH(async (req: any, res) => {
  const { content, parent_id } = req.body || {};
  if (!isString(content, 5000)) return res.status(400).json({ error: 'Content required (max 5000 chars)' });
  if (req.user.role === 'student') {
    const enrolled = await qOne(`
      SELECT 1 FROM lessons l INNER JOIN course_enrollments e ON e.course_id = l.course_id
      WHERE l.id = $1 AND e.user_id = $2
    `, [req.params.id, req.user.id]);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled' });
  }
  if (parent_id) {
    const parent = await qOne('SELECT id FROM comments WHERE id = $1', [parent_id]);
    if (!parent) return res.status(400).json({ error: 'Parent comment not found' });
  }
  const id = randomUUID();
  const cleanContent = escapeHtml(content.trim());
  await q(
    'INSERT INTO comments (id, lesson_id, user_id, parent_id, content) VALUES ($1, $2, $3, $4, $5)',
    [id, req.params.id, req.user.id, parent_id || null, cleanContent]
  );
  const user = await qOne<any>('SELECT name, role, profile_pic FROM users WHERE id = $1', [req.user.id]);
  res.json({
    id, lesson_id: req.params.id, user_id: req.user.id, parent_id: parent_id || null,
    content: cleanContent, created_at: new Date().toISOString(),
    user_name: user!.name, user_role: user!.role, profile_pic: user!.profile_pic,
  });
}));

app.post('/api/comments/:id/reply', authenticate, asyncH(async (req: any, res) => {
  const { content } = req.body || {};
  if (!isString(content, 5000)) return res.status(400).json({ error: 'Content required' });
  const parent = await qOne<any>('SELECT id, lesson_id FROM comments WHERE id = $1', [req.params.id]);
  if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
  const id = randomUUID();
  const cleanContent = escapeHtml(content.trim());
  await q(
    'INSERT INTO comments (id, lesson_id, user_id, parent_id, content) VALUES ($1, $2, $3, $4, $5)',
    [id, parent.lesson_id, req.user.id, parent.id, cleanContent]
  );
  res.json({ success: true, id });
}));

app.get('/api/comments/all', authenticate, requireStaff, asyncH(async (req: any, res) => {
  const { limit, offset } = parsePagination(req);
  const baseSql = `
    SELECT c.*, u.name AS user_name, u.role AS user_role, u.profile_pic,
           l.title AS lesson_title, l.course_id, co.title AS course_title, co.created_by AS course_created_by
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN lessons l ON c.lesson_id = l.id
    LEFT JOIN courses co ON l.course_id = co.id
  `;
  const rows = req.user.role === 'hod'
    ? await qAll<any>(`${baseSql} ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset])
    : await qAll<any>(`${baseSql} WHERE co.created_by = $1 ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`, [req.user.id, limit, offset]);
  // Strip the helper column we used for filtering; clients shouldn't see it.
  for (const r of rows) delete r.course_created_by;
  res.json(rows);
}));

app.delete('/api/comments/:id', authenticate, asyncH(async (req: any, res) => {
  const comment = await qOne<any>('SELECT * FROM comments WHERE id = $1', [req.params.id]);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.user_id !== req.user.id && req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  await withTxn(async (c) => {
    await c.query('DELETE FROM comments WHERE parent_id = $1', [req.params.id]);
    await c.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
  });
  res.json({ success: true });
}));

// ========== FOCUS SESSIONS ==========
app.post('/api/focus-sessions', authenticate, asyncH(async (req: any, res) => {
  const { type, duration } = req.body || {};
  if (!['focus', 'break'].includes(type) || !duration || typeof duration !== 'number' || duration <= 0 || duration > 86400) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  await q('INSERT INTO focus_sessions (id, user_id, type, duration) VALUES ($1, $2, $3, $4)', [
    randomUUID(), req.user.id, type, duration,
  ]);
  res.json({ success: true });
}));

app.get('/api/focus-sessions/me', authenticate, asyncH(async (req: any, res) => {
  const sessions = await qAll(
    'SELECT type, SUM(duration)::int AS total_seconds, COUNT(*)::int AS count FROM focus_sessions WHERE user_id = $1 GROUP BY type',
    [req.user.id]
  );
  res.json(sessions);
}));

app.get('/api/analytics/focus', authenticate, requireStaff, asyncH(async (_req: any, res) => {
  const rows = await qAll<any>(`
    SELECT u.id, u.name, u.email,
           COALESCE(SUM(CASE WHEN f.type = 'focus' THEN f.duration ELSE 0 END), 0)::int AS total_focus_seconds,
           COALESCE(SUM(CASE WHEN f.type = 'break' THEN f.duration ELSE 0 END), 0)::int AS total_break_seconds,
           COUNT(CASE WHEN f.type = 'focus' THEN 1 END)::int AS focus_count,
           COUNT(CASE WHEN f.type = 'break' THEN 1 END)::int AS break_count,
           MAX(f.completed_at) AS last_session
    FROM users u
    LEFT JOIN focus_sessions f ON f.user_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id, u.name, u.email
    ORDER BY total_focus_seconds DESC
  `);
  res.json(rows);
}));

// ========== PROFILE ==========
app.get('/api/profile', authenticate, asyncH(async (req: any, res) => {
  const user = await qOne('SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = $1', [req.user.id]);
  res.json(user);
}));

app.put('/api/profile', authenticate, asyncH(async (req: any, res) => {
  const { name, bio, profile_pic } = req.body || {};
  if (!isString(name, 100)) return res.status(400).json({ error: 'Name required' });
  if (bio && bio.length > 1000) return res.status(400).json({ error: 'Bio too long' });
  if (profile_pic && profile_pic.length > 2_000_000) return res.status(400).json({ error: 'Profile picture too large' });
  await q('UPDATE users SET name = $1, bio = $2, profile_pic = $3 WHERE id = $4', [
    escapeHtml(name.trim()),
    bio ? escapeHtml(String(bio).trim()) : null,
    profile_pic || null,
    req.user.id,
  ]);
  res.json({ success: true });
}));

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

if (!IS_PROD) {
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(
    express.static(distPath, {
      // Vite includes a content hash in /assets/* filenames, so they're safe to
      // cache forever. index.html and the rest revalidate every request.
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} (production)`));
}
