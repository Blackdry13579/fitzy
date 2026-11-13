import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
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

export async function dbQuery(text, params) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not configured');
  return p.query(text, params);
}

function toCamel(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[ck] = v;
  }
  return out;
}

export function mapRow(row) { return toCamel(row); }
export function mapRows(rows) { return (rows || []).map(toCamel); }

export function num(v, def = 0) {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export async function withTx(fn) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not configured');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
