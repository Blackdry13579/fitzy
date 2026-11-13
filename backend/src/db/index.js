import { getPool } from './pg.js';
import * as R from './relational.js';
import { readDb as readState, writeDb as writeState, initDb as initStateDb } from './store.js';

export const isRelational = () => !!getPool();

export async function initDb() {
  // always init state store (for fallback / migration source); if pg, also ensure tables exist (created by user) via a simple check
  await initStateDb();
}

export async function getUsers() { if (isRelational()) return R.getAllUsers(); return readState().users || []; }
export async function getUserById(id) { if (isRelational()) return R.getUserById(id); return (readState().users||[]).find(u=>u.id===id)||null; }
export async function getUserByPhone(phone) { if (isRelational()) return R.getUserByPhone(phone); return (readState().users||[]).find(u=>u.phone===phone)||null; }
export async function getUserByInviteCode(code) { if (isRelational()) return R.getUserByInviteCode(code); return (readState().users||[]).find(u=>u.inviteCode===code)||null; }

export async function saveUser(u) {
  if (isRelational()) {
    const exists = await R.getUserById(u.id);
    if (exists) return R.updateUser(u.id, u);
    return R.createUser(u);
  }
  const db = readState(); const i = (db.users||[]).findIndex(x=>x.id===u.id);
  if (i>=0) db.users[i]=u; else db.users.push(u); writeState(db); return u;
}
export async function patchUser(id, fields) {
  if (isRelational()) return R.updateUser(id, fields);
  const db = readState(); const u = (db.users||[]).find(x=>x.id===id); if (!u) return null; Object.assign(u, fields); writeState(db); return u;
}

export async function getMachines() { if (isRelational()) return R.getMachines(); return (readState().machines||[]); }
export async function getMachineById(id) { if (isRelational()) return R.getMachineById(id); return (readState().machines||[]).find(m=>m.id===id)||null; }

export async function getTransactionsByUser(userId){ if(isRelational()) return R.getTransactionsByUser(userId); return (readState().transactions||[]).filter(t=>t.userId===userId).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')); }
export async function getAllTransactions(){ if(isRelational()) return R.getAllTransactions(); return (readState().transactions||[]); }
export async function addTransaction(t){ if(isRelational()) return R.createTransaction(t); const db=readState(); db.transactions.push(t); writeState(db); return t; }

export async function getPurchasesByUser(userId){ if(isRelational()) return R.getPurchasesByUser(userId); return (readState().purchases||[]).filter(p=>p.userId===userId).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')); }
export async function getAllPurchases(){ if(isRelational()) return R.getAllPurchases(); return (readState().purchases||[]); }
export async function addPurchase(p){ if(isRelational()) return R.createPurchase(p); const db=readState(); db.purchases.push(p); writeState(db); return p; }

export async function getNotificationsByUser(userId){ if(isRelational()) return R.getNotificationsByUser(userId); return (readState().notifications||[]).filter(n=>n.userId===userId).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')); }
export async function addNotification(n){ if(isRelational()) return R.createNotification(n); const db=readState(); db.notifications.push(n); writeState(db); return n; }
export async function markAllNotificationsRead(userId){ if(isRelational()) return R.markAllNotificationsRead(userId); const db=readState(); (db.notifications||[]).forEach(n=>{if(n.userId===userId) n.read=true;}); writeState(db); }

export async function getSettings(){ if(isRelational()) { const kv = await R.getSettings(); return kv; } return (readState().settings||{}); }
export async function setSettings(obj){ if(isRelational()) return R.setSettings(obj); const db=readState(); db.settings={...(db.settings||{}), ...obj}; writeState(db); return db.settings; }

export async function addAuditLog(l){ if(isRelational()) return R.createAuditLog(l); const db=readState(); db.auditLogs=db.auditLogs||[]; db.auditLogs.push(l); writeState(db); }
export async function getAuditLogs(limit=300){ if(isRelational()) return R.getAuditLogs(limit); return (readState().auditLogs||[]).slice().sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,limit); }

// state-mode raw access still needed for some complex ops fallback
export { readState, writeState };
export { migrateStateToRelational } from './migrate.js';
