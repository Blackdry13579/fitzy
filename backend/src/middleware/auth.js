import jwt from 'jsonwebtoken';
import { readDb, writeDb } from '../db/store.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    req.user = payload;
    try {
      const db = readDb();
      const u = db.users.find(x => x.id === payload.id);
      if (u) { u.lastActiveAt = new Date().toISOString(); writeDb(db); }
    } catch {}
    next();
  } catch {
    return res.status(401).json({ error: 'Session invalide' });
  }
}
