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

const db = new Database(path.join(process.cwd(), 'database.db'));
db.pragma('journal_mode = WAL');

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
  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
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
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
        .run(randomUUID(), admin.name, admin.email, hashedPassword, admin.role);
      console.log(`Seeded admin: ${admin.email}`);
    }
  }
};
seedAdmins();

const app = express();
app.use(express.json());
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

app.post('/api/upload', (req: any, res) => {
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
  const filename = fileUrl.replace('/uploads/', '');
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const downloadName = name || filename.replace(/^\d+-/, '');
  res.download(filePath, downloadName);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user: payload });
});

app.post('/api/auth/register-request', (req, res) => {
  const { name, email, password } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

  db.prepare('DELETE FROM otps WHERE email = ?').run(email);
  db.prepare('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)').run(email, otp, expiresAt);

  console.log(`\n========================================`);
  console.log(`  OTP for ${email}: ${otp}`);
  console.log(`========================================\n`);
  res.json({ success: true, message: 'OTP sent! Check the server console.' });
});

app.post('/api/auth/verify-register', (req, res) => {
  const { name, email, password, otp, role } = req.body;
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
  const { currentPassword, newPassword } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ success: true });
});

app.get('/api/courses', authenticate, (_req, res) => {
  const courses = db.prepare('SELECT * FROM courses').all();
  res.json(courses);
});

app.get('/api/courses/:id', authenticate, (req, res) => {
  const course: any = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index').all(req.params.id);
  res.json({ ...course, lessons });
});

app.post('/api/courses', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { title, description, language, level, thumbnail } = req.body;
  const id = randomUUID();
  db.prepare('INSERT INTO courses (id, title, description, language, level, thumbnail, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, title, description, language, level, thumbnail, req.user.id);
  res.json({ success: true, id });
});

app.put('/api/courses/:id', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { title, description, language, level, thumbnail } = req.body;
  db.prepare('UPDATE courses SET title = ?, description = ?, language = ?, level = ?, thumbnail = ? WHERE id = ?')
    .run(title, description, language, level, thumbnail, req.params.id);
  res.json({ success: true });
});

app.delete('/api/courses/:id', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(req.params.id);
  for (const l of lessons) {
    db.prepare('DELETE FROM comments WHERE lesson_id = ?').run(l.id);
    db.prepare('DELETE FROM comments WHERE parent_id = ?').run(l.id);
    db.prepare('DELETE FROM progress WHERE lesson_id = ?').run(l.id);
  }
  db.prepare('DELETE FROM lessons WHERE course_id = ?').run(req.params.id);
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/lessons', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { course_id, title, content, video_url, resource_url, resource_type, order_index } = req.body;
  const id = randomUUID();
  db.prepare('INSERT INTO lessons (id, course_id, title, content, video_url, resource_url, resource_type, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, course_id, title, content, video_url, resource_url, resource_type, order_index);
  res.json({ success: true, id });
});

app.put('/api/lessons/:id', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { title, content, video_url, resource_url, resource_type, order_index } = req.body;
  db.prepare('UPDATE lessons SET title = ?, content = ?, video_url = ?, resource_url = ?, resource_type = ?, order_index = ? WHERE id = ?')
    .run(title, content, video_url, resource_url, resource_type, order_index, req.params.id);
  res.json({ success: true });
});

app.delete('/api/lessons/:id', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM comments WHERE lesson_id = ?').run(req.params.id);
  db.prepare('DELETE FROM comments WHERE parent_id = ?').run(req.params.id);
  db.prepare('DELETE FROM progress WHERE lesson_id = ?').run(req.params.id);
  db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/analytics/summary', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const totalStudents = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('student') as any).c;
  const totalStaff = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('staff') as any).c;
  const totalCourses = (db.prepare('SELECT COUNT(*) as c FROM courses').get() as any).c;
  const totalLessons = (db.prepare('SELECT COUNT(*) as c FROM lessons').get() as any).c;
  const totalCompleted = (db.prepare('SELECT COUNT(*) as c FROM progress').get() as any).c;
  const avgProgress = totalLessons > 0 ? Math.round((totalCompleted / (totalStudents * totalLessons || 1)) * 100) : 0;
  res.json({ totalStudents, totalStaff, totalCourses, totalLessons, totalCompleted, avgProgress });
});

app.post('/api/progress', authenticate, (req: any, res) => {
  const { lesson_id } = req.body;
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

app.get('/api/analytics/students', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const students: any[] = db.prepare('SELECT * FROM users WHERE role = ?').all('student');
  const result = students.map((u) => {
    const lessons_completed = (db.prepare('SELECT COUNT(*) as c FROM progress WHERE user_id = ?').get(u.id) as any).c;
    return { id: u.id, name: u.name, email: u.email, lessons_completed };
  });
  res.json(result);
});

app.get('/api/analytics/staff', authenticate, (req: any, res) => {
  if (req.user.role !== 'hod') return res.status(403).json({ error: 'Forbidden' });
  const staff: any[] = db.prepare('SELECT * FROM users WHERE role = ?').all('staff');
  const result = staff.map((u) => {
    const courses_created = (db.prepare('SELECT COUNT(*) as c FROM courses WHERE created_by = ?').get(u.id) as any).c;
    return { id: u.id, name: u.name, email: u.email, courses_created };
  });
  res.json(result);
});

app.get('/api/lessons/:id/comments', authenticate, (req, res) => {
  const comments: any[] = db.prepare(`
    SELECT c.*, u.name as user_name, u.role as user_role, u.profile_pic
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.lesson_id = ? ORDER BY c.created_at
  `).all(req.params.id);
  res.json(comments.map((c) => ({ id: c.id, lesson_id: c.lesson_id, user_id: c.user_id, parent_id: c.parent_id, content: c.content, created_at: c.created_at, user_name: c.user_name, user_role: c.user_role, profile_pic: c.profile_pic })));
});

app.post('/api/lessons/:id/comments', authenticate, (req: any, res) => {
  const { content, parent_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const id = randomUUID();
  db.prepare('INSERT INTO comments (id, lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, parent_id || null, content.trim());
  const user: any = db.prepare('SELECT name, role, profile_pic FROM users WHERE id = ?').get(req.user.id);
  res.json({ id, lesson_id: req.params.id, user_id: req.user.id, parent_id: parent_id || null, content: content.trim(), created_at: new Date().toISOString(), user_name: user.name, user_role: user.role, profile_pic: user.profile_pic });
});

app.get('/api/comments/all', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const comments: any[] = db.prepare('SELECT * FROM comments ORDER BY created_at DESC').all();
  const result = comments.map((c) => {
    const user: any = db.prepare('SELECT name, role, profile_pic FROM users WHERE id = ?').get(c.user_id);
    const lesson: any = db.prepare('SELECT title, course_id FROM lessons WHERE id = ?').get(c.lesson_id);
    const course: any = lesson ? db.prepare('SELECT title FROM courses WHERE id = ?').get(lesson.course_id) : null;
    return { id: c.id, lesson_id: c.lesson_id, user_id: c.user_id, parent_id: c.parent_id, content: c.content, created_at: c.created_at, user_name: user?.name, user_role: user?.role, profile_pic: user?.profile_pic, lesson_title: lesson?.title, course_title: course?.title };
  });
  res.json(result);
});

app.delete('/api/comments/:id', authenticate, (req: any, res) => {
  const comment: any = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.user_id !== req.user.id && req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM comments WHERE parent_id = ?').run(req.params.id);
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/focus-sessions', authenticate, (req: any, res) => {
  const { type, duration } = req.body;
  if (!['focus', 'break'].includes(type) || !duration) return res.status(400).json({ error: 'Invalid data' });
  db.prepare('INSERT INTO focus_sessions (id, user_id, type, duration) VALUES (?, ?, ?, ?)').run(randomUUID(), req.user.id, type, duration);
  res.json({ success: true });
});

app.get('/api/focus-sessions/me', authenticate, (req: any, res) => {
  const sessions: any[] = db.prepare('SELECT type, SUM(duration) as total_seconds, COUNT(*) as count FROM focus_sessions WHERE user_id = ? GROUP BY type').all(req.user.id);
  res.json(sessions);
});

app.get('/api/analytics/focus', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const students: any[] = db.prepare('SELECT * FROM users WHERE role = ?').all('student');
  const result = students.map((u) => {
    const focusSessions: any[] = db.prepare('SELECT * FROM focus_sessions WHERE user_id = ?').all(u.id);
    const total_focus_seconds = focusSessions.filter(s => s.type === 'focus').reduce((a, s) => a + s.duration, 0);
    const total_break_seconds = focusSessions.filter(s => s.type === 'break').reduce((a, s) => a + s.duration, 0);
    const focus_count = focusSessions.filter(s => s.type === 'focus').length;
    const break_count = focusSessions.filter(s => s.type === 'break').length;
    const last_session = focusSessions.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]?.completed_at;
    return { id: u.id, name: u.name, email: u.email, total_focus_seconds, total_break_seconds, focus_count, break_count, last_session };
  });
  res.json(result.sort((a, b) => b.total_focus_seconds - a.total_focus_seconds));
});

app.get('/api/profile', authenticate, (req: any, res) => {
  const user: any = db.prepare('SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.put('/api/profile', authenticate, (req: any, res) => {
  const { name, bio, profile_pic } = req.body;
  db.prepare('UPDATE users SET name = ?, bio = ?, profile_pic = ? WHERE id = ?').run(name, bio, profile_pic, req.user.id);
  res.json({ success: true });
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
