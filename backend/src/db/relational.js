import { dbQuery, getPool, mapRows, mapRow, num } from './pg.js';

export const usePg = () => !!getPool();

export async function getAllUsers() {
  const r = await dbQuery('SELECT * FROM users ORDER BY created_at ASC');
  return mapRows(r.rows).map(normalizeUser);
}
export async function getUserById(id) {
  const r = await dbQuery('SELECT * FROM users WHERE id=$1', [id]);
  return r.rows[0] ? normalizeUser(mapRow(r.rows[0])) : null;
}
export async function getUserByPhone(phone) {
  const r = await dbQuery('SELECT * FROM users WHERE phone=$1', [phone]);
  return r.rows[0] ? normalizeUser(mapRow(r.rows[0])) : null;
}
export async function getUserByInviteCode(code) {
  const r = await dbQuery('SELECT * FROM users WHERE invite_code=$1', [code]);
  return r.rows[0] ? normalizeUser(mapRow(r.rows[0])) : null;
}
export async function createUser(u) {
  await dbQuery(`INSERT INTO users
    (id,member_id,username,phone,country,invite_code,referred_by,password_hash,balance,bonus_total,vip_level,onboarding_done,invite_bonus_awarded,last_claim_date,last_active_at,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())`,
    [u.id,u.memberId||null,u.username||'Utilisateur',u.phone,u.country||'BF',u.inviteCode,u.referredBy||null,u.passwordHash||null,num(u.balance),num(u.bonusTotal ?? u.bonus),num(u.vipLevel),!!u.onboardingDone,num(u.inviteBonusAwarded),u.lastClaimDate||null,u.lastActiveAt||null,u.createdAt||new Date().toISOString()]
  );
  return getUserById(u.id);
}
export async function updateUser(id, fields) {
  // generic update by known columns
  const map = {
    memberId:'member_id', username:'username', phone:'phone', country:'country', inviteCode:'invite_code', referredBy:'referred_by',
    passwordHash:'password_hash', balance:'balance', bonusTotal:'bonus_total', bonus:'bonus_total', vipLevel:'vip_level',
    onboardingDone:'onboarding_done', inviteBonusAwarded:'invite_bonus_awarded', lastClaimDate:'last_claim_date', lastActiveAt:'last_active_at'
  };
  const sets=[]; const vals=[]; let i=1;
  for (const [k,v] of Object.entries(fields||{})) {
    if (!(k in map)) continue;
    sets.push(`${map[k]}=$${i++}`);
    vals.push(v);
  }
  if (!sets.length) return getUserById(id);
  sets.push(`updated_at=NOW()`);
  vals.push(id);
  await dbQuery(`UPDATE users SET ${sets.join(',')} WHERE id=$${i}`, vals);
  return getUserById(id);
}

function normalizeUser(u){
  if(!u) return u;
  return { ...u, balance:num(u.balance), bonusTotal:num(u.bonusTotal), bonus:num(u.bonusTotal ?? u.bonus), vipLevel:num(u.vipLevel), inviteBonusAwarded:num(u.inviteBonusAwarded), onboardingDone:!!u.onboardingDone };
}

export async function getMachines() {
  const r = await dbQuery('SELECT * FROM machines ORDER BY sort_order ASC, created_at ASC');
  return mapRows(r.rows).map(m=>({...m, priceFcfa:num(m.priceFcfa), dailyRevenueFcfa:num(m.dailyRevenueFcfa), durationDays:num(m.durationDays), locked:!!m.locked, sortOrder:num(m.sortOrder)}));
}
export async function getMachineById(id){ const r=await dbQuery('SELECT * FROM machines WHERE id=$1',[id]); return r.rows[0]?mapRows(r.rows)[0]:null; }

export async function getTransactionsByUser(userId){
  const r=await dbQuery('SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC',[userId]);
  return mapRows(r.rows).map(normalizeTx);
}
export async function getAllTransactions(){
  const r=await dbQuery('SELECT * FROM transactions ORDER BY created_at DESC');
  return mapRows(r.rows).map(normalizeTx);
}
export async function createTransaction(t){
  await dbQuery(`INSERT INTO transactions (id,user_id,type,amount,fee,received,status,label,method,phone,beneficiary,level,source_purchase_id,note,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())`,
    [t.id,t.userId,t.type,num(t.amount),t.fee!=null?num(t.fee):null,t.received!=null?num(t.received):null,t.status||'confirmed',t.label||null,t.method||null,t.phone||null,t.beneficiary||null,t.level!=null?num(t.level):null,t.sourcePurchaseId||null,t.note||null,t.createdAt||new Date().toISOString()]
  );
}
function normalizeTx(t){ if(!t) return t; return {...t, amount:num(t.amount), fee:t.fee!=null?num(t.fee):t.fee, received:t.received!=null?num(t.received):t.received, level:t.level!=null?num(t.level):t.level}; }

export async function getPurchasesByUser(userId){
  const r=await dbQuery('SELECT * FROM purchases WHERE user_id=$1 ORDER BY created_at DESC',[userId]);
  return mapRows(r.rows).map(normalizePurchase);
}
export async function getAllPurchases(){ const r=await dbQuery('SELECT * FROM purchases ORDER BY created_at DESC'); return mapRows(r.rows).map(normalizePurchase); }
export async function createPurchase(p){
  await dbQuery(`INSERT INTO purchases (id,user_id,machine_id,amount,daily_revenue,duration_days,total_revenue,status,created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [p.id,p.userId,p.machineId,num(p.amount),num(p.dailyRevenue),num(p.durationDays),num(p.totalRevenue),p.status||'active',p.createdAt||new Date().toISOString()]
  );
}
function normalizePurchase(p){ if(!p) return p; return {...p, amount:num(p.amount), dailyRevenue:num(p.dailyRevenue), durationDays:num(p.durationDays), totalRevenue:num(p.totalRevenue)}; }

export async function getNotificationsByUser(userId){ const r=await dbQuery('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC',[userId]); return mapRows(r.rows).map(n=>({...n, read:!!n.read})); }
export async function createNotification(n){ await dbQuery(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[n.id,n.userId,n.title||null,n.text||null,n.type||null,!!n.read,n.createdAt||new Date().toISOString()]); }
export async function markAllNotificationsRead(userId){ await dbQuery('UPDATE notifications SET read=true WHERE user_id=$1',[userId]); }

export async function getSettings(){ const r=await dbQuery('SELECT key,value FROM settings'); const out={}; for(const row of r.rows){ out[row.key]=row.value; } return out; }
export async function setSettings(obj){ for(const [k,v] of Object.entries(obj||{})){ await dbQuery(`INSERT INTO settings (key,value,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()`,[k, JSON.stringify(v)]); } }

export async function createAuditLog(l){ await dbQuery(`INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,$5)`,[l.id,l.action, JSON.stringify(l.details||{}), l.admin||null, l.createdAt||new Date().toISOString()]); }
export async function getAuditLogs(limit=300){ const r=await dbQuery('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',[limit]); return mapRows(r.rows); }

export async function upsertMachineEarning(e){ await dbQuery(`INSERT INTO machine_earnings (id,purchase_id,user_id,earning_date,amount,status,collected_at,created_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (purchase_id,earning_date) DO NOTHING`,[e.id,e.purchaseId,e.userId,e.earningDate,num(e.amount),e.status||'available',e.collectedAt||null,e.createdAt||new Date().toISOString()]); }
export async function getAvailableEarnings(userId,purchaseId){ const r=await dbQuery('SELECT * FROM machine_earnings WHERE user_id=$1 AND purchase_id=$2 AND status=\'available\' ORDER BY earning_date ASC',[userId,purchaseId]); return mapRows(r.rows).map(x=>({...x,amount:num(x.amount)})); }
export async function collectEarnings(userId,purchaseId){ const r=await dbQuery(`UPDATE machine_earnings SET status='collected', collected_at=NOW() WHERE user_id=$1 AND purchase_id=$2 AND status='available' RETURNING *`,[userId,purchaseId]); return mapRows(r.rows).map(x=>({...x,amount:num(x.amount)})); }
