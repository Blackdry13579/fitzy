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
export async function getUsersByIds(ids = []) {
  if (!ids.length) return [];
  const r = await dbQuery('SELECT * FROM users WHERE id = ANY($1::text[])', [ids]);
  return mapRows(r.rows).map(normalizeUser);
}
export async function getUserByPhone(phone) {
  const r = await dbQuery('SELECT * FROM users WHERE phone=$1', [phone]);
  return r.rows[0] ? normalizeUser(mapRow(r.rows[0])) : null;
}
export async function getUserByInviteCode(code) {
  const r = await dbQuery('SELECT * FROM users WHERE invite_code=$1', [code]);
  return r.rows[0] ? normalizeUser(mapRow(r.rows[0])) : null;
}
export async function getUsersByReferrer(referrerId) {
  const r = await dbQuery('SELECT * FROM users WHERE referred_by=$1 ORDER BY created_at ASC', [referrerId]);
  return mapRows(r.rows).map(normalizeUser);
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
  return {
    ...u,
    balance:num(u.balance),
    bonusTotal:num(u.bonusTotal),
    bonus:num(u.bonusTotal ?? u.bonus),
    vipLevel:num(u.vipLevel),
    inviteBonusAwarded:num(u.inviteBonusAwarded),
    onboardingDone:!!u.onboardingDone,
  };
}

export async function getMachines() {
  const r = await dbQuery('SELECT * FROM machines ORDER BY sort_order ASC, created_at ASC');
  return mapRows(r.rows).map(normalizeMachine);
}
export async function getMachineById(id){
  const r=await dbQuery('SELECT * FROM machines WHERE id=$1',[id]);
  return r.rows[0]?normalizeMachine(mapRow(r.rows[0])):null;
}
function normalizeMachine(m){ if(!m) return m; return ({...m, priceFcfa:num(m.priceFcfa), dailyRevenueFcfa:num(m.dailyRevenueFcfa), durationDays:num(m.durationDays), locked:!!m.locked, sortOrder:num(m.sortOrder)}); }

export async function getTransactionsByUser(userId){
  const r=await dbQuery('SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC',[userId]);
  return mapRows(r.rows).map(normalizeTx);
}
export async function getAllTransactions({ type, status } = {}){
  const cond=[]; const vals=[];
  if(type){ vals.push(type); cond.push(`type=$${vals.length}`); }
  if(status){ vals.push(status); cond.push(`status=$${vals.length}`); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const r=await dbQuery(`SELECT * FROM transactions ${where} ORDER BY created_at DESC`, vals);
  return mapRows(r.rows).map(normalizeTx);
}
export async function getTransactionById(id){
  const r=await dbQuery('SELECT * FROM transactions WHERE id=$1',[id]);
  return r.rows[0]?normalizeTx(mapRow(r.rows[0])):null;
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
  const rows = mapRows(r.rows).map(normalizePurchase);
  return attachCollectedDays(rows);
}
export async function getAllPurchases(){
  const r=await dbQuery('SELECT * FROM purchases ORDER BY created_at DESC');
  const rows = mapRows(r.rows).map(normalizePurchase);
  return attachCollectedDays(rows);
}
export async function getPurchaseById(id){
  const r=await dbQuery('SELECT * FROM purchases WHERE id=$1',[id]);
  if(!r.rows[0]) return null;
  const rows = await attachCollectedDays([normalizePurchase(mapRow(r.rows[0]))]);
  return rows[0] || null;
}
async function attachCollectedDays(purchases){
  if(!purchases.length) return purchases;
  const ids = purchases.map(p=>p.id);
  const r = await dbQuery(`SELECT purchase_id, COUNT(*)::int AS days FROM machine_earnings WHERE purchase_id = ANY($1::text[]) AND status='collected' GROUP BY purchase_id`, [ids]);
  const m = new Map(r.rows.map(x=>[x.purchase_id, num(x.days)]));
  return purchases.map(p=>({...p, collectedDays: m.get(p.id) || 0}));
}
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
export async function markNotificationRead(userId,id){ const r=await dbQuery('UPDATE notifications SET read=true WHERE user_id=$1 AND id=$2 RETURNING id',[userId,id]); return r.rowCount>0; }

export async function getSettings(){ const r=await dbQuery('SELECT key,value FROM settings'); const out={}; for(const row of r.rows){ out[row.key]=row.value; } return out; }
export async function setSettings(obj){ for(const [k,v] of Object.entries(obj||{})){ await dbQuery(`INSERT INTO settings (key,value,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()`,[k, JSON.stringify(v)]); } }

export async function createAuditLog(l){ await dbQuery(`INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,$5)`,[l.id,l.action, JSON.stringify(l.details||{}), l.admin||null, l.createdAt||new Date().toISOString()]); }
export async function getAuditLogs(limit=300){ const r=await dbQuery('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',[limit]); return mapRows(r.rows); }

export async function getReferralData(userId){
  const u = await getUserById(userId);
  if(!u) return null;
  const l1 = await getUsersByReferrer(userId);
  const l2 = (await Promise.all(l1.map(x=>getUsersByReferrer(x.id)))).flat();
  const l3 = (await Promise.all(l2.map(x=>getUsersByReferrer(x.id)))).flat();
  const commR = await dbQuery(`SELECT COALESCE(level,0)::int AS level, COALESCE(SUM(amount),0)::numeric AS total FROM transactions WHERE user_id=$1 AND type='commission' AND status='confirmed' GROUP BY COALESCE(level,0)`, [userId]);
  const byLevel = new Map(commR.rows.map(r=>[Number(r.level), Number(r.total)]));
  const l1Earn = Number(byLevel.get(1)||0), l2Earn = Number(byLevel.get(2)||0), l3Earn = Number(byLevel.get(3)||0);
  return {
    user: u,
    levelsUsers: [l1,l2,l3],
    commissions: [l1Earn,l2Earn,l3Earn],
    totalEarned: Math.round(l1Earn+l2Earn+l3Earn),
  };
}

export async function getBonusTotalsMap(userIds = null) {
  let q = `SELECT user_id, COALESCE(SUM(amount),0)::numeric AS total FROM transactions WHERE status='confirmed' AND type IN ('bonus','commission')`;
  const vals = [];
  if (Array.isArray(userIds)) {
    if (!userIds.length) return new Map();
    vals.push(userIds);
    q += ` AND user_id = ANY($1::text[])`;
  }
  q += ` GROUP BY user_id`;
  const r = await dbQuery(q, vals);
  return new Map(r.rows.map(x => [x.user_id, Math.round(Number(x.total || 0))]));
}

export async function getVipLevelsMap() {
  const r = await dbQuery(`SELECT p.user_id, MAX(m.sort_order + 1)::int AS vip
    FROM purchases p JOIN machines m ON m.id = p.machine_id
    GROUP BY p.user_id`);
  return new Map(r.rows.map(x => [x.user_id, Number(x.vip || 0)]));
}

export async function upsertMachineEarning(e){ await dbQuery(`INSERT INTO machine_earnings (id,purchase_id,user_id,earning_date,amount,status,collected_at,created_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (purchase_id,earning_date) DO NOTHING`,[e.id,e.purchaseId,e.userId,e.earningDate,num(e.amount),e.status||'available',e.collectedAt||null,e.createdAt||new Date().toISOString()]); }
export async function getAvailableEarnings(userId,purchaseId){ const r=await dbQuery('SELECT * FROM machine_earnings WHERE user_id=$1 AND purchase_id=$2 AND status=\'available\' ORDER BY earning_date ASC',[userId,purchaseId]); return mapRows(r.rows).map(x=>({...x,amount:num(x.amount)})); }
export async function collectEarnings(userId,purchaseId){ const r=await dbQuery(`UPDATE machine_earnings SET status='collected', collected_at=NOW() WHERE user_id=$1 AND purchase_id=$2 AND status='available' RETURNING *`,[userId,purchaseId]); return mapRows(r.rows).map(x=>({...x,amount:num(x.amount)})); }
