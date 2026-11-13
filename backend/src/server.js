import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pathToFileURL } from 'url';
import { initDb, readDb, writeDb, uid, usingPostgres } from './db/store.js';
import { getPool } from './db/pg.js';
import * as pgDb from './db/relational.js';
import { authRequired } from './middleware/auth.js';
import { machines as seedMachines } from './modules/machines.js';

dotenv.config();

const app = express();
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins, credentials: true } : {}));
app.use(express.json());

const APP_BASE_URL = (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || 'https://fitzone.app').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const sign = (user) => jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });
const signAdmin = (phone) => jwt.sign({ id: 'admin', role: 'admin', phone }, JWT_SECRET, { expiresIn: '7d' });

function adminRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function getMachines(db) {
  if (!db.machines || db.machines.length === 0) {
    db.machines = seedMachines.map(m => ({ ...m }));
    writeDb(db);
  }
  return db.machines;
}

function getUserVipLevel(db, userId) {
  const ms = getMachines(db);
  const purchases = (db.purchases || []).filter(p => p.userId === userId);
  let maxVip = 0;
  for (const p of purchases) {
    const idx = ms.findIndex(m => m.id === p.machineId);
    if (idx >= 0) maxVip = Math.max(maxVip, idx + 1);
  }
  return maxVip; // VIP 0 si aucune machine, sinon max des achats (ne descend jamais)
}

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

function adminPublicUser(db, u) {
  if (!u) return u;
  const base = publicUser(u);
  const bonus = computeBonusTotal(db, u.id);
  const vipLevel = getUserVipLevel(db, u.id);
  // keep stored bonus consistent when we expose computed value
  if (u && u.id) u.bonus = bonus;
  return { ...base, bonus, vipLevel };
}

function logAdmin(db, req, action, details = {}) {
  db.auditLogs = db.auditLogs || [];
  db.auditLogs.push({ id: uid('aud'), action, details, admin: req.admin?.phone || 'admin', createdAt: new Date().toISOString() });
}

function getSettings(db) {
  db.settings = db.settings || {};
  const defaults = {
    supportTelegram: 'https://t.me/fitzone_support',
    depositNumber: '+226 66 76 83 92',
    merchantCode: 'OM-123456',
    minWithdraw: 1200,
    maxWithdraw: 1000000,
    withdrawFeePercent: 10,
    minDeposit: 500,
    maxDeposit: 1000000,
    depositPresets: [2500, 7000, 13000, 28000, 60000],
    withdrawPresets: [1200, 5000, 10000, 25000, 50000],
    adminPhone: process.env.ADMIN_PHONE || '02040608',
    adminPassword: process.env.ADMIN_PASSWORD || 'Anzaruch@3578@',
    adminEmail: process.env.ADMIN_EMAIL || '',
  };
  const s = { ...defaults, ...db.settings };
  // normalize arrays/numbers
  s.minWithdraw = Number(s.minWithdraw) || defaults.minWithdraw;
  s.maxWithdraw = Number(s.maxWithdraw) || defaults.maxWithdraw;
  s.withdrawFeePercent = Number(s.withdrawFeePercent) || 0;
  s.minDeposit = Number(s.minDeposit) || defaults.minDeposit;
  s.maxDeposit = Number(s.maxDeposit) || defaults.maxDeposit;
  if (typeof s.depositPresets === 'string') s.depositPresets = s.depositPresets.split(',').map(x=>Number(x.trim())).filter(n=>n>0);
  if (typeof s.withdrawPresets === 'string') s.withdrawPresets = s.withdrawPresets.split(',').map(x=>Number(x.trim())).filter(n=>n>0);
  if (!Array.isArray(s.depositPresets) || !s.depositPresets.length) s.depositPresets = defaults.depositPresets;
  if (!Array.isArray(s.withdrawPresets) || !s.withdrawPresets.length) s.withdrawPresets = defaults.withdrawPresets;
  s.depositPresets = s.depositPresets.map(Number).filter(n=>n>0);
  s.withdrawPresets = s.withdrawPresets.map(Number).filter(n=>n>0);
  return s;
}

function getAdminCreds(db) {
  const s = getSettings(db);
  return { phone: String(s.adminPhone || process.env.ADMIN_PHONE || '02040608'), password: String(s.adminPassword || process.env.ADMIN_PASSWORD || 'Anzaruch@3578@'), email: String(s.adminEmail || process.env.ADMIN_EMAIL || '') };
}

function generateMemberId(db) {
  let id;
  do {
    id = String(Math.floor(10000 + Math.random() * 90000));
  } while (db.users.some(u => String(u.memberId) === id));
  return id;
}

function generateInviteCode(db) {
  let code;
  do {
    code = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  } while (db.users.some(u => u.inviteCode === code));
  return code;
}

function computeBonusTotal(db, userId) {
  const txs = (db && db.transactions) || [];
  return Math.round(txs
    .filter(t => t.userId === userId && t.status === 'confirmed' && (t.type === 'bonus' || t.type === 'commission'))
    .reduce((s, t) => s + Number(t.amount || 0), 0));
}

function ensureUserShape(u, db) {
  if (db && !u.memberId) {
    u.memberId = generateMemberId(db);
  }
  const bonusTotal = db ? computeBonusTotal(db, u.id) : (u.bonus ?? 0);
  if (db) u.bonus = bonusTotal;
  const vipLevel = db ? getUserVipLevel(db, u.id) : (u.vipLevel ?? 0);
  const inviteCode = u.inviteCode || '';
  return {
    id: u.id,
    memberId: u.memberId || '',
    username: u.username || 'Utilisateur',
    phone: u.phone,
    country: u.country || 'BF',
    inviteCode,
    inviteLink: `${APP_BASE_URL}/invite/${inviteCode}`,
    referredBy: u.referredBy || null,
    balance: u.balance ?? 0,
    bonus: bonusTotal,
    vipLevel,
    createdAt: u.createdAt,
  };
}

function calcReferral(db, userId) {
  const direct = db.users.filter(u => u.referredBy === userId);
  const level2 = db.users.filter(u => direct.some(d => d.id === u.referredBy));
  const level3 = db.users.filter(u => level2.some(d => d.id === u.referredBy));
  const ratesPct = [27, 3, 1];
  const groups = [direct, level2, level3];
  db.transactions = db.transactions || [];
  // total earned from credited commission transactions (source of truth for "rapporté")
  const myComms = db.transactions.filter(t => t.userId === userId && t.type === 'commission' && t.status === 'confirmed');
  const earnedForLevel = (lvl) => Math.round(myComms.filter(t => Number(t.level) === lvl).reduce((s,t)=>s + Number(t.amount||0), 0));
  const totalEarned = Math.round(myComms.reduce((s,t)=>s + Number(t.amount||0), 0));
  const tiers = [
    { count: 3, total: 700 },
    { count: 5, total: 1200 },
    { count: 10, total: 3000 },
    { count: 15, total: 5000 },
  ];
  const directCount = direct.length;
  let inviteBonusTarget = 0;
  for (const t of tiers) if (directCount >= t.count) inviteBonusTarget = t.total;
  const memberInfo = (u) => ({
    id: u.id,
    memberId: u.memberId || '',
    username: u.username || 'Utilisateur',
    phone: u.phone || '',
    createdAt: u.createdAt || '',
    vipLevel: getUserVipLevel(db, u.id),
  });
  return {
    code: db.users.find(u=>u.id===userId)?.inviteCode,
    link: `${APP_BASE_URL}/invite/${db.users.find(u=>u.id===userId)?.inviteCode || ''}`,
    totalEarned,
    inviteBonus: { directCount, awarded: db.users.find(u=>u.id===userId)?.inviteBonusAwarded || 0, target: inviteBonusTarget, tiers },
    levels: [
      { level: 1, count: direct.length, commission: earnedForLevel(1), rate: ratesPct[0], members: direct.map(memberInfo) },
      { level: 2, count: level2.length, commission: earnedForLevel(2), rate: ratesPct[1], members: level2.map(memberInfo) },
      { level: 3, count: level3.length, commission: earnedForLevel(3), rate: ratesPct[2], members: level3.map(memberInfo) },
    ],
    teams: [
      { name: 'Équipe A', count: direct.length },
      { name: 'Équipe B', count: level2.length },
      { name: 'Équipe C', count: level3.length },
    ],
  };
}

function creditReferralCommissionsForPurchase(db, purchase, buyer) {
  if (!purchase || !buyer) return;
  db.transactions = db.transactions || [];
  db.notifications = db.notifications || [];
  const rates = [0.27, 0.03, 0.01];
  let refId = buyer.referredBy || null;
  for (let level = 1; level <= 3 && refId; level++) {
    const refUser = db.users.find(u => u.id === refId);
    if (!refUser) break;
    const sourcePurchaseId = purchase.id;
    const exists = db.transactions.some(t => t.type === 'commission' && t.sourcePurchaseId === sourcePurchaseId && Number(t.level) === level);
    if (!exists) {
      const amount = Math.round(Number(purchase.amount || 0) * rates[level - 1]);
      if (amount > 0) {
        refUser.balance = (refUser.balance || 0) + amount;
        db.transactions.push({
          id: uid('tx'),
          userId: refUser.id,
          type: 'commission',
          amount,
          status: 'confirmed',
          level,
          rate: Math.round(rates[level - 1] * 100),
          sourcePurchaseId,
          fromUserId: buyer.id,
          label: `Commission parrainage N${level}`,
          createdAt: new Date().toISOString(),
        });
        refUser.bonus = computeBonusTotal(db, refUser.id);
        const pct = Math.round(rates[level - 1] * 100);
        db.notifications.push({
          id: uid('ntf'),
          userId: refUser.id,
          title: 'Commission reçue',
          text: `Une personne que vous avez invitée (niveau ${level}, ${pct}%) a acheté une machine. Vous recevez ${amount.toLocaleString('fr-FR')} FCFA, ajoutés à votre solde.`,
          type: 'wallet',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    refId = refUser.referredBy || null;
  }
}

function awardInviteMilestones(db, referrerId) {
  if (!referrerId) return;
  const ref = db.users.find(u => u.id === referrerId);
  if (!ref) return;
  db.transactions = db.transactions || [];
  db.notifications = db.notifications || [];
  const tiers = [
    { count: 3, total: 700 },
    { count: 5, total: 1200 },
    { count: 10, total: 3000 },
    { count: 15, total: 5000 },
  ];
  const directCount = db.users.filter(u => u.referredBy === referrerId).length;
  let target = 0;
  for (const t of tiers) if (directCount >= t.count) target = t.total;
  const awarded = Number(ref.inviteBonusAwarded || 0);
  if (target > awarded) {
    const delta = target - awarded;
    ref.balance = (ref.balance || 0) + delta;
    ref.inviteBonusAwarded = target;
    db.transactions.push({ id: uid('tx'), userId: ref.id, type: 'bonus', amount: delta, status: 'confirmed', label: `Bonus invitation (${directCount} invités)`, createdAt: new Date().toISOString() });
    ref.bonus = computeBonusTotal(db, ref.id);
    db.notifications.push({ id: uid('ntf'), userId: ref.id, title: 'Bonus d’invitation', text: `Félicitations ! Vous avez atteint ${directCount} invités et reçu ${delta.toLocaleString('fr-FR')} FCFA (total ${target.toLocaleString('fr-FR')} FCFA).`, type: 'wallet', read: false, createdAt: new Date().toISOString() });
  }
}

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Machines
app.get('/api/machines', async (_req, res) => {
  try {
    if (usingPostgres()) return res.json(await pgDb.getMachines());
    const db = readDb();
    res.json(getMachines(db));
  } catch (e) { console.error('machines list error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});
app.get('/api/machines/:id', async (req, res) => {
  try {
    if (usingPostgres()) {
      const m = await pgDb.getMachineById(req.params.id);
      if (!m) return res.status(404).json({ error: 'Machine introuvable' });
      return res.json(m);
    }
    const db = readDb();
    const m = getMachines(db).find(x => x.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Machine introuvable' });
    res.json(m);
  } catch (e) { console.error('machine detail error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, password, inviteCode, country } = req.body || {};
    if (!phone || !password) return res.status(400).json({ error: 'Téléphone et mot de passe requis' });
    const code = String(inviteCode || '').trim().toUpperCase();

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ex = await client.query('SELECT 1 FROM users WHERE phone=$1 LIMIT 1', [phone]);
        if (ex.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Numéro déjà utilisé' }); }

        let referrer = null;
        if (code) {
          const rr = await client.query('SELECT id FROM users WHERE UPPER(invite_code)=$1 LIMIT 1', [code]);
          if (!rr.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Code d’invitation invalide' }); }
          referrer = rr.rows[0];
        }

        // generate unique memberId and inviteCode
        let memberId = '';
        for (let i=0;i<20;i++){ const cand = String(Math.floor(10000+Math.random()*90000)); const c=await client.query('SELECT 1 FROM users WHERE member_id=$1 LIMIT 1',[cand]); if(!c.rowCount){ memberId=cand; break; } }
        if(!memberId) memberId = String(Date.now()).slice(-5);
        let newInvite = '';
        for (let i=0;i<20;i++){ const cand = generateInviteCode({users:[]}); const c=await client.query('SELECT 1 FROM users WHERE invite_code=$1 LIMIT 1',[cand]); if(!c.rowCount){ newInvite=cand; break; } }
        if(!newInvite) newInvite = (generateInviteCode({users:[]}) + Date.now().toString(36).slice(-2)).toUpperCase();

        const userId = uid('usr');
        const nowIso = new Date().toISOString();
        const hash = await bcrypt.hash(password, 10);
        await client.query(`INSERT INTO users (id,member_id,username,phone,country,invite_code,referred_by,password_hash,balance,bonus_total,vip_level,onboarding_done,invite_bonus_awarded,created_at,updated_at)
          VALUES ($1,$2,'Utilisateur',$3,$4,$5,$6,$7,600,0,0,false,0,$8,NOW())`,
          [userId, memberId, phone, country || 'BF', newInvite, referrer ? referrer.id : null, hash, nowIso]);
        await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,label,created_at,updated_at) VALUES ($1,$2,'bonus',600,'confirmed',$3,$4,NOW())`,
          [uid('tx'), userId, "Bonus d'inscription", nowIso]);
        await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at) VALUES ($1,$2,$3,$4,'info',false,$5)`,
          [uid('ntf'), userId, 'Bienvenue sur FITZONE', 'Votre compte a été créé avec succès. Bonus d’inscription de 600 FCFA ajouté à votre solde.', nowIso]);

        // award invite milestones to referrer
        if (referrer) {
          const tiers = [{count:3,total:700},{count:5,total:1200},{count:10,total:3000},{count:15,total:5000}];
          const dcRes = await client.query('SELECT COUNT(*)::int AS c FROM users WHERE referred_by=$1', [referrer.id]);
          const directCount = Number(dcRes.rows[0]?.c || 0);
          let target = 0; for (const t of tiers) if (directCount >= t.count) target = t.total;
          const refRes = await client.query('SELECT invite_bonus_awarded FROM users WHERE id=$1 FOR UPDATE', [referrer.id]);
          const awarded = Number(refRes.rows[0]?.invite_bonus_awarded || 0);
          if (target > awarded) {
            const delta = target - awarded;
            await client.query('UPDATE users SET balance = balance + $1, invite_bonus_awarded=$2, updated_at=NOW() WHERE id=$3', [delta, target, referrer.id]);
            await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,label,created_at,updated_at) VALUES ($1,$2,'bonus',$3,'confirmed',$4,$5,NOW())`,
              [uid('tx'), referrer.id, delta, `Bonus invitation (${directCount} invités)`, nowIso]);
            await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at) VALUES ($1,$2,$3,$4,'wallet',false,$5)`,
              [uid('ntf'), referrer.id, 'Bonus d’invitation', `Félicitations ! Vous avez atteint ${directCount} invités et reçu ${delta.toLocaleString('fr-FR')} FCFA.`, nowIso]);
          }
        }

        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === userId);
        const token = sign({ id: userId, phone });
        return res.json({ token, user: ensureUserShape(user, db) });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    if (db.users.find(u => u.phone === phone)) return res.status(400).json({ error: 'Numéro déjà utilisé' });
    let referrer = null;
    if (code) {
      referrer = db.users.find(u => String(u.inviteCode || '').toUpperCase() === code);
      if (!referrer) return res.status(400).json({ error: 'Code d’invitation invalide' });
    }
    const user = {
      id: uid('usr'),
      memberId: generateMemberId(db),
      username: 'Utilisateur',
      phone,
      country: country || 'BF',
      inviteCode: generateInviteCode(db),
      referredBy: referrer ? referrer.id : null,
      passwordHash: await bcrypt.hash(password, 10),
      balance: 600,
      bonus: 0,
      onboardingDone: false,
      inviteBonusAwarded: 0,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.transactions.push({ id: uid('tx'), userId: user.id, type: 'bonus', amount: 600, status: 'confirmed', label: "Bonus d'inscription", createdAt: new Date().toISOString() });
    user.bonus = computeBonusTotal(db, user.id);
    db.notifications.push({ id: uid('ntf'), userId: user.id, title: 'Bienvenue sur FITZONE', text: 'Votre compte a été créé avec succès. Bonus d’inscription de 600 FCFA ajouté à votre solde.', type: 'info', read: false, createdAt: new Date().toISOString() });
    if (referrer) awardInviteMilestones(db, referrer.id);
    writeDb(db);
    const token = sign(user);
    res.json({ token, user: ensureUserShape(user, db) });
  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT * FROM users WHERE phone=$1 LIMIT 1', [phone]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(401).json({ error: 'Identifiants invalides' }); }
        const row = uRes.rows[0];
        const ok = await bcrypt.compare(password, row.password_hash || '');
        if (!ok) { await client.query('ROLLBACK'); return res.status(401).json({ error: 'Identifiants invalides' }); }
        let memberId = row.member_id || null;
        if (!memberId) {
          for (let i=0;i<20;i++){ const cand = String(Math.floor(10000+Math.random()*90000)); const c=await client.query('SELECT 1 FROM users WHERE member_id=$1 LIMIT 1',[cand]); if(!c.rowCount){ memberId=cand; break; } }
          if(!memberId) memberId = String(Date.now()).slice(-5);
          await client.query('UPDATE users SET member_id=$1, updated_at=NOW() WHERE id=$2', [memberId, row.id]);
        }
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === row.id);
        const token = sign({ id: row.id, phone: row.phone });
        return res.json({ token, user: ensureUserShape(user, db) });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const user = db.users.find(u => u.phone === phone);
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });
    const token = sign(user);
    let changed = false;
    if (!user.memberId) { user.memberId = generateMemberId(db); changed = true; }
    if (changed) writeDb(db);
    res.json({ token, user: ensureUserShape(user, db) });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable' }); }
        let memberId = uRes.rows[0].member_id || null;
        if (!memberId) {
          for (let i=0;i<20;i++){ const cand = String(Math.floor(10000+Math.random()*90000)); const c=await client.query('SELECT 1 FROM users WHERE member_id=$1 LIMIT 1',[cand]); if(!c.rowCount){ memberId=cand; break; } }
          if(!memberId) memberId = String(Date.now()).slice(-5);
          await client.query('UPDATE users SET member_id=$1, updated_at=NOW() WHERE id=$2', [memberId, req.user.id]);
        }
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        return res.json(ensureUserShape(user, db));
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const shaped = ensureUserShape(user, db);
    if (user.memberId) writeDb(db); // persist backfill if added
    res.json(shaped);
  } catch (e) {
    console.error('auth/me error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Profile
app.patch('/api/profile', authRequired, async (req, res) => {
  try {
    const { username, onboardingDone } = req.body || {};
    if (username !== undefined && String(username).trim().length === 0) return res.status(400).json({ error: 'Nom d’utilisateur invalide' });

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable' }); }
        const sets = ['updated_at=NOW()'];
        const vals = [];
        let i = 1;
        if (username !== undefined) { sets.push(`username=$${i++}`); vals.push(String(username).trim().slice(0, 20)); }
        if (onboardingDone !== undefined) { sets.push(`onboarding_done=$${i++}`); vals.push(!!onboardingDone); }
        vals.push(req.user.id);
        await client.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$${i}`, vals);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.id);
        return res.json(ensureUserShape(user, db));
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (username !== undefined) user.username = String(username).trim().slice(0, 20);
    if (onboardingDone !== undefined) user.onboardingDone = !!onboardingDone;
    writeDb(db);
    res.json(ensureUserShape(user, db));
  } catch (e) {
    console.error('profile update error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Wallet
app.get('/api/wallet', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const user = await pgDb.getUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      const transactions = await pgDb.getTransactionsByUser(req.user.id);
      const bonus = Math.round(transactions
        .filter(t => t.status === 'confirmed' && (t.type === 'bonus' || t.type === 'commission'))
        .reduce((s, t) => s + Number(t.amount || 0), 0));
      return res.json({ balance: Number(user.balance || 0), bonus, transactions });
    }
    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    const tx = db.transactions.filter(t => t.userId === req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    res.json({ balance: user?.balance ?? 0, bonus: computeBonusTotal(db, req.user.id), transactions: tx });
  } catch (e) { console.error('wallet error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.post('/api/wallet/deposit', authRequired, async (req, res) => {
  try {
    const { amount, method, otp, merchantCode } = req.body || {};
    const amt = Number(amount);
    const db0 = readDb();
    const s = getSettings(db0);
    const min = Number(s.minDeposit || 0);
    const max = Number(s.maxDeposit || 0);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Montant invalide' });
    if (min && amt < min) return res.status(400).json({ error: `Montant minimum ${min} FCFA` });
    if (max && amt > max) return res.status(400).json({ error: `Montant maximum ${max} FCFA` });
    if (method === 'otp' && !otp) return res.status(400).json({ error: 'Code OTP requis' });
    if (method === 'marchand' && !merchantCode) return res.status(400).json({ error: 'Paiement marchand invalide' });

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT id,balance FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable' }); }
        const recent = await client.query(`SELECT 1 FROM transactions WHERE user_id=$1 AND type='deposit' AND amount=$2 AND method=$3 AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1`, [req.user.id, amt, method || 'otp']);
        if (recent.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Dépôt déjà soumis, veuillez patienter' }); }
        await client.query('UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2', [amt, req.user.id]);
        const txId = uid('tx'); const nowIso = new Date().toISOString();
        await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,method,label,created_at,updated_at) VALUES ($1,$2,'deposit',$3,'pending',$4,'Dépôt',$5,NOW())`, [txId, req.user.id, amt, method || 'otp', nowIso]);
        await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at) VALUES ($1,$2,$3,$4,'wallet',false,$5)`, [uid('ntf'), req.user.id, 'Dépôt soumis', `Votre dépôt de ${amt.toLocaleString('fr-FR')} FCFA a été ajouté à votre solde et est en attente de confirmation.`, nowIso]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.id);
        const tx = (db.transactions || []).find(t => t.id === txId) || { id: txId, userId: req.user.id, type: 'deposit', amount: amt, status: 'pending', method: method || 'otp', label: 'Dépôt', createdAt: nowIso };
        return res.json({ balance: user?.balance ?? 0, transaction: tx });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const recent = db.transactions.find(t => t.userId === user.id && t.type === 'deposit' && Number(t.amount) === amt && t.method === (method||'otp') && (Date.now() - new Date(t.createdAt).getTime()) < 60000);
    if (recent) return res.status(400).json({ error: 'Dépôt déjà soumis, veuillez patienter' });
    user.balance = (user.balance || 0) + amt;
    const tx = { id: uid('tx'), userId: user.id, type: 'deposit', amount: amt, status: 'pending', method: method || 'otp', label: 'Dépôt', createdAt: new Date().toISOString() };
    db.transactions.push(tx);
    db.notifications.push({ id: uid('ntf'), userId: user.id, title: 'Dépôt soumis', text: `Votre dépôt de ${amt.toLocaleString('fr-FR')} FCFA a été ajouté à votre solde et est en attente de confirmation.`, type: 'wallet', read: false, createdAt: new Date().toISOString() });
    writeDb(db);
    res.json({ balance: user.balance, transaction: tx });
  } catch (e) {
    console.error('deposit error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/wallet/withdraw', authRequired, async (req, res) => {
  try {
    const { amount, phone, beneficiary } = req.body || {};
    const amt = Number(amount);
    const db0 = readDb();
    const s = getSettings(db0);
    const min = Number(s.minWithdraw ?? 1200);
    const max = Number(s.maxWithdraw || 0);
    const feePct = Number(s.withdrawFeePercent ?? 10);
    if (!amt || amt < min) return res.status(400).json({ error: `Montant minimum ${min} FCFA` });
    if (max && amt > max) return res.status(400).json({ error: `Montant maximum ${max} FCFA` });
    if (!phone || !beneficiary) return res.status(400).json({ error: 'Numéro et nom du bénéficiaire requis' });
    const fee = Math.round(amt * (feePct / 100));
    const received = Math.max(0, amt - fee);

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT id,balance FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable' }); }
        const bal = Number(uRes.rows[0].balance || 0);
        if (bal < amt) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Solde insuffisant' }); }
        const recent = await client.query(`SELECT 1 FROM transactions WHERE user_id=$1 AND type='withdraw' AND status='pending' AND amount=$2 AND phone=$3 AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1`, [req.user.id, amt, phone]);
        if (recent.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Demande de retrait déjà en cours de traitement' }); }
        await client.query('UPDATE users SET balance = balance - $1, updated_at=NOW() WHERE id=$2', [amt, req.user.id]);
        const txId = uid('tx'); const nowIso = new Date().toISOString();
        await client.query(`INSERT INTO transactions (id,user_id,type,amount,fee,received,status,label,phone,beneficiary,created_at,updated_at) VALUES ($1,$2,'withdraw',$3,$4,$5,'pending','Retrait',$6,$7,$8,NOW())`, [txId, req.user.id, amt, fee, received, phone, beneficiary, nowIso]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.id);
        const tx = (db.transactions || []).find(t => t.id === txId) || { id: txId, userId: req.user.id, type: 'withdraw', amount: amt, fee, received, status: 'pending', label: 'Retrait', phone, beneficiary, createdAt: nowIso };
        return res.json({ balance: user?.balance ?? 0, transaction: tx });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if ((user.balance || 0) < amt) return res.status(400).json({ error: 'Solde insuffisant' });
    const recent = db.transactions.find(t => t.userId === user.id && t.type === 'withdraw' && t.status === 'pending' && Number(t.amount) === amt && t.phone === phone && (Date.now() - new Date(t.createdAt).getTime()) < 60000);
    if (recent) return res.status(400).json({ error: 'Demande de retrait déjà en cours de traitement' });
    user.balance -= amt;
    const tx = { id: uid('tx'), userId: user.id, type: 'withdraw', amount: amt, fee, received, status: 'pending', label: 'Retrait', phone, beneficiary, createdAt: new Date().toISOString() };
    db.transactions.push(tx);
    writeDb(db);
    res.json({ balance: user.balance, transaction: tx });
  } catch (e) {
    console.error('withdraw error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/wallet/claim-daily', authRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT id, last_claim_date FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable' }); }
        const lcd = uRes.rows[0].last_claim_date ? new Date(uRes.rows[0].last_claim_date).toISOString().slice(0,10) : null;
        if (lcd === today) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Bonus déjà réclamé aujourd’hui' }); }
        await client.query('UPDATE users SET last_claim_date=$1::date, balance = balance + 50, updated_at=NOW() WHERE id=$2', [today, req.user.id]);
        const txId = uid('tx'); const nowIso = new Date().toISOString();
        await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,label,created_at,updated_at) VALUES ($1,$2,'bonus',50,'confirmed','Bonus quotidien',$3,NOW())`, [txId, req.user.id, nowIso]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.id);
        const tx = (db.transactions || []).find(t => t.id === txId) || { id: txId, userId: req.user.id, type: 'bonus', amount: 50, status: 'confirmed', label: 'Bonus quotidien', createdAt: nowIso };
        return res.json({ balance: user?.balance ?? 0, bonus: computeBonusTotal(db, req.user.id), transaction: tx });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (user.lastClaimDate === today) return res.status(400).json({ error: 'Bonus déjà réclamé aujourd’hui' });
    user.lastClaimDate = today;
    user.balance = (user.balance || 0) + 50;
    const tx = { id: uid('tx'), userId: user.id, type: 'bonus', amount: 50, status: 'confirmed', label: 'Bonus quotidien', createdAt: new Date().toISOString() };
    db.transactions.push(tx);
    user.bonus = computeBonusTotal(db, user.id);
    writeDb(db);
    res.json({ balance: user.balance, bonus: user.bonus, transaction: tx });
  } catch (e) {
    console.error('claim-daily error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


function enrichPurchase(p, db) {
  const ms = getMachines(db);
  const m = ms.find(x => x.id === p.machineId);
  const daysElapsed = Math.min(p.durationDays, Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000)));
  const daysLeft = Math.max(0, p.durationDays - daysElapsed);
  const earned = Math.min(p.totalRevenue || 0, daysElapsed * Number(p.dailyRevenue || 0));
  const remaining = Math.max(0, Number(p.totalRevenue || 0) - earned);
  const collectedDays = Math.min(daysElapsed, Number(p.collectedDays || 0));
  const collectableDays = Math.max(0, daysElapsed - collectedDays);
  const collectableAmount = collectableDays * Number(p.dailyRevenue || 0);
  const collectedAmount = collectedDays * Number(p.dailyRevenue || 0);
  return {
    ...p,
    collectedDays,
    collectableDays,
    collectableAmount,
    collectedAmount,
    machine: m || null,
    daysElapsed,
    daysLeft,
    earned,
    remaining,
    progress: p.durationDays ? Math.round((daysElapsed / p.durationDays) * 100) : 0,
  };
}

// Purchases / mes produits
function enrichPurchaseFromMachines(p, ms) {
  const m = (ms || []).find(x => x.id === p.machineId);
  const daysElapsed = Math.min(Number(p.durationDays || 0), Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000)));
  const daysLeft = Math.max(0, Number(p.durationDays || 0) - daysElapsed);
  const earned = Math.min(Number(p.totalRevenue || 0), daysElapsed * Number(p.dailyRevenue || 0));
  const remaining = Math.max(0, Number(p.totalRevenue || 0) - earned);
  const collectedDays = Math.min(daysElapsed, Number(p.collectedDays || 0));
  const collectableDays = Math.max(0, daysElapsed - collectedDays);
  const collectableAmount = collectableDays * Number(p.dailyRevenue || 0);
  const collectedAmount = collectedDays * Number(p.dailyRevenue || 0);
  return {
    ...p,
    collectedDays,
    collectableDays,
    collectableAmount,
    collectedAmount,
    machine: m || null,
    daysElapsed,
    daysLeft,
    earned,
    remaining,
    progress: p.durationDays ? Math.round((daysElapsed / Number(p.durationDays)) * 100) : 0,
  };
}

app.get('/api/purchases', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const [list, ms] = await Promise.all([pgDb.getPurchasesByUser(req.user.id), pgDb.getMachines()]);
      return res.json(list.map(p => enrichPurchaseFromMachines(p, ms)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')));
    }
    const db = readDb();
    const list = db.purchases
      .filter(p => p.userId === req.user.id)
      .map(p => enrichPurchase(p, db))
      .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    res.json(list);
  } catch (e) { console.error('purchases list error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.get('/api/purchases/:id', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const p = await pgDb.getPurchaseById(req.params.id);
      if (!p || p.userId !== req.user.id) return res.status(404).json({ error: 'Achat introuvable' });
      const ms = await pgDb.getMachines();
      return res.json(enrichPurchaseFromMachines(p, ms));
    }
    const db = readDb();
    const p = db.purchases.find(x => x.id === req.params.id && x.userId === req.user.id);
    if (!p) return res.status(404).json({ error: 'Achat introuvable' });
    res.json(enrichPurchase(p, db));
  } catch (e) { console.error('purchase detail error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.post('/api/purchases', authRequired, async (req, res) => {
  try {
    const { machineId } = req.body || {};
    const db0 = readDb();
    const ms = getMachines(db0);
    const m = ms.find(x => x.id === machineId);
    if (!m) return res.status(404).json({ error: 'Machine introuvable' });
    if (m.locked) return res.status(400).json({ error: 'Machine verrouillée' });

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT id, balance, referred_by FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable' }); }
        const buyer = uRes.rows[0];
        const pendingDep = await client.query(`SELECT 1 FROM transactions WHERE user_id=$1 AND type='deposit' AND status='pending' LIMIT 1`, [req.user.id]);
        if (pendingDep.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Vous avez un dépôt en attente de confirmation. Achat impossible tant que le dépôt n’est pas confirmé par l’admin.' }); }
        if (Number(buyer.balance || 0) < Number(m.priceFcfa)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Solde insuffisant' }); }
        const recent = await client.query(`SELECT 1 FROM purchases WHERE user_id=$1 AND machine_id=$2 AND created_at > NOW() - INTERVAL '30 seconds' LIMIT 1`, [req.user.id, m.id]);
        if (recent.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Achat déjà en cours/enregistré, veuillez patienter' }); }

        const nowIso = new Date().toISOString();
        const purchaseId = uid('pur');
        await client.query('UPDATE users SET balance = balance - $1, updated_at=NOW() WHERE id=$2', [Number(m.priceFcfa), req.user.id]);
        await client.query(`INSERT INTO purchases (id,user_id,machine_id,amount,daily_revenue,duration_days,total_revenue,status,created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8)`,
          [purchaseId, req.user.id, m.id, Number(m.priceFcfa), Number(m.dailyRevenueFcfa), Number(m.durationDays), Number(m.dailyRevenueFcfa) * Number(m.durationDays), nowIso]);
        await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,label,created_at,updated_at)
          VALUES ($1,$2,'purchase',$3,'confirmed',$4,$5,NOW())`,
          [uid('tx'), req.user.id, -Number(m.priceFcfa), `Achat ${m.name}`, nowIso]);
        await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at)
          VALUES ($1,$2,$3,$4,'purchase',false,$5)`,
          [uid('ntf'), req.user.id, 'Machine activée', `${m.name} a été activée avec succès.`, nowIso]);

        // referral commissions 27/3/1%
        const rates = [0.27, 0.03, 0.01];
        let refId = buyer.referred_by || null;
        for (let level = 1; level <= 3 && refId; level++) {
          const refRes = await client.query('SELECT id, referred_by FROM users WHERE id=$1 FOR UPDATE', [refId]);
          if (!refRes.rows.length) break;
          const refUser = refRes.rows[0];
          const exists = await client.query(`SELECT 1 FROM transactions WHERE type='commission' AND source_purchase_id=$1 AND level=$2 LIMIT 1`, [purchaseId, level]);
          if (!exists.rowCount) {
            const amount = Math.round(Number(m.priceFcfa) * rates[level - 1]);
            if (amount > 0) {
              await client.query('UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2', [amount, refUser.id]);
              const pct = Math.round(rates[level - 1] * 100);
              await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,level,source_purchase_id,label,created_at,updated_at)
                VALUES ($1,$2,'commission',$3,'confirmed',$4,$5,$6,$7,NOW())`,
                [uid('tx'), refUser.id, amount, level, purchaseId, `Commission parrainage N${level}`, nowIso]);
              await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at)
                VALUES ($1,$2,'Commission reçue',$3,'wallet',false,$4)`,
                [uid('ntf'), refUser.id, `Une personne que vous avez invitée (niveau ${level}, ${pct}%) a acheté une machine. Vous recevez ${amount.toLocaleString('fr-FR')} FCFA, ajoutés à votre solde.`, nowIso]);
            }
          }
          refId = refUser.referred_by || null;
        }

        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.id);
        const purchase = (db.purchases || []).find(p => p.id === purchaseId);
        return res.json({ balance: user?.balance ?? 0, purchase: purchase ? enrichPurchase(purchase, db) : { id: purchaseId } });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const hasPendingDeposit = (db.transactions || []).some(t => t.userId === user.id && t.type === 'deposit' && t.status === 'pending');
    if (hasPendingDeposit) return res.status(400).json({ error: 'Vous avez un dépôt en attente de confirmation. Achat impossible tant que le dépôt n’est pas confirmé par l’admin.' });
    if ((user.balance || 0) < m.priceFcfa) return res.status(400).json({ error: 'Solde insuffisant' });
    const recent = db.purchases.find(p => p.userId === user.id && p.machineId === m.id && (Date.now() - new Date(p.createdAt).getTime()) < 30000);
    if (recent) return res.status(400).json({ error: 'Achat déjà en cours/enregistré, veuillez patienter' });
    user.balance -= m.priceFcfa;
    const purchase = {
      id: uid('pur'),
      userId: user.id,
      machineId: m.id,
      amount: m.priceFcfa,
      dailyRevenue: m.dailyRevenueFcfa,
      durationDays: m.durationDays,
      totalRevenue: m.dailyRevenueFcfa * m.durationDays,
      status: 'active',
      collectedDays: 0,
      createdAt: new Date().toISOString(),
    };
    db.purchases.push(purchase);
    db.transactions.push({ id: uid('tx'), userId: user.id, type: 'purchase', amount: -m.priceFcfa, status: 'confirmed', label: `Achat ${m.name}`, createdAt: new Date().toISOString() });
    db.notifications.push({ id: uid('ntf'), userId: user.id, title: 'Machine activée', text: `${m.name} a été activée avec succès.`, type: 'purchase', read: false, createdAt: new Date().toISOString() });
    creditReferralCommissionsForPurchase(db, purchase, user);
    writeDb(db);
    res.json({ balance: user.balance, purchase });
  } catch (e) {
    console.error('purchase error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Notifications
app.get('/api/notifications', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) return res.json(await pgDb.getNotificationsByUser(req.user.id));
    const db = readDb();
    const list = db.notifications.filter(n => n.userId === req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    res.json(list);
  } catch (e) { console.error('notifications list error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});
app.post('/api/notifications/read-all', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      await pgDb.markAllNotificationsRead(req.user.id);
      try { await initDb(); } catch {}
      return res.json({ ok: true });
    }
    const db = readDb();
    db.notifications.forEach(n => { if (n.userId === req.user.id) n.read = true; });
    writeDb(db);
    res.json({ ok: true });
  } catch (e) {
    console.error('notifications read-all error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
app.post('/api/notifications/:id/read', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const ok = await pgDb.markNotificationRead(req.user.id, req.params.id);
      if (!ok) return res.status(404).json({ error: 'Notification introuvable' });
      try { await initDb(); } catch {}
      return res.json({ ok: true });
    }
    const db = readDb();
    const n = (db.notifications || []).find(x => x.id === req.params.id && x.userId === req.user.id);
    if (!n) return res.status(404).json({ error: 'Notification introuvable' });
    n.read = true;
    writeDb(db);
    res.json({ ok: true });
  } catch (e) {
    console.error('notification read error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Referral
app.get('/api/referral', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const data = await pgDb.getReferralData(req.user.id);
      if (!data) return res.status(404).json({ error: 'Utilisateur introuvable' });
      const { user, levelsUsers, commissions, totalEarned } = data;
      const [direct, level2, level3] = levelsUsers;
      const ratesPct = [27, 3, 1];
      const tiers = [{ count: 3, total: 700 }, { count: 5, total: 1200 }, { count: 10, total: 3000 }, { count: 15, total: 5000 }];
      let inviteBonusTarget = 0;
      for (const t of tiers) if ((direct?.length || 0) >= t.count) inviteBonusTarget = t.total;
      const memberInfo = (u) => ({ id: u.id, memberId: u.memberId || '', username: u.username || 'Utilisateur', phone: u.phone || '', createdAt: u.createdAt || '', vipLevel: Number(u.vipLevel || 0) });
      return res.json({
        code: user.inviteCode,
        link: `${APP_BASE_URL}/invite/${user.inviteCode || ''}`,
        totalEarned,
        inviteBonus: { directCount: direct.length, awarded: Number(user.inviteBonusAwarded || 0), target: inviteBonusTarget, tiers },
        levels: [
          { level: 1, count: direct.length, commission: Math.round(commissions[0] || 0), rate: ratesPct[0], members: direct.map(memberInfo) },
          { level: 2, count: level2.length, commission: Math.round(commissions[1] || 0), rate: ratesPct[1], members: level2.map(memberInfo) },
          { level: 3, count: level3.length, commission: Math.round(commissions[2] || 0), rate: ratesPct[2], members: level3.map(memberInfo) },
        ],
        teams: [
          { name: 'Équipe A', count: direct.length },
          { name: 'Équipe B', count: level2.length },
          { name: 'Équipe C', count: level3.length },
        ],
      });
    }
    const db = readDb();
    res.json(calcReferral(db, req.user.id));
  } catch (e) { console.error('referral error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

// Admin
app.post('/api/admin/login', (req, res) => {
  const { phone, password } = req.body || {};
  const db = readDb();
  const creds = getAdminCreds(db);
  if (String(phone) !== String(creds.phone) || String(password) !== String(creds.password)) {
    return res.status(401).json({ error: 'Identifiants admin invalides' });
  }
  res.json({ token: signAdmin(creds.phone), admin: { phone: creds.phone, role: 'admin' } });
});

async function sendRecoveryEmail(to, code) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !to) return { sent: false, reason: 'SMTP non configuré ou email admin manquant' };
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({
    from,
    to,
    subject: 'Code de récupération FITZONE Admin',
    text: `Votre code de récupération admin FITZONE est : ${code}\nCe code expire dans 15 minutes.`,
  });
  return { sent: true };
}

app.post('/api/admin/recover/request', async (req, res) => {
  const db = readDb();
  const creds = getAdminCreds(db);
  if (!creds.email) return res.status(400).json({ error: 'Aucun email de récupération configuré pour l’admin. Configurez-le dans les paramètres (ou via la base/env).' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.adminRecovery = { code, email: creds.email, expiresAt: Date.now() + 15 * 60 * 1000 };
  writeDb(db);
  try {
    const out = await sendRecoveryEmail(creds.email, code);
    if (out.sent) return res.json({ ok: true, message: `Code envoyé à ${creds.email}` });
    // fallback if SMTP not configured
    return res.json({ ok: true, message: 'SMTP non configuré. Code de récupération (mode secours) affiché.', devCode: code });
  } catch (e) {
    return res.json({ ok: true, message: 'Envoi email échoué, code de secours affiché.', devCode: code });
  }
});

app.post('/api/admin/recover/reset', (req, res) => {
  const { code, phone, password, email } = req.body || {};
  const db = readDb();
  const rec = db.adminRecovery;
  if (!rec || !rec.code || Date.now() > rec.expiresAt) return res.status(400).json({ error: 'Code invalide ou expiré' });
  if (String(code) !== String(rec.code)) return res.status(400).json({ error: 'Code incorrect' });
  if (!phone || !password) return res.status(400).json({ error: 'Nouvel identifiant et mot de passe requis' });
  const s = getSettings(db);
  s.adminPhone = String(phone);
  s.adminPassword = String(password);
  if (email) s.adminEmail = String(email);
  db.settings = s;
  delete db.adminRecovery;
  logAdmin(db, req, 'admin.credentials_reset', { phone: s.adminPhone });
  writeDb(db);
  res.json({ ok: true, message: 'Identifiants admin mis à jour. Vous pouvez vous connecter.' });
});

function dayKey(d) { return new Date(d).toISOString().slice(0,10); }
function weekKey(d) {
  const dt = new Date(d); const day = (dt.getUTCDay()+6)%7; dt.setUTCDate(dt.getUTCDate()-day);
  return dt.toISOString().slice(0,10);
}
function aggregateBy(txs, keyFn) {
  const map = {};
  for (const t of txs) {
    const k = keyFn(t.createdAt || Date.now());
    if (!map[k]) map[k] = { period: k, count: 0, total: 0 };
    map[k].count += 1; map[k].total += Number(t.amount || 0);
  }
  return Object.values(map).sort((a,b)=>a.period.localeCompare(b.period));
}

app.get('/api/admin/stats', adminRequired, async (req, res) => {
  try {
    const period = req.query.period === 'week' ? 'week' : 'day';
    if (usingPostgres()) {
      const pool = getPool();
      const [uCount, onlineCount, pCount, tCount, depTot, wdTot, wdPend, depPend, depRows, wdRows] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS c FROM users'),
        pool.query("SELECT COUNT(*)::int AS c FROM users WHERE last_active_at > NOW() - INTERVAL '10 minutes'"),
        pool.query('SELECT COUNT(*)::int AS c FROM purchases'),
        pool.query('SELECT COUNT(*)::int AS c FROM transactions'),
        pool.query("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE type='deposit' AND status <> 'rejected'"),
        pool.query("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE type='withdraw' AND status <> 'rejected'"),
        pool.query("SELECT COUNT(*)::int AS c FROM transactions WHERE type='withdraw' AND status='pending'"),
        pool.query("SELECT COUNT(*)::int AS c FROM transactions WHERE type='deposit' AND status='pending'"),
        pool.query("SELECT amount, created_at FROM transactions WHERE type='deposit' AND status <> 'rejected'"),
        pool.query("SELECT amount, created_at FROM transactions WHERE type='withdraw' AND status <> 'rejected'"),
      ]);
      const toIso = (v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());
      const depTxs = depRows.rows.map(r => ({ amount: Number(r.amount||0), createdAt: toIso(r.created_at) }));
      const wdTxs = wdRows.rows.map(r => ({ amount: Number(r.amount||0), createdAt: toIso(r.created_at) }));
      const keyFn = period === 'week' ? weekKey : dayKey;
      return res.json({
        users: Number(uCount.rows[0]?.c || 0),
        usersOnline: Number(onlineCount.rows[0]?.c || 0),
        purchases: Number(pCount.rows[0]?.c || 0),
        transactions: Number(tCount.rows[0]?.c || 0),
        depositsTotal: Number(depTot.rows[0]?.s || 0),
        withdrawalsTotal: Number(wdTot.rows[0]?.s || 0),
        withdrawalsPending: Number(wdPend.rows[0]?.c || 0),
        depositsPending: Number(depPend.rows[0]?.c || 0),
        period,
        depositsByPeriod: aggregateBy(depTxs, keyFn),
        withdrawalsByPeriod: aggregateBy(wdTxs, keyFn),
      });
    }

    const db = readDb();
    const deposits = db.transactions.filter(t => t.type === 'deposit' && t.status !== 'rejected');
    const withdrawals = db.transactions.filter(t => t.type === 'withdraw' && t.status !== 'rejected');
    const keyFn = period === 'week' ? weekKey : dayKey;
    const now = Date.now();
    const online = db.users.filter(u => u.lastActiveAt && (now - new Date(u.lastActiveAt).getTime()) < 10 * 60 * 1000).length;
    res.json({
      users: db.users.length,
      usersOnline: online,
      purchases: db.purchases.length,
      transactions: db.transactions.length,
      depositsTotal: deposits.reduce((s, t) => s + (t.amount || 0), 0),
      withdrawalsTotal: withdrawals.reduce((s, t) => s + (t.amount || 0), 0),
      withdrawalsPending: db.transactions.filter(t => t.type === 'withdraw' && t.status === 'pending').length,
      depositsPending: db.transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length,
      period,
      depositsByPeriod: aggregateBy(deposits, keyFn),
      withdrawalsByPeriod: aggregateBy(withdrawals, keyFn),
    });
  } catch (e) {
    console.error('admin stats error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/settings', async (_req, res) => {
  try {
    let s;
    if (usingPostgres()) {
      const map = await pgDb.getSettings();
      s = getSettings({ settings: map || {} });
    } else {
      const db = readDb();
      s = getSettings(db);
    }
    res.json({
      supportTelegram: s.supportTelegram,
      depositNumber: s.depositNumber,
      merchantCode: s.merchantCode,
      minWithdraw: s.minWithdraw,
      maxWithdraw: s.maxWithdraw,
      withdrawFeePercent: s.withdrawFeePercent,
      minDeposit: s.minDeposit,
      maxDeposit: s.maxDeposit,
      depositPresets: s.depositPresets,
      withdrawPresets: s.withdrawPresets,
      appBaseUrl: APP_BASE_URL,
    });
  } catch (e) {
    console.error('settings error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/settings', adminRequired, async (_req, res) => {
  try {
    if (usingPostgres()) {
      const map = await pgDb.getSettings();
      return res.json(getSettings({ settings: map || {} }));
    }
    const db = readDb();
    res.json(getSettings(db));
  } catch (e) {
    console.error('admin settings error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.patch('/api/admin/settings', adminRequired, async (req, res) => {
  try {
    const b = req.body || {};
    const db0 = readDb();
    const s = getSettings(db0);
    const allowed = ['supportTelegram','depositNumber','merchantCode','minWithdraw','maxWithdraw','withdrawFeePercent','minDeposit','maxDeposit','depositPresets','withdrawPresets','adminPhone','adminPassword','adminEmail'];
    for (const k of allowed) if (b[k] !== undefined) s[k] = b[k];
    s.minWithdraw = Number(s.minWithdraw) || 0; s.maxWithdraw = Number(s.maxWithdraw) || 0; s.withdrawFeePercent = Number(s.withdrawFeePercent) || 0;
    s.minDeposit = Number(s.minDeposit) || 0; s.maxDeposit = Number(s.maxDeposit) || 0;
    if (typeof s.depositPresets === 'string') s.depositPresets = s.depositPresets.split(',').map(x=>Number(x.trim())).filter(n=>n>0);
    if (typeof s.withdrawPresets === 'string') s.withdrawPresets = s.withdrawPresets.split(',').map(x=>Number(x.trim())).filter(n=>n>0);
    if (!Array.isArray(s.depositPresets)) s.depositPresets = [];
    if (!Array.isArray(s.withdrawPresets)) s.withdrawPresets = [];

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const [k,v] of Object.entries(s)){
          await client.query(`INSERT INTO settings (key,value,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()`,[k, JSON.stringify(v)]);
        }
        await client.query('INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,NOW())',[uid('log'),'settings.update', JSON.stringify({ keys: Object.keys(b) }), (req.admin?.phone||'admin')]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        return res.json(getSettings(readDb()));
      } catch (e) { try { await client.query('ROLLBACK'); } catch {} throw e; }
      finally { client.release(); }
    }

    const db = readDb();
    db.settings = s;
    logAdmin(db, req, 'settings.update', { keys: Object.keys(b) });
    writeDb(db);
    res.json(getSettings(db));
  } catch (e) {
    console.error('admin settings update error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/audit', adminRequired, async (_req, res) => {
  try {
    if (usingPostgres()) {
      const logs = await pgDb.getAuditLogs(300);
      return res.json(logs);
    }
    const db = readDb();
    const logs = [...(db.auditLogs || [])].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    res.json(logs.slice(0, 300));
  } catch (e) {
    console.error('admin audit error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/referrals', adminRequired, async (_req, res) => {
  try {
    if (usingPostgres()) {
      const users = await pgDb.getAllUsers();
      const list = await Promise.all(users.map(async (u) => {
        const data = await pgDb.getReferralData(u.id);
        const r = data ? {
          code: u.inviteCode,
          levels: [
            { level: 1, count: data.levelsUsers[0].length, commission: Math.round(data.commissions[0] || 0) },
            { level: 2, count: data.levelsUsers[1].length, commission: Math.round(data.commissions[1] || 0) },
            { level: 3, count: data.levelsUsers[2].length, commission: Math.round(data.commissions[2] || 0) },
          ]
        } : { levels: [{commission:0,count:0},{commission:0,count:0},{commission:0,count:0}] };
        const totalCommission = r.levels.reduce((s,l)=>s+l.commission,0);
        const totalTeam = r.levels.reduce((s,l)=>s+l.count,0);
        const directUsers = data ? data.levelsUsers[0] : [];
        const direct = directUsers.map(x => ({ id:x.id, memberId:x.memberId, phone:x.phone, username:x.username }));
        const ref = u.referredBy ? users.find(x => x.id === u.referredBy) : null;
        const referrer = ref ? { id: ref.id, memberId: ref.memberId, phone: ref.phone, username: ref.username } : null;
        return { id: u.id, memberId: u.memberId, phone: u.phone, username: u.username, inviteCode: u.inviteCode, totalTeam, totalCommission, levels: r.levels, directReferrals: direct, referrer };
      }));
      list.sort((a,b)=>b.totalCommission-a.totalCommission || b.totalTeam-a.totalTeam);
      return res.json(list);
    }
    const db = readDb();
    const list = db.users.map(u => {
      const r = calcReferral(db, u.id);
      const totalCommission = r.levels.reduce((s,l)=>s+l.commission,0);
      const totalTeam = r.levels.reduce((s,l)=>s+l.count,0);
      const direct = db.users.filter(x => x.referredBy === u.id).map(x => ({ id:x.id, memberId:x.memberId, phone:x.phone, username:x.username }));
      const referrer = u.referredBy ? (()=>{ const p=db.users.find(x=>x.id===u.referredBy); return p?{id:p.id,memberId:p.memberId,phone:p.phone,username:p.username}:null; })() : null;
      return { id: u.id, memberId: u.memberId, phone: u.phone, username: u.username, inviteCode: u.inviteCode, totalTeam, totalCommission, levels: r.levels, directReferrals: direct, referrer };
    }).sort((a,b)=>b.totalCommission-a.totalCommission || b.totalTeam-a.totalTeam);
    res.json(list);
  } catch (e) { console.error('admin referrals error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.get('/api/admin/users', adminRequired, async (_req, res) => {
  try {
    if (usingPostgres()) {
      const users = await pgDb.getAllUsers();
      const [bonusMap, vipMap] = await Promise.all([pgDb.getBonusTotalsMap(), pgDb.getVipLevelsMap()]);
      return res.json(users.map(u => {
        const { passwordHash, ...rest } = u;
        const bonus = bonusMap.get(u.id) ?? Math.round(Number(u.bonusTotal ?? u.bonus ?? 0));
        const vipLevel = vipMap.get(u.id) ?? Number(u.vipLevel || 0);
        return { ...rest, bonus, vipLevel };
      }));
    }
    const db = readDb();
    res.json(db.users.map(u => adminPublicUser(db, u)));
    writeDb(db);
  } catch (e) { console.error('admin users error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.get('/api/admin/transactions', adminRequired, async (req, res) => {
  try {
    const { type, status } = req.query || {};
    if (usingPostgres()) {
      const [list, users] = await Promise.all([pgDb.getAllTransactions({ type, status }), pgDb.getAllUsers()]);
      const [bonusMap, vipMap] = await Promise.all([pgDb.getBonusTotalsMap(), pgDb.getVipLevelsMap()]);
      const byId = new Map(users.map(u => [u.id, u]));
      const shape = (u) => {
        if (!u) return null;
        const { passwordHash, ...rest } = u;
        return { ...rest, bonus: bonusMap.get(u.id) ?? Math.round(Number(u.bonusTotal ?? u.bonus ?? 0)), vipLevel: vipMap.get(u.id) ?? Number(u.vipLevel || 0) };
      };
      const enriched = list.map(t => {
        const u = byId.get(t.userId);
        const ref = u?.referredBy ? byId.get(u.referredBy) : null;
        return { ...t, user: u ? shape(u) : { id: t.userId }, referrer: ref ? shape(ref) : null };
      });
      return res.json(enriched.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')));
    }
    const db = readDb();
    let list = [...db.transactions];
    if (type) list = list.filter(t => t.type === type);
    if (status) list = list.filter(t => t.status === status);
    const enriched = list.map(t => {
      const u = db.users.find(x=>x.id===t.userId);
      const referrer = u?.referredBy ? db.users.find(x=>x.id===u.referredBy) : null;
      return { ...t, user: u ? adminPublicUser(db, u) : { id: t.userId }, referrer: referrer ? adminPublicUser(db, referrer) : null };
    });
    res.json(enriched.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')));
  } catch (e) { console.error('admin transactions error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.get('/api/admin/purchases', adminRequired, async (_req, res) => {
  try {
    if (usingPostgres()) {
      const [purchases, users, ms] = await Promise.all([pgDb.getAllPurchases(), pgDb.getAllUsers(), pgDb.getMachines()]);
      const [bonusMap, vipMap] = await Promise.all([pgDb.getBonusTotalsMap(), pgDb.getVipLevelsMap()]);
      const byId = new Map(users.map(u => [u.id, u]));
      const shape = (u) => {
        if (!u) return null;
        const { passwordHash, ...rest } = u;
        return { ...rest, bonus: bonusMap.get(u.id) ?? Math.round(Number(u.bonusTotal ?? u.bonus ?? 0)), vipLevel: vipMap.get(u.id) ?? Number(u.vipLevel || 0) };
      };
      const list = purchases.map(p => {
        const u = byId.get(p.userId);
        const ref = u?.referredBy ? byId.get(u.referredBy) : null;
        return { ...p, machine: ms.find(m => m.id === p.machineId) || null, user: u ? shape(u) : { id: p.userId }, referrer: ref ? shape(ref) : null };
      });
      return res.json(list.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')));
    }
    const db = readDb();
    const ms = getMachines(db);
    const list = db.purchases.map(p => {
      const u = db.users.find(x=>x.id===p.userId);
      const referrer = u?.referredBy ? db.users.find(x=>x.id===u.referredBy) : null;
      return { ...p, machine: ms.find(m => m.id === p.machineId) || null, user: u ? adminPublicUser(db, u) : { id: p.userId }, referrer: referrer ? adminPublicUser(db, referrer) : null };
    });
    res.json(list.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')));
  } catch (e) { console.error('admin purchases error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.patch('/api/admin/transactions/:id', adminRequired, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending','confirmed','rejected'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });

    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tRes = await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id]);
        if (!tRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Transaction introuvable' }); }
        const tx = tRes.rows[0];
        if (!['deposit','withdraw'].includes(tx.type)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Action non supportée pour ce type' }); }
        // Règles: dépôt crédité au solde dès la soumission (pending) -> confirmation débloque l'achat, pas de recrédit.
        // Retrait débité à la demande -> rejet sans remboursement.
        await client.query('UPDATE transactions SET status=$1, updated_at=NOW() WHERE id=$2', [status, tx.id]);

        // audit log
        const logId = uid('log');
        await client.query('INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,NOW())', [logId, 'transaction.update', JSON.stringify({ id: tx.id, type: tx.type, status }), (req.admin?.phone || 'admin')]);

        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const outTx = (db.transactions || []).find(t => t.id === tx.id) || { ...tx, status };
        const txUser = db.users.find(u=>u.id===tx.user_id);
        return res.json({ ...outTx, user: txUser ? adminPublicUser(db, txUser) : { id: tx.user_id } });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally { client.release(); }
    }

    const db = readDb();
    const tx = db.transactions.find(t => t.id === req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction introuvable' });
    if (!['deposit','withdraw'].includes(tx.type)) return res.status(400).json({ error: 'Action non supportée pour ce type' });
    // pas de remboursement en cas de rejet de retrait
    if (tx.type === 'deposit' && tx.status === 'pending' && status === 'confirmed') {
      // solde déjà crédité à la soumission du dépôt; la confirmation admin valide le dépôt (débloque les achats)
    }
    tx.status = status;
    logAdmin(db, req, 'transaction.update', { id: tx.id, type: tx.type, status });
    writeDb(db);
    const txUser = db.users.find(u=>u.id===tx.userId);
    res.json({ ...tx, user: txUser ? adminPublicUser(db, txUser) : { id: tx.userId } });
  } catch (e) {
    console.error('admin tx update error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/transactions/:id', adminRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const tx = await pgDb.getTransactionById(req.params.id);
      if (!tx) return res.status(404).json({ error: 'Transaction introuvable' });
      const [bonusMap, vipMap] = await Promise.all([pgDb.getBonusTotalsMap(), pgDb.getVipLevelsMap()]);
      const u = tx.userId ? await pgDb.getUserById(tx.userId) : null;
      const shape = (u) => {
        if (!u) return null;
        const { passwordHash, ...rest } = u;
        return { ...rest, bonus: bonusMap.get(u.id) ?? Math.round(Number(u.bonusTotal ?? u.bonus ?? 0)), vipLevel: vipMap.get(u.id) ?? Number(u.vipLevel || 0) };
      };
      return res.json({ ...tx, user: u ? shape(u) : { id: tx.userId } });
    }
    const db = readDb();
    const tx = db.transactions.find(t => t.id === req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction introuvable' });
    const txUser = db.users.find(u=>u.id===tx.userId);
    res.json({ ...tx, user: txUser ? adminPublicUser(db, txUser) : { id: tx.userId } });
  } catch (e) { console.error('admin tx detail error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.get('/api/admin/users/:id', adminRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const u = await pgDb.getUserById(req.params.id);
      if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
      const [direct, txs, purchases, ms, bonusMap, vipMap, refData] = await Promise.all([
        pgDb.getUsersByReferrer(u.id),
        pgDb.getTransactionsByUser(u.id),
        pgDb.getPurchasesByUser(u.id),
        pgDb.getMachines(),
        pgDb.getBonusTotalsMap(),
        pgDb.getVipLevelsMap(),
        pgDb.getReferralData(u.id),
      ]);
      const shape = (x) => {
        if (!x) return null;
        const { passwordHash, ...rest } = x;
        return { ...rest, bonus: bonusMap.get(x.id) ?? Math.round(Number(x.bonusTotal ?? x.bonus ?? 0)), vipLevel: vipMap.get(x.id) ?? Number(x.vipLevel || 0) };
      };
      const refUser = u.referredBy ? await pgDb.getUserById(u.referredBy) : null;
      const tiers = [{ count: 3, total: 700 }, { count: 5, total: 1200 }, { count: 10, total: 3000 }, { count: 15, total: 5000 }];
      let inviteBonusTarget = 0;
      const directCount = direct.length;
      for (const t of tiers) if (directCount >= t.count) inviteBonusTarget = t.total;
      const memberInfo = (m) => ({ id: m.id, memberId: m.memberId || '', username: m.username || 'Utilisateur', phone: m.phone || '', createdAt: m.createdAt || '', vipLevel: vipMap.get(m.id) ?? Number(m.vipLevel || 0) });
      const referral = refData ? {
        code: u.inviteCode,
        link: `${APP_BASE_URL}/invite/${u.inviteCode || ''}`,
        totalEarned: refData.totalEarned,
        inviteBonus: { directCount, awarded: Number(u.inviteBonusAwarded || 0), target: inviteBonusTarget, tiers },
        levels: [
          { level: 1, count: refData.levelsUsers[0].length, commission: Math.round(refData.commissions[0] || 0), rate: 27, members: refData.levelsUsers[0].map(memberInfo) },
          { level: 2, count: refData.levelsUsers[1].length, commission: Math.round(refData.commissions[1] || 0), rate: 3, members: refData.levelsUsers[1].map(memberInfo) },
          { level: 3, count: refData.levelsUsers[2].length, commission: Math.round(refData.commissions[2] || 0), rate: 1, members: refData.levelsUsers[2].map(memberInfo) },
        ],
        teams: [
          { name: 'Équipe A', count: refData.levelsUsers[0].length },
          { name: 'Équipe B', count: refData.levelsUsers[1].length },
          { name: 'Équipe C', count: refData.levelsUsers[2].length },
        ],
      } : calcReferral(readDb(), u.id);
      const shapedPurchases = purchases.map(p => enrichPurchaseFromMachines(p, ms));
      const view = {
        ...shape(u),
        referrer: refUser ? shape(refUser) : (u.referredBy ? { id: u.referredBy } : null),
        directReferrals: direct.map(shape),
        referral,
        transactions: txs.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')),
        purchases: shapedPurchases,
      };
      return res.json(view);
    }
    const db = readDb();
    const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const direct = db.users.filter(x => x.referredBy === u.id).map(x => adminPublicUser(db, x));
    const refUser = u.referredBy ? db.users.find(x => x.id === u.referredBy) : null;
    const referrer = refUser ? adminPublicUser(db, refUser) : (u.referredBy ? { id: u.referredBy } : null);
    const txs = db.transactions.filter(t => t.userId === u.id).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    const purchases = db.purchases.filter(p => p.userId === u.id);
    const view = { ...adminPublicUser(db, u), referrer, directReferrals: direct, referral: calcReferral(db, u.id), transactions: txs, purchases };
    writeDb(db);
    res.json(view);
  } catch (e) { console.error('admin user detail error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});

app.patch('/api/admin/users/:id', adminRequired, async (req, res) => {
  try {
    const { username, balance } = req.body || {};
    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uRes = await client.query('SELECT id,balance FROM users WHERE id=$1 FOR UPDATE', [req.params.id]);
        if (!uRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable' }); }
        const changed = [];
        if (username !== undefined) {
          await client.query('UPDATE users SET username=$1, updated_at=NOW() WHERE id=$2', [String(username).trim().slice(0,30), req.params.id]);
          changed.push('username');
        }
        if (balance !== undefined) {
          const target = Number(balance);
          if (!Number.isFinite(target) || target < 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Solde invalide' }); }
          const current = Number(uRes.rows[0].balance || 0);
          const delta = Math.round((target - current) * 100) / 100;
          if (delta !== 0) {
            await client.query('UPDATE users SET balance=$1, updated_at=NOW() WHERE id=$2', [target, req.params.id]);
            await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,label,created_at,updated_at) VALUES ($1,$2,'adjustment',$3,'confirmed','Ajustement admin (solde)',$4,NOW())`, [uid('tx'), req.params.id, delta, new Date().toISOString()]);
            changed.push('balance');
          }
        }
        await client.query('INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,NOW())',[uid('log'),'user.update', JSON.stringify({ id: req.params.id, fields: changed }), (req.admin?.phone||'admin')]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const u = db.users.find(x => x.id === req.params.id);
        return res.json(u ? adminPublicUser(db, u) : { id: req.params.id });
      } catch (e) { try { await client.query('ROLLBACK'); } catch {} throw e; }
      finally { client.release(); }
    }

    const db = readDb();
    const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const changed = [];
    if (username !== undefined) { u.username = String(username).trim().slice(0, 30); changed.push('username'); }
    if (balance !== undefined) {
      const target = Number(balance);
      if (!Number.isFinite(target) || target < 0) return res.status(400).json({ error: 'Solde invalide' });
      const current = Number(u.balance || 0);
      const delta = Math.round((target - current) * 100) / 100;
      if (delta !== 0) {
        u.balance = target;
        db.transactions = db.transactions || [];
        db.transactions.push({ id: uid('tx'), userId: u.id, type: 'adjustment', amount: delta, status: 'confirmed', label: 'Ajustement admin (solde)', createdAt: new Date().toISOString() });
        changed.push('balance');
      }
    }
    u.bonus = computeBonusTotal(db, u.id);
    logAdmin(db, req, 'user.update', { id: u.id, fields: changed });
    writeDb(db);
    res.json(adminPublicUser(db, u));
  } catch (e) {
    console.error('admin user update error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/machines', adminRequired, async (_req, res) => {
  try {
    if (usingPostgres()) {
      const ms = await pgDb.getMachines();
      return res.json(ms);
    }
    const db = readDb();
    res.json(getMachines(db));
  } catch (e) {
    console.error('admin machines error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/machines', adminRequired, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Nom requis' });
    const m = {
      id: b.id || uid('m'),
      name: String(b.name),
      category: String(b.category || ''),
      level: String(b.level || ''),
      priceFcfa: Number(b.priceFcfa || 0),
      dailyRevenueFcfa: Number(b.dailyRevenueFcfa || 0),
      durationDays: Number(b.durationDays || 90),
      description: String(b.description || ''),
      image: String(b.image || ''),
      imageCredit: String(b.imageCredit || ''),
      locked: !!b.locked,
    };
    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ordRes = await client.query('SELECT COALESCE(MAX(sort_order), -1) AS m FROM machines');
        const sortOrder = Number(ordRes.rows[0]?.m ?? -1) + 1;
        await client.query(`INSERT INTO machines (id,name,category,level,price_fcfa,daily_revenue_fcfa,duration_days,description,image,image_credit,locked,sort_order,created_at,updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
          [m.id,m.name,m.category,m.level,m.priceFcfa,m.dailyRevenueFcfa,m.durationDays,m.description,m.image,m.imageCredit,m.locked,sortOrder]);
        await client.query('INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,NOW())',[uid('log'),'machine.create', JSON.stringify({ id: m.id, name: m.name }), (req.admin?.phone||'admin')]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        return res.json(m);
      } catch (e) { try { await client.query('ROLLBACK'); } catch {} throw e; }
      finally { client.release(); }
    }
    const db = readDb();
    const ms = getMachines(db);
    ms.push(m); db.machines = ms; logAdmin(db, req, 'machine.create', { id: m.id, name: m.name }); writeDb(db);
    res.json(m);
  } catch (e) {
    console.error('admin machine create error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/machines/:id', adminRequired, async (req, res) => {
  try {
    const b = req.body || {};
    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ex = await client.query('SELECT * FROM machines WHERE id=$1 FOR UPDATE', [req.params.id]);
        if (!ex.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Machine introuvable' }); }
        const cur = ex.rows[0];
        const next = {
          name: b.name !== undefined ? String(b.name) : cur.name,
          category: b.category !== undefined ? String(b.category) : cur.category,
          level: b.level !== undefined ? String(b.level) : cur.level,
          priceFcfa: b.priceFcfa !== undefined ? Number(b.priceFcfa) : Number(cur.price_fcfa),
          dailyRevenueFcfa: b.dailyRevenueFcfa !== undefined ? Number(b.dailyRevenueFcfa) : Number(cur.daily_revenue_fcfa),
          durationDays: b.durationDays !== undefined ? Number(b.durationDays) : Number(cur.duration_days),
          description: b.description !== undefined ? String(b.description) : cur.description,
          image: b.image !== undefined ? String(b.image) : cur.image,
          imageCredit: b.imageCredit !== undefined ? String(b.imageCredit) : cur.image_credit,
          locked: b.locked !== undefined ? !!b.locked : !!cur.locked,
        };
        await client.query(`UPDATE machines SET name=$1,category=$2,level=$3,price_fcfa=$4,daily_revenue_fcfa=$5,duration_days=$6,description=$7,image=$8,image_credit=$9,locked=$10,updated_at=NOW() WHERE id=$11`,
          [next.name,next.category,next.level,next.priceFcfa,next.dailyRevenueFcfa,next.durationDays,next.description,next.image,next.imageCredit,next.locked,req.params.id]);
        await client.query('INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,NOW())',[uid('log'),'machine.update', JSON.stringify({ id: req.params.id }), (req.admin?.phone||'admin')]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const m = (getMachines(db)||[]).find(x=>x.id===req.params.id);
        return res.json(m || { id: req.params.id, ...next });
      } catch (e) { try { await client.query('ROLLBACK'); } catch {} throw e; }
      finally { client.release(); }
    }

    const db = readDb();
    const ms = getMachines(db);
    const idx = ms.findIndex(x => x.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Machine introuvable' });
    ms[idx] = { ...ms[idx], ...b, id: ms[idx].id,
      priceFcfa: b.priceFcfa !== undefined ? Number(b.priceFcfa) : ms[idx].priceFcfa,
      dailyRevenueFcfa: b.dailyRevenueFcfa !== undefined ? Number(b.dailyRevenueFcfa) : ms[idx].dailyRevenueFcfa,
      durationDays: b.durationDays !== undefined ? Number(b.durationDays) : ms[idx].durationDays,
      locked: b.locked !== undefined ? !!b.locked : ms[idx].locked,
    };
    db.machines = ms; logAdmin(db, req, 'machine.update', { id: ms[idx].id }); writeDb(db);
    res.json(ms[idx]);
  } catch (e) {
    console.error('admin machine update error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/machines/:id', adminRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const r = await client.query('DELETE FROM machines WHERE id=$1', [req.params.id]);
        if (r.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Machine introuvable' }); }
        await client.query('INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,NOW())',[uid('log'),'machine.delete', JSON.stringify({ id: req.params.id }), (req.admin?.phone||'admin')]);
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        return res.json({ ok: true });
      } catch (e) { try { await client.query('ROLLBACK'); } catch {} throw e; }
      finally { client.release(); }
    }
    const db = readDb();
    let ms = getMachines(db);
    const before = ms.length;
    ms = ms.filter(x => x.id !== req.params.id);
    if (ms.length === before) return res.status(404).json({ error: 'Machine introuvable' });
    db.machines = ms; logAdmin(db, req, 'machine.delete', { id: req.params.id }); writeDb(db);
    res.json({ ok: true });
  } catch (e) {
    console.error('admin machine delete error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/referrals/tree', adminRequired, async (req, res) => {
  try {
    const { userId } = req.query || {};
    if (usingPostgres()) {
      const users = await pgDb.getAllUsers();
      const byRef = new Map();
      for (const u of users) {
        const k = u.referredBy || null;
        if (!byRef.has(k)) byRef.set(k, []);
        byRef.get(k).push(u);
      }
      function node(u, depth = 0, max = 4) {
        const kids = (byRef.get(u.id) || []).map(c => depth < max ? node(c, depth+1, max) : ({ id:c.id, username:c.username, phone:c.phone, memberId:c.memberId, children: [] }));
        return { id: u.id, username: u.username, phone: u.phone, memberId: u.memberId, inviteCode: u.inviteCode, children: kids };
      }
      if (userId) {
        const u = users.find(x => x.id === String(userId));
        if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
        return res.json(node(u));
      }
      const roots = users.filter(u => !u.referredBy).map(u => node(u));
      return res.json(roots);
    }
    const db = readDb();
    function node(u, depth = 0, max = 4) {
      const kids = db.users.filter(x => x.referredBy === u.id).map(c => depth < max ? node(c, depth+1, max) : ({ id:c.id, username:c.username, phone:c.phone, memberId:c.memberId, children: [] }));
      return { id: u.id, username: u.username, phone: u.phone, memberId: u.memberId, inviteCode: u.inviteCode, children: kids };
    }
    if (userId) {
      const u = db.users.find(x => x.id === String(userId));
      if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
      return res.json(node(u));
    }
    const roots = db.users.filter(u => !u.referredBy).map(u => node(u));
    res.json(roots);
  } catch (e) { console.error('admin referrals tree error', e); res.status(500).json({ error: 'Erreur serveur' }); }
});


app.post('/api/purchases/:id/collect', authRequired, async (req, res) => {
  try {
    if (usingPostgres()) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const pRes = await client.query('SELECT * FROM purchases WHERE id=$1 AND user_id=$2 FOR UPDATE', [req.params.id, req.user.id]);
        if (!pRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Produit introuvable' }); }
        const p = pRes.rows[0];
        const daysElapsed = Math.min(Number(p.duration_days||0), Math.max(0, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)));
        for (let d=0; d<daysElapsed; d++) {
          const date = new Date(new Date(p.created_at).getTime() + d*86400000).toISOString().slice(0,10);
          const eid = `me_${p.id}_${date}`;
          await client.query(`INSERT INTO machine_earnings (id,purchase_id,user_id,earning_date,amount,status,created_at)
            VALUES ($1,$2,$3,$4,$5,'available',NOW()) ON CONFLICT (purchase_id,earning_date) DO NOTHING`,
            [eid, p.id, p.user_id, date, Number(p.daily_revenue||0)]);
        }
        const avail = await client.query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*)::int AS days FROM machine_earnings WHERE purchase_id=$1 AND user_id=$2 AND status='available'`, [p.id, req.user.id]);
        const total = Number(avail.rows[0]?.total || 0);
        if (total <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Aucun gain à récolter pour le moment' }); }

        await client.query('UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id=$2', [total, req.user.id]);
        await client.query(`UPDATE machine_earnings SET status='collected', collected_at=NOW() WHERE purchase_id=$1 AND user_id=$2 AND status='available'`, [p.id, req.user.id]);

        const mRes = await client.query('SELECT name FROM machines WHERE id=$1', [p.machine_id]);
        const mName = mRes.rows[0]?.name || 'Machine';
        const txId = uid('tx');
        const nowIso = new Date().toISOString();
        await client.query(`INSERT INTO transactions (id,user_id,type,amount,status,label,created_at,updated_at)
          VALUES ($1,$2,'bonus',$3,'confirmed',$4,$5,NOW())`, [txId, req.user.id, total, `Récolte gains - ${mName}`, nowIso]);
        const ntfId = uid('ntf');
        await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at)
          VALUES ($1,$2,$3,$4,'wallet',false,$5)`, [ntfId, req.user.id, 'Gains récoltés', `Vous avez récolté ${Number(total).toLocaleString('fr-FR')} FCFA.`, nowIso]);
        // update bonus_total approx by recomputing not necessary now; keep in sync via reload
        await client.query('COMMIT');
        try { await initDb(); } catch {}
        const db = readDb();
        const user = db.users.find(u => u.id === req.user.id);
        const pp = db.purchases.find(x => x.id === p.id);
        const tx = (db.transactions || []).find(t => t.id === txId) || { id: txId, userId: req.user.id, type: 'bonus', amount: total, status: 'confirmed', label: `Récolte gains - ${mName}`, createdAt: nowIso };
        return res.json({ balance: user?.balance ?? 0, bonus: computeBonusTotal(db, req.user.id), purchase: pp ? enrichPurchase(pp, db) : null, transaction: tx });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally {
        client.release();
      }
    }

    const db = readDb();
    const p = db.purchases.find(x => x.id === req.params.id && x.userId === req.user.id);
    if (!p) return res.status(404).json({ error: 'Produit introuvable' });
    const ep = enrichPurchase(p, db);
    if (!ep.collectableAmount || ep.collectableAmount <= 0) {
      return res.status(400).json({ error: 'Aucun gain à récolter pour le moment' });
    }
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    user.balance = Number(user.balance || 0) + Number(ep.collectableAmount);
    p.collectedDays = Number(p.collectedDays || 0) + Number(ep.collectableDays);
    const tx = {
      id: uid('tx'),
      userId: user.id,
      type: 'bonus',
      amount: ep.collectableAmount,
      status: 'confirmed',
      label: `Récolte gains - ${ep.machine?.name || 'Machine'}`,
      createdAt: new Date().toISOString(),
    };
    db.transactions.push(tx);
    user.bonus = computeBonusTotal(db, user.id);
    db.notifications.push({
      id: uid('ntf'),
      userId: user.id,
      title: 'Gains récoltés',
      text: `Vous avez récolté ${Number(ep.collectableAmount).toLocaleString('fr-FR')} FCFA.`,
      type: 'wallet',
      read: false,
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
    res.json({ balance: user.balance, bonus: user.bonus, purchase: enrichPurchase(p, db), transaction: tx });
  } catch (e) {
    console.error('collect error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export { app, calcReferral, creditReferralCommissionsForPurchase, getSettings, generateInviteCode, awardInviteMilestones, computeBonusTotal };

const port = process.env.PORT || 4000;
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  initDb().then(() => {
    app.listen(port, () => {
      console.log(`[backend] listening on ${port}`);
    });
  }).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}
