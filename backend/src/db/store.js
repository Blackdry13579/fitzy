import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/db.json');

const defaultDb = {
  users: [],
  transactions: [],
  purchases: [],
  notifications: [],
  machines: [],
  settings: {},
  auditLogs: [],
};

export function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2));
    }
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return { ...defaultDb, ...JSON.parse(raw) };
  } catch {
    return JSON.parse(JSON.stringify(defaultDb));
  }
}

export function writeDb(db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
