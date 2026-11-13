import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

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

let pool = null;
let pgReady = false;
let memoryDb = null;

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensurePg() {
  const p = getPool();
  if (!p) return null;
  if (!pgReady) {
    await p.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await p.query(
      `INSERT INTO app_state (id, state) VALUES (1, $1::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(defaultDb)]
    );
    pgReady = true;
  }
  return p;
}

function readDbFile() {
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

function writeDbFile(db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function loadFromPg(p) {
  const res = await p.query('SELECT state FROM app_state WHERE id = 1');
  if (!res.rows.length) return JSON.parse(JSON.stringify(defaultDb));
  const state = res.rows[0].state;
  return { ...defaultDb, ...(state || {}) };
}

async function persistToPg(db) {
  const p = await ensurePg();
  if (!p) return;
  await p.query(
    `UPDATE app_state SET state = $1::jsonb, updated_at = NOW() WHERE id = 1`,
    [JSON.stringify(db)]
  );
}

export async function initDb() {
  const p = await ensurePg();
  if (p) {
    memoryDb = await loadFromPg(p);
  } else {
    memoryDb = readDbFile();
  }
  return memoryDb;
}

export function readDb() {
  if (memoryDb) return memoryDb;
  // fallback if initDb not yet called
  return readDbFile();
}

export function writeDb(db) {
  memoryDb = db;
  if (getPool()) {
    // async persist (best-effort) for Postgres mode
    persistToPg(db).catch((err) => {
      console.error('DB persist error:', err?.message || err);
    });
  } else {
    writeDbFile(db);
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
