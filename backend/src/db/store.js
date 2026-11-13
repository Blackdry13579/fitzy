import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { migrateStateToRelational } from './migrate.js';

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
let persistChain = Promise.resolve();

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

export function usingPostgres() { return !!getPool(); }

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

async function tableExists(p, name) {
  const r = await p.query(`SELECT to_regclass($1) AS t`, [`public.${name}`]);
  return !!r.rows[0]?.t;
}

function n(v, d=0){ const x=Number(v); return Number.isFinite(x)?x:d; }

async function loadFromRelational(p) {
  // load from relational tables into app-compatible shape
  const db = JSON.parse(JSON.stringify(defaultDb));
  try {
    const usersR = await p.query('SELECT * FROM users ORDER BY created_at ASC');
    db.users = usersR.rows.map(u => ({
      id: u.id,
      memberId: u.member_id || '',
      username: u.username || 'Utilisateur',
      phone: u.phone,
      country: u.country || 'BF',
      inviteCode: u.invite_code,
      referredBy: u.referred_by || null,
      passwordHash: u.password_hash || null,
      balance: n(u.balance),
      bonus: n(u.bonus_total),
      vipLevel: n(u.vip_level),
      onboardingDone: !!u.onboarding_done,
      inviteBonusAwarded: n(u.invite_bonus_awarded),
      lastClaimDate: u.last_claim_date ? new Date(u.last_claim_date).toISOString().slice(0,10) : null,
      lastActiveAt: u.last_active_at ? new Date(u.last_active_at).toISOString() : null,
      createdAt: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch { db.users = []; }

  try {
    const mR = await p.query('SELECT * FROM machines ORDER BY sort_order ASC, created_at ASC');
    db.machines = mR.rows.map(m => ({
      id: m.id, name: m.name, category: m.category, level: m.level,
      priceFcfa: n(m.price_fcfa), dailyRevenueFcfa: n(m.daily_revenue_fcfa), durationDays: n(m.duration_days),
      description: m.description, image: m.image, imageCredit: m.image_credit, locked: !!m.locked
    }));
  } catch { db.machines = []; }

  try {
    // collectedDays per purchase from machine_earnings
    const collectedR = await p.query(`SELECT purchase_id, COUNT(*)::int AS days FROM machine_earnings WHERE status='collected' GROUP BY purchase_id`);
    const collectedMap = new Map(collectedR.rows.map(r => [r.purchase_id, n(r.days)]));
    const pR = await p.query('SELECT * FROM purchases ORDER BY created_at DESC');
    db.purchases = pR.rows.map(pr => ({
      id: pr.id,
      userId: pr.user_id,
      machineId: pr.machine_id,
      amount: n(pr.amount),
      dailyRevenue: n(pr.daily_revenue),
      durationDays: n(pr.duration_days),
      totalRevenue: n(pr.total_revenue),
      status: pr.status || 'active',
      collectedDays: collectedMap.get(pr.id) || 0,
      createdAt: pr.created_at ? new Date(pr.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch { db.purchases = []; }

  try {
    const tR = await p.query('SELECT * FROM transactions ORDER BY created_at DESC');
    db.transactions = tR.rows.map(t => ({
      id: t.id, userId: t.user_id, type: t.type, amount: n(t.amount),
      fee: t.fee != null ? n(t.fee) : undefined,
      received: t.received != null ? n(t.received) : undefined,
      status: t.status, label: t.label, method: t.method, phone: t.phone, beneficiary: t.beneficiary,
      level: t.level != null ? n(t.level) : undefined,
      sourcePurchaseId: t.source_purchase_id || undefined,
      note: t.note || undefined,
      createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch { db.transactions = []; }

  try {
    const nR = await p.query('SELECT * FROM notifications ORDER BY created_at DESC');
    db.notifications = nR.rows.map(x => ({
      id: x.id, userId: x.user_id, title: x.title, text: x.text, type: x.type, read: !!x.read,
      createdAt: x.created_at ? new Date(x.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch { db.notifications = []; }

  try {
    const sR = await p.query('SELECT key, value FROM settings');
    const s = {};
    for (const row of sR.rows) s[row.key] = row.value;
    db.settings = s;
  } catch { db.settings = {}; }

  try {
    const aR = await p.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
    db.auditLogs = aR.rows.map(a => ({
      id: a.id, action: a.action, details: a.details || {}, admin: a.admin,
      createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch { db.auditLogs = []; }

  return db;
}

async function persistRelational(db) {
  // progressive bridge: upsert key entities from in-memory state into relational tables
  const p = await ensurePg();
  if (!p) return;
  // only attempt if users table exists (schema created)
  if (!(await tableExists(p, 'users'))) return;
  const client = await p.connect();
  try {
    await client.query('BEGIN');

    for (const u of (db.users||[])) {
      await client.query(`INSERT INTO users
        (id,member_id,username,phone,country,invite_code,referred_by,password_hash,balance,bonus_total,vip_level,onboarding_done,invite_bonus_awarded,last_claim_date,last_active_at,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
        ON CONFLICT (id) DO UPDATE SET
          member_id=EXCLUDED.member_id, username=EXCLUDED.username, phone=EXCLUDED.phone, country=EXCLUDED.country,
          invite_code=EXCLUDED.invite_code, referred_by=EXCLUDED.referred_by, password_hash=COALESCE(EXCLUDED.password_hash, users.password_hash),
          balance=EXCLUDED.balance, bonus_total=EXCLUDED.bonus_total, vip_level=EXCLUDED.vip_level,
          onboarding_done=EXCLUDED.onboarding_done, invite_bonus_awarded=EXCLUDED.invite_bonus_awarded,
          last_claim_date=EXCLUDED.last_claim_date, last_active_at=EXCLUDED.last_active_at, updated_at=NOW()`,
        [u.id, u.memberId||null, u.username||'Utilisateur', u.phone, u.country||'BF', u.inviteCode, u.referredBy||null, u.passwordHash||null,
         n(u.balance), n(u.bonus), n(u.vipLevel), !!u.onboardingDone, n(u.inviteBonusAwarded), u.lastClaimDate||null, u.lastActiveAt||null, u.createdAt||new Date().toISOString()]
      );
    }

    for (let i=0;i<(db.machines||[]).length;i++){
      const m=db.machines[i];
      await client.query(`INSERT INTO machines (id,name,category,level,price_fcfa,daily_revenue_fcfa,duration_days,description,image,image_credit,locked,sort_order,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, level=EXCLUDED.level, price_fcfa=EXCLUDED.price_fcfa,
          daily_revenue_fcfa=EXCLUDED.daily_revenue_fcfa, duration_days=EXCLUDED.duration_days, description=EXCLUDED.description, image=EXCLUDED.image,
          image_credit=EXCLUDED.image_credit, locked=EXCLUDED.locked, sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
        [m.id,m.name,m.category||null,m.level||null,n(m.priceFcfa),n(m.dailyRevenueFcfa),n(m.durationDays),m.description||null,m.image||null,m.imageCredit||null,!!m.locked,i]
      );
    }

    for (const pr of (db.purchases||[])){
      await client.query(`INSERT INTO purchases (id,user_id,machine_id,amount,daily_revenue,duration_days,total_revenue,status,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET amount=EXCLUDED.amount,daily_revenue=EXCLUDED.daily_revenue,duration_days=EXCLUDED.duration_days,total_revenue=EXCLUDED.total_revenue,status=EXCLUDED.status`,
        [pr.id,pr.userId,pr.machineId,n(pr.amount),n(pr.dailyRevenue),n(pr.durationDays),n(pr.totalRevenue),pr.status||'active',pr.createdAt||new Date().toISOString()]
      );
      // sync machine_earnings for choice C
      const daysElapsed = Math.min(n(pr.durationDays), Math.max(0, Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / 86400000)));
      const collectedDays = Math.min(daysElapsed, n(pr.collectedDays));
      for (let d=0; d<daysElapsed; d++){
        const date = new Date(new Date(pr.createdAt).getTime() + d*86400000).toISOString().slice(0,10);
        const status = d < collectedDays ? 'collected' : 'available';
        const eid = `me_${pr.id}_${date}`;
        await client.query(`INSERT INTO machine_earnings (id,purchase_id,user_id,earning_date,amount,status,collected_at,created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (purchase_id,earning_date) DO UPDATE SET status=EXCLUDED.status, collected_at=COALESCE(machine_earnings.collected_at, EXCLUDED.collected_at)`,
          [eid,pr.id,pr.userId,date,n(pr.dailyRevenue),status, status==='collected'?new Date().toISOString():null, pr.createdAt||new Date().toISOString()]
        );
      }
    }

    for (const t of (db.transactions||[])){
      await client.query(`INSERT INTO transactions (id,user_id,type,amount,fee,received,status,label,method,phone,beneficiary,level,source_purchase_id,note,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
        ON CONFLICT (id) DO UPDATE SET amount=EXCLUDED.amount,fee=EXCLUDED.fee,received=EXCLUDED.received,status=EXCLUDED.status,label=EXCLUDED.label,updated_at=NOW()`,
        [t.id,t.userId,t.type,n(t.amount),t.fee!=null?n(t.fee):null,t.received!=null?n(t.received):null,t.status||'confirmed',t.label||null,t.method||null,t.phone||null,t.beneficiary||null,t.level!=null?n(t.level):null,t.sourcePurchaseId||t.purchaseId||null,t.note||null,t.createdAt||new Date().toISOString()]
      );
    }

    for (const nt of (db.notifications||[])){
      await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET read=EXCLUDED.read`,
        [nt.id,nt.userId,nt.title||null,nt.text||null,nt.type||null,!!nt.read,nt.createdAt||new Date().toISOString()]
      );
    }

    const s = db.settings||{};
    for (const [k,v] of Object.entries(s)){
      await client.query(`INSERT INTO settings (key,value,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()`,[k, JSON.stringify(v)]);
    }

    for (const a of (db.auditLogs||[])){
      await client.query(`INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [a.id,a.action||'log',JSON.stringify(a.details||{}),a.admin||null,a.createdAt||new Date().toISOString()]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Relational persist error:', e?.message || e);
  } finally {
    client.release();
  }
}

export async function initDb() {
  const p = await ensurePg();
  if (p) {
    // Prefer relational tables as source of truth if present and populated; else load app_state and migrate
    let loaded = null;
    try {
      if (await tableExists(p, 'users')) {
        const count = await p.query('SELECT COUNT(*)::int AS c FROM users');
        const hasRel = (count.rows[0]?.c || 0) > 0;
        const state = await loadFromPg(p);
        const stateHasUsers = (state.users||[]).length > 0;
        if (hasRel) {
          loaded = await loadFromRelational(p);
        } else if (stateHasUsers) {
          // migrate existing state into relational tables then load from them
          try { await migrateStateToRelational(); } catch (e) { console.error('auto-migrate failed:', e?.message||e); }
          loaded = await loadFromRelational(p);
        } else {
          loaded = state;
        }
      } else {
        loaded = await loadFromPg(p);
      }
    } catch (e) {
      console.error('initDb relational load error:', e?.message||e);
      loaded = await loadFromPg(p);
    }
    memoryDb = loaded || JSON.parse(JSON.stringify(defaultDb));
  } else {
    memoryDb = readDbFile();
  }
  return memoryDb;
}

export function readDb() {
  if (memoryDb) return memoryDb;
  return readDbFile();
}

async function persistPgNow(db) {
  const onErr = (label, err) => {
    const msg = err?.message || String(err);
    console.error(`${label}:`, msg);
    try { if (memoryDb && typeof memoryDb === 'object') memoryDb._lastPersistError = { label, msg, at: new Date().toISOString() }; } catch {}
    throw err;
  };
  try {
    await persistToPg(db);
    try { if (memoryDb && typeof memoryDb === 'object' && memoryDb._lastPersistError?.label === 'DB persist error') delete memoryDb._lastPersistError; } catch {}
  } catch (e) { onErr('DB persist error', e); }
  try {
    await persistRelational(db);
    try { if (memoryDb && typeof memoryDb === 'object' && memoryDb._lastPersistError?.label === 'Relational persist error') delete memoryDb._lastPersistError; } catch {}
  } catch (e) { onErr('Relational persist error', e); }
}

export async function writeDbAsync(db) {
  memoryDb = db;
  if (getPool()) {
    // serialize persistence to avoid overlapping full-state syncs
    const job = persistChain.then(() => persistPgNow(db), () => persistPgNow(db));
    persistChain = job.catch(() => {});
    await job;
  } else {
    writeDbFile(db);
  }
}

export function writeDb(db) {
  memoryDb = db;
  if (getPool()) {
    const job = persistChain.then(() => persistPgNow(db), () => persistPgNow(db));
    persistChain = job.catch(() => {});
    // keep sync API for compatibility; callers should prefer writeDbAsync when possible
    job.catch(() => {});
  } else {
    writeDbFile(db);
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
