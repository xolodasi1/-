import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
      const info = stmt.run(username, password);
      res.json({ id: info.lastInsertRowid, username, subscribers: 0 });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Username already taken' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const stmt = db.prepare('SELECT id, username, subscribers FROM users WHERE username = ? AND password = ?');
    const user = stmt.get(username, password);
    
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/score/update', (req, res) => {
    const { userId, subscribers, views } = req.body;
    const stmt = db.prepare('UPDATE users SET subscribers = ?, views = ? WHERE id = ?');
    stmt.run(subscribers, views, userId);
    res.json({ success: true });
  });

  app.get('/api/leaderboard', (req, res) => {
    const stmt = db.prepare('SELECT username, subscribers FROM users ORDER BY subscribers DESC LIMIT 10');
    const leaderboard = stmt.all();
    res.json(leaderboard);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
