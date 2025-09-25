const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { db, run, get, all, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const CORS_ORIGIN = process.env.CORS_ORIGIN || true;
const SPA_DIR = path.resolve(__dirname, '..');
const ALLOWED_ROLES = new Set(['user','editor','admin']);
const roleOrder = { user: 0, editor: 1, admin: 2 };

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Auth helpers
function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
}
function clearAuthCookie(res) {
  res.clearCookie('token');
}
function authMiddleware(req, res, next) {
  const { token } = req.cookies || {};
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
function requireAdmin() { return requireRole('admin'); }
function requireRole(minRole) {
  return async (req, res, next) => {
    const me = await get('select role from users where id = ?', [req.user.id]);
    if (!me) return res.status(401).json({ error: 'unauthorized' });
    if ((roleOrder[me.role] ?? -1) < roleOrder[minRole]) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

// Init DB
init().then(() => console.log('DB ready')).catch((e) => console.error(e));

// Auth routes
const RegisterSchema = z.object({
  name: z.coerce.string().optional(),
  email: z.coerce.string().min(1),
  password: z.coerce.string().min(1),
});
app.post('/api/auth/register', async (req, res) => {
  const parse = RegisterSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ error: 'invalid_input', details: parse.error.flatten() });
  const name = parse.data.name || '';
  const email = String(parse.data.email).trim();
  const password = String(parse.data.password);
  const existing = await get('select id from users where email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'email_taken' });
  const hash = await bcrypt.hash(password, 10);
  const result = await run('insert into users(name,email,password_hash) values(?,?,?)', [name || '', email, hash]);
  const id = result.lastID;
  setAuthCookie(res, { id, email });
  res.json({ id, name: name || '', email });
});

const LoginSchema = z.object({ email: z.coerce.string().min(1), password: z.coerce.string().min(1) });
app.post('/api/auth/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ error: 'invalid_input', details: parse.error.flatten() });
  const email = String(parse.data.email).trim();
  const password = String(parse.data.password);
  const user = await get('select id,name,email,password_hash from users where email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
  setAuthCookie(res, { id: user.id, email: user.email });
  res.json({ id: user.id, name: user.name, email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await get('select id,name,email,role,avatar_url,bio,description from users where id = ?', [req.user.id]);
  res.json(user);
});

// Profile
const ProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
  description: z.string().optional(),
});
app.put('/api/user', authMiddleware, async (req, res) => {
  const parse = ProfileSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const { name, email, password, avatar_url, bio, description } = parse.data;
  if (email) {
    const other = await get('select id from users where email = ? and id != ?', [email, req.user.id]);
    if (other) return res.status(409).json({ error: 'email_taken' });
  }
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await run('update users set name = coalesce(?, name), email = coalesce(?, email), avatar_url = coalesce(?, avatar_url), bio = coalesce(?, bio), description = coalesce(?, description), password_hash = ? where id = ?', [name || null, email || null, avatar_url || null, bio || null, description || null, hash, req.user.id]);
  } else {
    await run('update users set name = coalesce(?, name), email = coalesce(?, email), avatar_url = coalesce(?, avatar_url), bio = coalesce(?, bio), description = coalesce(?, description) where id = ?', [name || null, email || null, avatar_url || null, bio || null, description || null, req.user.id]);
  }
  const updated = await get('select id,name,email,avatar_url,bio,description,role from users where id = ?', [req.user.id]);
  if (email) setAuthCookie(res, { id: updated.id, email: updated.email });
  res.json(updated);
});

// Admin: change roles
// Admin user management
app.get('/api/admin/users', authMiddleware, requireAdmin(), async (req, res) => {
  const users = await all('select id,name,email,role,created_at from users order by created_at desc');
  res.json(users);
});
app.put('/api/admin/role/:userId', authMiddleware, requireAdmin(), async (req, res) => {
  const role = req.body?.role;
  if (!role || !ALLOWED_ROLES.has(role)) return res.status(400).json({ error: 'invalid_role' });
  await run('update users set role = ? where id = ?', [role, req.params.userId]);
  res.json({ ok: true });
});

// Posts CRUD (admin only for writes)
app.get('/api/posts', async (req, res) => {
  const rows = await all('select p.id, p.slug, p.title, p.content, p.published, p.created_at, p.updated_at, u.name as author_name from posts p join users u on u.id = p.author_id where p.published = 1 order by p.created_at desc');
  res.json(rows);
});
app.get('/api/posts/:slug', async (req, res) => {
  const row = await get('select p.id, p.slug, p.title, p.content, p.published, p.created_at, p.updated_at, u.name as author_name from posts p join users u on u.id = p.author_id where p.slug = ?', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});
// Editor+ can create and edit, only admin can delete
app.post('/api/posts', authMiddleware, requireRole('editor'), async (req, res) => {
  const { slug, title, content, published = true } = req.body || {};
  if (!slug || !title) return res.status(400).json({ error: 'missing_fields' });
  await run('insert into posts(slug,title,content,published,author_id) values(?,?,?,?,?)', [slug, title, content || '', published ? 1 : 0, req.user.id]);
  res.json({ ok: true });
});
app.put('/api/posts/:slug', authMiddleware, requireRole('editor'), async (req, res) => {
  const { title, content, published } = req.body || {};
  await run('update posts set title = coalesce(?, title), content = coalesce(?, content), published = coalesce(?, published), updated_at = current_timestamp where slug = ?', [title || null, content || null, typeof published === 'boolean' ? (published ? 1 : 0) : null, req.params.slug]);
  res.json({ ok: true });
});
app.delete('/api/posts/:slug', authMiddleware, requireAdmin(), async (req, res) => {
  await run('delete from posts where slug = ?', [req.params.slug]);
  res.json({ ok: true });
});

// Favorites
app.get('/api/favorites', authMiddleware, async (req, res) => {
  const rows = await all('select id, path, created_at from favorites where user_id = ? order by created_at desc', [req.user.id]);
  res.json(rows);
});
app.post('/api/favorites', authMiddleware, async (req, res) => {
  const { path: docPath } = req.body || {};
  if (!docPath) return res.status(400).json({ error: 'missing_path' });
  await run('insert into favorites(user_id, path) values(?, ?)', [req.user.id, docPath]);
  res.json({ ok: true });
});
app.delete('/api/favorites', authMiddleware, async (req, res) => {
  const { path: docPath } = req.body || {};
  if (!docPath) return res.status(400).json({ error: 'missing_path' });
  await run('delete from favorites where user_id = ? and path = ?', [req.user.id, docPath]);
  res.json({ ok: true });
});

// Notes
app.get('/api/notes', authMiddleware, async (req, res) => {
  const rows = await all('select path, content, updated_at from notes where user_id = ?', [req.user.id]);
  res.json(rows);
});
app.get('/api/notes/:path', authMiddleware, async (req, res) => {
  const row = await get('select path, content, updated_at from notes where user_id = ? and path = ?', [req.user.id, req.params.path]);
  res.json(row || { path: req.params.path, content: '' });
});
app.put('/api/notes/:path', authMiddleware, async (req, res) => {
  const content = req.body?.content || '';
  await run('insert into notes(user_id, path, content) values(?,?,?) on conflict(user_id, path) do update set content = excluded.content, updated_at = current_timestamp', [req.user.id, req.params.path, content]);
  res.json({ ok: true });
});

// History
app.get('/api/history', authMiddleware, async (req, res) => {
  const rows = await all('select path, visited_at from history where user_id = ? order by visited_at desc limit 50', [req.user.id]);
  res.json(rows);
});
app.post('/api/history', authMiddleware, async (req, res) => {
  const { path: docPath } = req.body || {};
  if (!docPath) return res.status(400).json({ error: 'missing_path' });
  await run('insert into history(user_id, path) values(?, ?)', [req.user.id, docPath]);
  res.json({ ok: true });
});

// Serve SPA and docs statically
app.use('/my-docs-spa', express.static(SPA_DIR));

// 404 and error handling
app.use((req,res)=> res.status(404).json({ error: 'not_found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`SPA served from /my-docs-spa/#/docs`);
});


