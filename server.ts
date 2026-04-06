import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database('database.db');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'hod', 'staff', 'student'
    bio TEXT,
    profile_pic TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL,
    level TEXT NOT NULL, -- 'beginner', 'intermediate', 'advanced'
    thumbnail TEXT,
    created_by INTEGER,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT,
    resource_url TEXT,
    resource_type TEXT, -- 'pdf', 'excel', 'doc', 'image'
    order_index INTEGER,
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    lesson_id INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lesson_id) REFERENCES lessons(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(parent_id) REFERENCES comments(id)
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Admin Accounts
const seedAdmins = () => {
  const admins = [
    { name: 'HOD User', email: process.env.HOD_EMAIL || 'hod@example.com', role: 'hod' },
    { name: 'Staff One', email: process.env.STAFF1_EMAIL || 'staff1@example.com', role: 'staff' },
    { name: 'Staff Two', email: process.env.STAFF2_EMAIL || 'staff2@example.com', role: 'staff' },
    { name: 'Student User', email: 'student@coursecode.com', role: 'student' },
  ];

  const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');
  const insertUser = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');

  admins.forEach(admin => {
    if (!checkUser.get(admin.email)) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      insertUser.run(admin.name, admin.email, hashedPassword, admin.role);
      console.log(`Seeded admin: ${admin.email}`);
    }
  });
};
seedAdmins();

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));

  // --- File Upload ---
  app.post('/api/upload', upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.originalname });
  });

  // --- Auth Routes ---

  // --- Direct Login (email + password → token) ---
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: payload });
  });

  // --- Registration Step 1: Send OTP ---
  app.post('/api/auth/register-request', (req, res) => {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

    // Store OTP and pending user data
    db.prepare('DELETE FROM otps WHERE email = ?').run(email);
    db.prepare('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)').run(email, otp, expiresAt);

    // In a real app, send email. Here we log it for the demo.
    console.log(`\n========================================`);
    console.log(`  OTP for ${email}: ${otp}`);
    console.log(`========================================\n`);
    res.json({ success: true, message: 'OTP sent! Check the server console.' });
  });

  // --- Registration Step 2: Verify OTP & Create Account ---
  app.post('/api/auth/verify-register', (req, res) => {
    const { name, email, password, otp } = req.body;
    const record = db.prepare('SELECT * FROM otps WHERE email = ? AND otp = ?').get(email, otp) as any;

    if (!record || new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    db.prepare('DELETE FROM otps WHERE email = ?').run(email);

    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
        .run(name, email, hashedPassword, 'student');

      const user = { id: result.lastInsertRowid, name, email, role: 'student' };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, token, user });
    } catch (error: any) {
      res.status(400).json({ error: 'Registration failed. Email may already exist.' });
    }
  });

  // --- Middleware ---
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

  // --- Course Routes ---

  app.get('/api/courses', authenticate, (req, res) => {
    const courses = db.prepare('SELECT * FROM courses').all();
    res.json(courses);
  });

  app.get('/api/courses/:id', authenticate, (req, res) => {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC').all(req.params.id);
    res.json({ ...course as any, lessons });
  });

  app.post('/api/courses', authenticate, (req: any, res) => {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const { title, description, language, level, thumbnail } = req.body;
    const result = db.prepare('INSERT INTO courses (title, description, language, level, thumbnail, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(title, description, language, level, thumbnail, req.user.id);
    res.json({ success: true, id: result.lastInsertRowid });
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
    const lessonIds = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(req.params.id) as any[];
    for (const l of lessonIds) {
      db.prepare('DELETE FROM progress WHERE lesson_id = ?').run(l.id);
    }
    db.prepare('DELETE FROM lessons WHERE course_id = ?').run(req.params.id);
    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/lessons', authenticate, (req: any, res) => {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const { course_id, title, content, video_url, resource_url, resource_type, order_index } = req.body;
    const result = db.prepare('INSERT INTO lessons (course_id, title, content, video_url, resource_url, resource_type, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(course_id, title, content, video_url, resource_url, resource_type, order_index);
    res.json({ success: true, id: result.lastInsertRowid });
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
    db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Password Change ---
  app.put('/api/auth/change-password', authenticate, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    res.json({ success: true });
  });

  // --- Analytics Summary ---
  app.get('/api/analytics/summary', authenticate, (req: any, res) => {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const totalStudents = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get() as any).c;
    const totalStaff = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'staff'").get() as any).c;
    const totalCourses = (db.prepare("SELECT COUNT(*) as c FROM courses").get() as any).c;
    const totalLessons = (db.prepare("SELECT COUNT(*) as c FROM lessons").get() as any).c;
    const totalCompleted = (db.prepare("SELECT COUNT(*) as c FROM progress").get() as any).c;
    const avgProgress = totalLessons > 0 ? Math.round((totalCompleted / (totalStudents * totalLessons || 1)) * 100) : 0;
    res.json({ totalStudents, totalStaff, totalCourses, totalLessons, totalCompleted, avgProgress });
  });

  // --- Progress Routes ---

  app.post('/api/progress', authenticate, (req: any, res) => {
    const { lesson_id } = req.body;
    const existing = db.prepare('SELECT id FROM progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson_id);
    if (!existing) {
      db.prepare('INSERT INTO progress (user_id, lesson_id) VALUES (?, ?)').run(req.user.id, lesson_id);
    }
    res.json({ success: true });
  });

  app.get('/api/progress', authenticate, (req: any, res) => {
    const progress = db.prepare('SELECT lesson_id FROM progress WHERE user_id = ?').all(req.user.id);
    res.json(progress);
  });

  // --- Analytics (HOD/Staff) ---

  app.get('/api/analytics/students', authenticate, (req: any, res) => {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const students = db.prepare(`
      SELECT u.id, u.name, u.email, COUNT(p.id) as lessons_completed
      FROM users u
      LEFT JOIN progress p ON u.id = p.user_id
      WHERE u.role = 'student'
      GROUP BY u.id
    `).all();
    res.json(students);
  });

  app.get('/api/analytics/staff', authenticate, (req: any, res) => {
    if (req.user.role !== 'hod') return res.status(403).json({ error: 'Forbidden' });
    const staff = db.prepare(`
      SELECT u.id, u.name, u.email, COUNT(c.id) as courses_created
      FROM users u
      LEFT JOIN courses c ON u.id = c.created_by
      WHERE u.role = 'staff'
      GROUP BY u.id
    `).all();
    res.json(staff);
  });

  // --- Comments / Doubts ---

  app.get('/api/lessons/:id/comments', authenticate, (req, res) => {
    const comments = db.prepare(`
      SELECT c.id, c.lesson_id, c.user_id, c.parent_id, c.content, c.created_at,
        u.name as user_name, u.role as user_role, u.profile_pic
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.lesson_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post('/api/lessons/:id/comments', authenticate, (req: any, res) => {
    const { content, parent_id } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
    const result = db.prepare('INSERT INTO comments (lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)')
      .run(req.params.id, req.user.id, parent_id || null, content.trim());
    const comment = db.prepare(`
      SELECT c.id, c.lesson_id, c.user_id, c.parent_id, c.content, c.created_at,
        u.name as user_name, u.role as user_role, u.profile_pic
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `).get(result.lastInsertRowid);
    res.json(comment);
  });

  app.delete('/api/comments/:id', authenticate, (req: any, res) => {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id) as any;
    if (!comment) return res.status(404).json({ error: 'Not found' });
    if (comment.user_id !== req.user.id && req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM comments WHERE parent_id = ?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Focus Sessions ---

  app.post('/api/focus-sessions', authenticate, (req: any, res) => {
    const { type, duration } = req.body;
    if (!['focus', 'break'].includes(type) || !duration) return res.status(400).json({ error: 'Invalid data' });
    db.prepare('INSERT INTO focus_sessions (user_id, type, duration) VALUES (?, ?, ?)').run(req.user.id, type, duration);
    res.json({ success: true });
  });

  app.get('/api/focus-sessions/me', authenticate, (req: any, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sessions = db.prepare(
      "SELECT type, SUM(duration) as total_seconds, COUNT(*) as count FROM focus_sessions WHERE user_id = ? AND date(completed_at) = ? GROUP BY type"
    ).all(req.user.id, today);
    res.json(sessions);
  });

  app.get('/api/analytics/focus', authenticate, (req: any, res) => {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const data = db.prepare(`
      SELECT u.id, u.name, u.email,
        COALESCE(SUM(CASE WHEN fs.type = 'focus' THEN fs.duration ELSE 0 END), 0) as total_focus_seconds,
        COALESCE(SUM(CASE WHEN fs.type = 'break' THEN fs.duration ELSE 0 END), 0) as total_break_seconds,
        COALESCE(SUM(CASE WHEN fs.type = 'focus' THEN 1 ELSE 0 END), 0) as focus_count,
        COALESCE(SUM(CASE WHEN fs.type = 'break' THEN 1 ELSE 0 END), 0) as break_count,
        MAX(fs.completed_at) as last_session
      FROM users u
      LEFT JOIN focus_sessions fs ON u.id = fs.user_id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY total_focus_seconds DESC
    `).all();
    res.json(data);
  });

  // --- Profile ---

  app.get('/api/profile', authenticate, (req: any, res) => {
    const user = db.prepare('SELECT id, name, email, role, bio, profile_pic FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  });

  app.put('/api/profile', authenticate, (req: any, res) => {
    const { name, bio, profile_pic } = req.body;
    db.prepare('UPDATE users SET name = ?, bio = ?, profile_pic = ? WHERE id = ?')
      .run(name, bio, profile_pic, req.user.id);
    res.json({ success: true });
  });

  // --- Vite & Static ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
