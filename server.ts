import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'admin123';

const db = new Database(path.join(process.cwd(), 'database.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== MIGRATION: INTEGER → UUID ==========
// Detect old schema with INTEGER ids and migrate to TEXT/UUID, preserving data.
const migrateToUuids = () => {
  const usersInfo: any[] = db.prepare("PRAGMA table_info(users)").all();
  const idCol = usersInfo.find(c => c.name === 'id');
  if (!idCol || idCol.type.toUpperCase() !== 'INTEGER') return; // already migrated or fresh

  console.log('[migration] Detected INTEGER-id schema. Migrating to UUIDs...');

  db.pragma('foreign_keys = OFF');
  const txn = db.transaction(() => {
    // Build id mappings
    const userMap = new Map<number, string>();
    const courseMap = new Map<number, string>();
    const lessonMap = new Map<number, string>();
    const commentMap = new Map<number, string>();

    const users = db.prepare('SELECT * FROM users').all() as any[];
    for (const u of users) userMap.set(u.id, randomUUID());

    const courses = db.prepare('SELECT * FROM courses').all() as any[];
    for (const c of courses) courseMap.set(c.id, randomUUID());

    const lessons = db.prepare('SELECT * FROM lessons').all() as any[];
    for (const l of lessons) lessonMap.set(l.id, randomUUID());

    const comments = db.prepare('SELECT * FROM comments').all() as any[];
    for (const c of comments) commentMap.set(c.id, randomUUID());

    const progress = db.prepare('SELECT * FROM progress').all() as any[];
    const focus = db.prepare('SELECT * FROM focus_sessions').all() as any[];

    // Drop old tables (keep otps, otp_requests, course_enrollments as-is)
    db.exec(`
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS courses;
      DROP TABLE IF EXISTS lessons;
      DROP TABLE IF EXISTS progress;
      DROP TABLE IF EXISTS comments;
      DROP TABLE IF EXISTS focus_sessions;
      DROP TABLE IF EXISTS course_enrollments;
    `);

    // Recreate with UUID schema
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        bio TEXT,
        profile_pic TEXT
      );
      CREATE TABLE courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        language TEXT,
        level TEXT,
        thumbnail TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE lessons (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        video_url TEXT,
        resource_url TEXT,
        resource_type TEXT,
        order_index INTEGER DEFAULT 0
      );
      CREATE TABLE progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      );
      CREATE TABLE comments (
        id TEXT PRIMARY KEY,
        lesson_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        parent_id TEXT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE focus_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        duration INTEGER NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE course_enrollments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id)
      );
    `);

    // Reinsert with UUID mapping
    const insUser = db.prepare('INSERT INTO users (id, name, email, password, role, bio, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const u of users) {
      insUser.run(userMap.get(u.id), u.name, u.email, u.password, u.role, u.bio, u.profile_pic);
    }

    const insCourse = db.prepare('INSERT INTO courses (id, title, description, language, level, thumbnail, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const c of courses) {
      insCourse.run(courseMap.get(c.id), c.title, c.description, c.language, c.level, c.thumbnail, userMap.get(c.created_by) || null);
    }

    const insLesson = db.prepare('INSERT INTO lessons (id, course_id, title, content, video_url, resource_url, resource_type, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const l of lessons) {
      const newCourseId = courseMap.get(l.course_id);
      if (!newCourseId) continue;
      insLesson.run(lessonMap.get(l.id), newCourseId, l.title, l.content, l.video_url, l.resource_url, l.resource_type, l.order_index);
    }

    const insProgress = db.prepare('INSERT OR IGNORE INTO progress (id, user_id, lesson_id, completed_at) VALUES (?, ?, ?, ?)');
    for (const p of progress) {
      const u = userMap.get(p.user_id), l = lessonMap.get(p.lesson_id);
      if (!u || !l) continue;
      insProgress.run(randomUUID(), u, l, p.completed_at);
    }

    const insComment = db.prepare('INSERT INTO comments (id, lesson_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    for (const c of comments) {
      const newLesson = lessonMap.get(c.lesson_id);
      const newUser = userMap.get(c.user_id);
      if (!newLesson || !newUser) continue;
      insComment.run(commentMap.get(c.id), newLesson, newUser, c.parent_id ? commentMap.get(c.parent_id) || null : null, c.content, c.created_at);
    }

    const insFocus = db.prepare('INSERT INTO focus_sessions (id, user_id, type, duration, completed_at) VALUES (?, ?, ?, ?, ?)');
    for (const f of focus) {
      const u = userMap.get(f.user_id);
      if (!u) continue;
      insFocus.run(randomUUID(), u, f.type, f.duration, f.completed_at);
    }

    console.log(`[migration] Done. Migrated ${users.length} users, ${courses.length} courses, ${lessons.length} lessons, ${comments.length} comments.`);
  });
  txn();
  db.pragma('foreign_keys = ON');
};
migrateToUuids();

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    bio TEXT,
    profile_pic TEXT
  );
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT,
    level TEXT,
    thumbnail TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT,
    resource_url TEXT,
    resource_type TEXT,
    order_index INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    parent_id TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS otps (
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (email, otp)
  );
  CREATE TABLE IF NOT EXISTS otp_requests (
    email TEXT NOT NULL,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS course_enrollments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
  );

  CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
  CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
  CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON progress(user_id, lesson_id);
  CREATE INDEX IF NOT EXISTS idx_comments_lesson ON comments(lesson_id);
  CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
  CREATE INDEX IF NOT EXISTS idx_focus_user ON focus_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_enroll_user ON course_enrollments(user_id);
  CREATE INDEX IF NOT EXISTS idx_enroll_course ON course_enrollments(course_id);
  CREATE INDEX IF NOT EXISTS idx_otp_requests_email ON otp_requests(email, requested_at);
`);

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

const seedAdmins = () => {
  const admins = [
    { name: 'HOD User', email: process.env.HOD_EMAIL || 'hod@example.com', role: 'hod' },
    { name: 'Staff One', email: process.env.STAFF1_EMAIL || 'staff1@example.com', role: 'staff' },
    { name: 'Staff Two', email: process.env.STAFF2_EMAIL || 'staff2@example.com', role: 'staff' },
    { name: 'Student User', email: 'student@coursecode.com', role: 'student' },
  ];

  for (const admin of admins) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(admin.email);
    if (!existing) {
      const hashedPassword = bcrypt.hashSync(SEED_PASSWORD, 10);
      db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
        .run(randomUUID(), admin.name, admin.email, hashedPassword, admin.role);
      console.log(`Seeded admin: ${admin.email}`);
    }
  }
};
seedAdmins();

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadsDir));

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

// Validation helpers
const isString = (v: any, max = 1000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const sanitize = (v: string) => v.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const parsePagination = (req: any) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  return { limit, offset };
};

// ========== UPLOAD / DOWNLOAD ==========
app.post('/api/upload', authenticate, requireStaff, (req: any, res) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 200MB)' });
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file selected' });
    res.json({ success: true, url: `/uploads/${req.file.filename}`, filename: req.file.originalname });
  });
});

app.get('/api/download', (req, res) => {
  const fileUrl = req.query.url as string;
  const name = req.query.name as string;
  if (!fileUrl) return res.status(400).json({ error: 'Missing url' });
  const filename = path.basename(fileUrl.replace('/uploads/', ''));
  const filePath = path.join(uploadsDir, filename);
  if (!filePath.startsWith(uploadsDir) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  const downloadName = name || filename.replace(/^\d+-/, '');
  res.download(filePath, downloadName);
});

// ========== AUTH ==========
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!isString(email, 200) || !isString(password, 200)) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user: payload });
});

app.post('/api/auth/register-request', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!isString(name, 100) || !isString(email, 200) || !isString(password, 200)) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }
  if (password.length < 4) return res.status(400).json({ error: 'Password too short (min 4)' });

  // Rate limit: max 3 requests per email per 10 minutes
  db.prepare("DELETE FROM otp_requests WHERE requested_at < datetime('now', '-10 minutes')").run();
  const recent = (db.prepare("SELECT COUNT(*) as c FROM otp_requests WHERE email = ? AND requested_at >= datetime('now', '-10 minutes')").get(email) as any).c;
  if (recent >= 3) return res.status(429).json({ error: 'Too many OTP requests. Try again in 10 minutes.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

  db.prepare('DELETE FROM otps WHERE email = ?').run(email);
  db.prepare('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)').run(email, otp, expiresAt);
  db.prepare('INSERT INTO otp_requests (email) VALUES (?)').run(email);

  console.log(`\n========================================`);
  console.log(`  OTP for ${email}: ${otp}`);
  console.log(`========================================\n`);
  res.json({ success: true, message: 'OTP sent! Check the server console.' });
});

app.post('/api/auth/verify-register', (req, res) => {
  const { name, email, password, otp, role } = req.body || {};
  if (!isString(name, 100) || !isString(email, 200) || !isString(password, 200) || !isString(otp, 10)) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const record: any = db.prepare('SELECT * FROM otps WHERE email = ? AND otp = ?').get(email, otp);
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }
  const finalRole = role === 'staff' ? 'staff' : 'student';
  db.prepare('DELETE FROM otps WHERE email = ?').run(email);
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = randomUUID();
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, email, hashedPassword, finalRole);
    const user = { id, name, email, role: finalRole };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user });
  } catch (error: any) {
    res.status(400).json({ error: 'Registration failed. Email may already exist.' });
  }
});

app.put('/api/auth/change-password', authenticate, (req: any, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isString(currentPassword, 200) || !isString(newPassword, 200)) {
    return res.status(400).json({ error: 'Both passwords required' });
  }
  if (newPassword.length < 4) return res.status(400).json({ error: 'New password too short' });
  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ success: true });
});

// Email change with OTP verification
app.post('/api/auth/change-email-request', authenticate, (req: any, res) => {
  const { newEmail } = req.body || {};
  if (!isString(newEmail, 200) || !newEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(newEmail);
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  db.prepare("DELETE FROM otp_requests WHERE requested_at < datetime('now', '-10 minutes')").run();
  const recent = (db.prepare("SELECT COUNT(*) as c FROM otp_requests WHERE email = ? AND requested_at >= datetime('now', '-10 minutes')").get(newEmail) as any).c;
  if (recent >= 3) return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
  db.prepare('DELETE FROM otps WHERE email = ?').run(newEmail);
  db.prepare('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)').run(newEmail, otp, expiresAt);
  db.prepare('INSERT INTO otp_requests (email) VALUES (?)').run(newEmail);

  console.log(`\n========================================`);
  console.log(`  Email change OTP for ${newEmail}: ${otp}`);
  console.log(`========================================\n`);
  res.json({ success: true });
});

app.put('/api/auth/change-email', authenticate, (req: any, res) => {
  const { newEmail, otp } = req.body || {};
  if (!isString(newEmail, 200) || !isString(otp, 10)) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }
  const record: any = db.prepare('SELECT * FROM otps WHERE email = ? AND otp = ?').get(newEmail, otp);
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(newEmail);
  if (existing) return res.status(400).json({ error: 'Email already in use' });
  db.prepare('DELETE FROM otps WHERE email = ?').run(newEmail);
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, req.user.id);
  const user: any = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user });
});

// ========== COURSES ==========
app.get('/api/courses', authenticate, (req: any, res) => {
  const { limit, offset } = parsePagination(req);
  const filter = req.query.filter as string;

  if (req.user.role === 'student') {
    if (filter === 'browse') {
      // courses NOT enrolled
      const courses = db.prepare(`
        SELECT c.*, u.name as created_by_name
        FROM courses c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id NOT IN (SELECT course_id FROM course_enrollments WHERE user_id = ?)
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `).all(req.user.id, limit, offset);
      return res.json(courses);
    }
    // default: enrolled courses
    const courses = db.prepare(`
      SELECT c.*, u.name as created_by_name, 1 as enrolled
      FROM courses c
      INNER JOIN course_enrollments e ON e.course_id = c.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);
    return res.json(courses);
  }

  // staff/hod see all courses
  const courses = db.prepare(`
    SELECT c.*, u.name as created_by_name
    FROM courses c
    LEFT JOIN users u ON c.created_by = u.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json(courses);
});

app.get('/api/courses/:id', authenticate, (req: any, res) => {
  const course: any = db.prepare(`
    SELECT c.*, u.name as created_by_name
    FROM courses c LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Students must be enrolled
  if (req.user.role === 'student') {
    const enrolled = db.prepare('SELECT id FROM course_enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, req.params.id);
    if (!enrolled) return res.status(403).json({ error: 'You are not enrolled in this course' });
  }

  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index').all(req.params.id);
  res.json({ ...course, lessons });
});

app.post('/api/courses', authenticate, requireStaff, (req: any, res) => {
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
  db.prepare('INSERT INTO courses (id, title, description, language, level, thumbnail, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, escapeHtml(title.trim()), description ? escapeHtml(description.trim()) : '', language.trim(), level, thumbnail || null, req.user.id);
  res.json({ success: true, id });
});

app.put('/api/courses/:id', authenticate, requireStaff, (req: any, res) => {
  const course: any = db.prepare('SELECT created_by FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (req.user.role !== 'hod' && course.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own courses' });
  }
  const { title, description, language, level, thumbnail } = req.body || {};
  if (!isString(title, 200)) return res.status(400).json({ error: 'Title required' });
  if (!isString(language, 50)) return res.status(400).json({ error: 'Language required' });
  if (!['beginner', 'intermediate', 'advanced'].includes(level)) return res.status(400).json({ error: 'Invalid level' });
  db.prepare('UPDATE courses SET title = ?, description = ?, language = ?, level = ?, thumbnail = ? WHERE id = ?')
    .run(escapeHtml(title.trim()), description ? escapeHtml(String(description).trim()) : '', language.trim(), level, thumbnail || null, req.params.id);
  res.json({ success: true });
});

app.delete('/api/courses/:id', authenticate, requireStaff, (req: any, res) => {
  const course: any = db.prepare('SELECT created_by FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (req.user.role !== 'hod' && course.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own courses' });
  }
  const txn = db.transaction(() => {
    const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(req.params.id);
    for (const l of lessons as any[]) {
      db.prepare('DELETE FROM comments WHERE lesson_id = ? OR parent_id IN (SELECT id FROM comments WHERE lesson_id = ?)').run(l.id, l.id);
      db.prepare('DELETE FROM progress WHERE lesson_id = ?').run(l.id);
    }
    db.prepare('DELETE FROM lessons WHERE course_id = ?').run(req.params.id);
    db.prepare('DELETE FROM course_enrollments WHERE course_id = ?').run(req.params.id);
    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  });
  txn();
  res.json({ success: true });
});

// ========== ENROLLMENT ==========
app.post('/api/courses/:id/enroll', authenticate, (req: any, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can enroll' });
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  try {
    db.prepare('INSERT INTO course_enrollments (id, user_id, course_id) VALUES (?, ?, ?)')
      .run(randomUUID(), req.user.id, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Already enrolled' });
  }
});

app.delete('/api/courses/:id/enroll', authenticate, (req: any, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can unenroll' });
  db.prepare('DELETE FROM course_enrollments WHERE user_id = ? AND course_id = ?').run(req.user.id, req.params.id);
  res.json({ success: true });
});

// Contact instructor → posted as a special doubt on the first lesson of the course
app.post('/api/courses/:id/contact', authenticate, (req: any, res) => {
  const { message } = req.body || {};
  if (!isString(message, 2000)) return res.status(400).json({ error: 'Message required' });
  const course: any = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const firstLesson: any = db.prepare('SELECT id FROM lessons WHERE course_id = ? ORDER BY order_index LIMIT 1').get(req.params.id);
  if (!firstLesson) return res.status(400).json({ error: 'No lessons available to attach message to' });
  const id = randomUUID();
  db.prepare('INSERT INTO comments (id, lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, firstLesson.id, req.user.id, null, `[Contact Instructor]\n${escapeHtml(message.trim())}`);
  res.json({ success: true });
});

// ========== LESSONS ==========
app.post('/api/lessons', authenticate, requireStaff, (req: any, res) => {
  const { course_id, title, content, video_url, resource_url, resource_type, order_index } = req.body || {};
  if (!isString(course_id, 100)) return res.status(400).json({ error: 'course_id required' });
  if (!isString(title, 200)) return res.status(400).json({ error: 'Title required' });
  if (content && content.length > 50000) return res.status(400).json({ error: 'Content too long' });

  const course: any = db.prepare('SELECT created_by FROM courses WHERE id = ?').get(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (req.user.role !== 'hod' && course.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only add lessons to your own courses' });
  }

  const id = randomUUID();
  db.prepare('INSERT INTO lessons (id, course_id, title, content, video_url, resource_url, resource_type, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, course_id, escapeHtml(title.trim()), content ? sanitize(content) : '', video_url || null, resource_url || null, resource_type || null, parseInt(order_index) || 0);
  res.json({ success: true, id });
});

app.put('/api/lessons/:id', authenticate, requireStaff, (req: any, res) => {
  const lesson: any = db.prepare(`
    SELECT l.id, c.created_by
    FROM lessons l JOIN courses c ON l.course_id = c.id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (req.user.role !== 'hod' && lesson.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit lessons in your own courses' });
  }
  const { title, content, video_url, resource_url, resource_type, order_index } = req.body || {};
  if (!isString(title, 200)) return res.status(400).json({ error: 'Title required' });
  if (content && content.length > 50000) return res.status(400).json({ error: 'Content too long' });
  db.prepare('UPDATE lessons SET title = ?, content = ?, video_url = ?, resource_url = ?, resource_type = ?, order_index = ? WHERE id = ?')
    .run(escapeHtml(title.trim()), content ? sanitize(content) : '', video_url || null, resource_url || null, resource_type || null, parseInt(order_index) || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/lessons/:id', authenticate, requireStaff, (req: any, res) => {
  const lesson: any = db.prepare(`
    SELECT l.id, c.created_by
    FROM lessons l JOIN courses c ON l.course_id = c.id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (req.user.role !== 'hod' && lesson.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete lessons in your own courses' });
  }
  const txn = db.transaction(() => {
    db.prepare('DELETE FROM comments WHERE lesson_id = ? OR parent_id IN (SELECT id FROM comments WHERE lesson_id = ?)').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM progress WHERE lesson_id = ?').run(req.params.id);
    db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
  });
  txn();
  res.json({ success: true });
});

// ========== ANALYTICS ==========
app.get('/api/analytics/summary', authenticate, requireStaff, (_req: any, res) => {
  const totalStudents = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('student') as any).c;
  const totalStaff = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('staff') as any).c;
  const totalCourses = (db.prepare('SELECT COUNT(*) as c FROM courses').get() as any).c;
  const totalLessons = (db.prepare('SELECT COUNT(*) as c FROM lessons').get() as any).c;
  const totalCompleted = (db.prepare('SELECT COUNT(*) as c FROM progress').get() as any).c;
  const totalEnrollments = (db.prepare('SELECT COUNT(*) as c FROM course_enrollments').get() as any).c;
  const avgProgress = totalLessons > 0 && totalStudents > 0
    ? Math.round((totalCompleted / (totalStudents * totalLessons)) * 100)
    : 0;
  res.json({ totalStudents, totalStaff, totalCourses, totalLessons, totalCompleted, totalEnrollments, avgProgress });
});

app.post('/api/progress', authenticate, (req: any, res) => {
  const { lesson_id } = req.body || {};
  if (!isString(lesson_id, 100)) return res.status(400).json({ error: 'lesson_id required' });
  // Verify student is enrolled in the course this lesson belongs to
  if (req.user.role === 'student') {
    const enrolled = db.prepare(`
      SELECT 1 FROM lessons l
      INNER JOIN course_enrollments e ON e.course_id = l.course_id
      WHERE l.id = ? AND e.user_id = ?
    `).get(lesson_id, req.user.id);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this course' });
  }
  const existing = db.prepare('SELECT id FROM progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson_id);
  if (!existing) {
    db.prepare('INSERT INTO progress (id, user_id, lesson_id) VALUES (?, ?, ?)').run(randomUUID(), req.user.id, lesson_id);
  }
  res.json({ success: true });
});

app.get('/api/progress', authenticate, (req: any, res) => {
  const progress = db.prepare('SELECT * FROM progress WHERE user_id = ?').all(req.user.id);
  res.json(progress);
});

app.get('/api/analytics/students', authenticate, requireStaff, (_req: any, res) => {
  const students: any[] = db.prepare('SELECT id, name, email FROM users WHERE role = ?').all('student');
  const result = students.map((u) => {
    const lessons_completed = (db.prepare('SELECT COUNT(*) as c FROM progress WHERE user_id = ?').get(u.id) as any).c;
    const enrollments = (db.prepare('SELECT COUNT(*) as c FROM course_enrollments WHERE user_id = ?').get(u.id) as any).c;
    return { id: u.id, name: u.name, email: u.email, lessons_completed, enrollments };
  });
  res.json(result);
});

app.get('/api/analytics/staff', authenticate, (req: any, res) => {
  if (req.user.role !== 'hod') return res.status(403).json({ error: 'Forbidden' });
  const staff: any[] = db.prepare('SELECT id, name, email FROM users WHERE role = ?').all('staff');
  const result = staff.map((u) => {
    const courses_created = (db.prepare('SELECT COUNT(*) as c FROM courses WHERE created_by = ?').get(u.id) as any).c;
    return { id: u.id, name: u.name, email: u.email, courses_created };
  });
  res.json(result);
});

// ========== COMMENTS / DOUBTS ==========
app.get('/api/lessons/:id/comments', authenticate, (req: any, res) => {
  // Students must be enrolled
  if (req.user.role === 'student') {
    const enrolled = db.prepare(`
      SELECT 1 FROM lessons l INNER JOIN course_enrollments e ON e.course_id = l.course_id
      WHERE l.id = ? AND e.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled' });
  }
  const comments: any[] = db.prepare(`
    SELECT c.*, u.name as user_name, u.role as user_role, u.profile_pic
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.lesson_id = ? ORDER BY c.created_at
  `).all(req.params.id);
  res.json(comments);
});

app.post('/api/lessons/:id/comments', authenticate, (req: any, res) => {
  const { content, parent_id } = req.body || {};
  if (!isString(content, 5000)) return res.status(400).json({ error: 'Content required (max 5000 chars)' });
  // Students must be enrolled
  if (req.user.role === 'student') {
    const enrolled = db.prepare(`
      SELECT 1 FROM lessons l INNER JOIN course_enrollments e ON e.course_id = l.course_id
      WHERE l.id = ? AND e.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled' });
  }
  if (parent_id) {
    const parent = db.prepare('SELECT id FROM comments WHERE id = ?').get(parent_id);
    if (!parent) return res.status(400).json({ error: 'Parent comment not found' });
  }
  const id = randomUUID();
  const cleanContent = escapeHtml(content.trim());
  db.prepare('INSERT INTO comments (id, lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, parent_id || null, cleanContent);
  const user: any = db.prepare('SELECT name, role, profile_pic FROM users WHERE id = ?').get(req.user.id);
  res.json({
    id, lesson_id: req.params.id, user_id: req.user.id, parent_id: parent_id || null,
    content: cleanContent, created_at: new Date().toISOString(),
    user_name: user.name, user_role: user.role, profile_pic: user.profile_pic
  });
});

// Dedicated reply endpoint (looks up parent's lesson_id automatically)
app.post('/api/comments/:id/reply', authenticate, (req: any, res) => {
  const { content } = req.body || {};
  if (!isString(content, 5000)) return res.status(400).json({ error: 'Content required' });
  const parent: any = db.prepare('SELECT id, lesson_id FROM comments WHERE id = ?').get(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
  const id = randomUUID();
  const cleanContent = escapeHtml(content.trim());
  db.prepare('INSERT INTO comments (id, lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, parent.lesson_id, req.user.id, parent.id, cleanContent);
  res.json({ success: true, id });
});

app.get('/api/comments/all', authenticate, requireStaff, (req: any, res) => {
  const { limit, offset } = parsePagination(req);
  const comments: any[] = db.prepare(`
    SELECT c.*, u.name as user_name, u.role as user_role, u.profile_pic,
           l.title as lesson_title, l.course_id, co.title as course_title
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN lessons l ON c.lesson_id = l.id
    LEFT JOIN courses co ON l.course_id = co.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  // Staff (non-HOD) only see comments on their own courses
  const filtered = req.user.role === 'hod'
    ? comments
    : comments.filter((c: any) => {
        const courseRow: any = db.prepare('SELECT created_by FROM courses WHERE id = ?').get(c.course_id);
        return courseRow && courseRow.created_by === req.user.id;
      });
  res.json(filtered);
});

app.delete('/api/comments/:id', authenticate, (req: any, res) => {
  const comment: any = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.user_id !== req.user.id && req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const txn = db.transaction(() => {
    db.prepare('DELETE FROM comments WHERE parent_id = ?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  });
  txn();
  res.json({ success: true });
});

// ========== FOCUS SESSIONS ==========
app.post('/api/focus-sessions', authenticate, (req: any, res) => {
  const { type, duration } = req.body || {};
  if (!['focus', 'break'].includes(type) || !duration || typeof duration !== 'number' || duration <= 0 || duration > 86400) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  db.prepare('INSERT INTO focus_sessions (id, user_id, type, duration) VALUES (?, ?, ?, ?)').run(randomUUID(), req.user.id, type, duration);
  res.json({ success: true });
});

app.get('/api/focus-sessions/me', authenticate, (req: any, res) => {
  const sessions: any[] = db.prepare('SELECT type, SUM(duration) as total_seconds, COUNT(*) as count FROM focus_sessions WHERE user_id = ? GROUP BY type').all(req.user.id);
  res.json(sessions);
});

app.get('/api/analytics/focus', authenticate, requireStaff, (_req: any, res) => {
  const students: any[] = db.prepare('SELECT id, name, email FROM users WHERE role = ?').all('student');
  const result = students.map((u) => {
    const focusSessions: any[] = db.prepare('SELECT type, duration, completed_at FROM focus_sessions WHERE user_id = ?').all(u.id);
    const total_focus_seconds = focusSessions.filter(s => s.type === 'focus').reduce((a, s) => a + s.duration, 0);
    const total_break_seconds = focusSessions.filter(s => s.type === 'break').reduce((a, s) => a + s.duration, 0);
    const focus_count = focusSessions.filter(s => s.type === 'focus').length;
    const break_count = focusSessions.filter(s => s.type === 'break').length;
    const last_session = focusSessions.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]?.completed_at;
    return { id: u.id, name: u.name, email: u.email, total_focus_seconds, total_break_seconds, focus_count, break_count, last_session };
  });
  res.json(result.sort((a, b) => b.total_focus_seconds - a.total_focus_seconds));
});

// ========== PROFILE ==========
app.get('/api/profile', authenticate, (req: any, res) => {
  const user: any = db.prepare('SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.put('/api/profile', authenticate, (req: any, res) => {
  const { name, bio, profile_pic } = req.body || {};
  if (!isString(name, 100)) return res.status(400).json({ error: 'Name required' });
  if (bio && bio.length > 1000) return res.status(400).json({ error: 'Bio too long' });
  if (profile_pic && profile_pic.length > 2_000_000) return res.status(400).json({ error: 'Profile picture too large' });
  db.prepare('UPDATE users SET name = ?, bio = ?, profile_pic = ? WHERE id = ?').run(
    escapeHtml(name.trim()),
    bio ? escapeHtml(String(bio).trim()) : null,
    profile_pic || null,
    req.user.id
  );
  res.json({ success: true });
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.listen(3000, '0.0.0.0', () => console.log('Server running on http://localhost:3000'));
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.listen(3000, '0.0.0.0', () => console.log('Server running on http://localhost:3000'));
}
