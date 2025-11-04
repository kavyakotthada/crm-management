// server.js
require('dotenv').config();
const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'crm.db');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const PORT = process.env.PORT || 4000;
const SALT_ROUNDS = 10;

let db;
async function initDb() {
  db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  await db.run('PRAGMA foreign_keys = ON');


  await db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.run(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
      course_interest TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      claimed_by INTEGER,
      FOREIGN KEY (claimed_by) REFERENCES employees(id) ON DELETE SET NULL
    )
  `);

  console.log('Database initialized:', DB_FILE);
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid authorization format' });

  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
   
    const user = await db.get('SELECT id, name, email FROM employees WHERE id = ?', payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.get('/', (req, res) => res.json({ ok: true, message: 'Fastor CRM API running' }));


app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  try {
    const existing = await db.get('SELECT id FROM employees WHERE email = ?', email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'User with this email already exists' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.run('INSERT INTO employees (name, email, password_hash) VALUES (?, ?, ?)', (name || null), email.toLowerCase(), password_hash);
    const newUser = { id: result.lastID, name: name || null, email: email.toLowerCase() };
    const token = generateToken(newUser);
    return res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  try {
    const row = await db.get('SELECT id, name, email, password_hash FROM employees WHERE email = ?', email.toLowerCase());
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const user = { id: row.id, name: row.name, email: row.email };
    const token = generateToken(user);
    return res.json({ user, token });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/enquiries', async (req, res) => {
  const { name, email, phone, course_interest, message } = req.body || {};
  
  if (!email) {
    return res.status(400).json({ error: 'email is required for enquiry' });
  }

  try {
    const result = await db.run(
      'INSERT INTO enquiries (name, email, phone, course_interest, message) VALUES (?, ?, ?, ?, ?)',
      name || null,
      email,
      phone || null,
      course_interest || null,
      message || null
    );
    const created = await db.get('SELECT * FROM enquiries WHERE id = ?', result.lastID);
    return res.status(201).json({ enquiry: created });
  } catch (err) {
    console.error('Create enquiry error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/enquiries/public', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM enquiries WHERE claimed_by IS NULL ORDER BY created_at DESC');
    return res.json({ enquiries: rows });
  } catch (err) {
    console.error('Fetch public enquiries error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/enquiries/:id/claim', authenticate, async (req, res) => {
  const enquiryId = Number(req.params.id);
  if (!enquiryId) return res.status(400).json({ error: 'Invalid enquiry id' });

  try {
  
    const result = await db.run(
      'UPDATE enquiries SET claimed_by = ? WHERE id = ? AND claimed_by IS NULL',
      req.user.id,
      enquiryId
    );

    if (result.changes === 0) {
    
      const existing = await db.get('SELECT id, claimed_by FROM enquiries WHERE id = ?', enquiryId);
      if (!existing) {
        return res.status(404).json({ error: 'Enquiry not found' });
      } else {
        return res.status(409).json({ error: 'Enquiry already claimed' });
      }
    }

    const updated = await db.get('SELECT * FROM enquiries WHERE id = ?', enquiryId);
    return res.json({ enquiry: updated });
  } catch (err) {
    console.error('Claim error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/enquiries/mine', authenticate, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM enquiries WHERE claimed_by = ? ORDER BY created_at DESC', req.user.id);
    return res.json({ enquiries: rows });
  } catch (err) {
    console.error('Fetch my enquiries error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/enquiries/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    const enquiry = await db.get('SELECT * FROM enquiries WHERE id = ?', id);
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    if (enquiry.claimed_by === null || enquiry.claimed_by === req.user.id) {
      return res.json({ enquiry });
    } else {
      return res.status(403).json({ error: 'Forbidden: enquiry claimed by another user' });
    }
  } catch (err) {
    console.error('Fetch enquiry error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });

module.exports = app;
