import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { setTimeout as wait } from 'timers/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const dbPath = path.join(backendDir, 'data', 'db.json');

async function req(base, method, urlPath, body, token){
  const res = await fetch(base + urlPath, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let data; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { status: res.status, data };
}

test('API scenario (JSON mode): register/login, claim, deposit, purchase+commission, withdraw/reject refund, reads', async (t) => {
  const port = 4100 + Math.floor(Math.random() * 500);
  const base = `http://127.0.0.1:${port}`;
  const bakPath = path.join(backendDir, 'data', `db.json.scenario.${port}.bak`);
  if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, bakPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify({users:[],transactions:[],purchases:[],notifications:[],machines:[],settings:{},auditLogs:[]}, null, 2));

  const env = { ...process.env, PORT: String(port), DATABASE_URL: '', JWT_SECRET: 'test-secret' };
  const srv = spawn(process.execPath, ['src/server.js'], { cwd: backendDir, env, stdio: ['ignore','pipe','pipe'] });
  let stderr = '';
  srv.stderr.on('data', d => { stderr += d.toString(); });
  t.after(async () => {
    srv.kill('SIGTERM');
    await wait(250);
    try { srv.kill('SIGKILL'); } catch {}
    if (fs.existsSync(bakPath)) { fs.copyFileSync(bakPath, dbPath); fs.unlinkSync(bakPath); }
    else { try { fs.unlinkSync(dbPath); } catch {} }
  });

  let up=false;
  for(let i=0;i<50;i++){ await wait(120); try{ const h=await req(base,'GET','/api/health'); if(h.status===200){up=true;break;} }catch{} }
  assert.ok(up, 'Server did not start: ' + stderr);

  // register referrer + referred
  let r = await req(base,'POST','/api/auth/register',{phone:'70000001', password:'pass1234', country:'BF'});
  assert.equal(r.status, 200); assert.ok(r.data.token);
  const refToken = r.data.token; const refUser = r.data.user;
  assert.equal(r.data.user.balance, 600);

  r = await req(base,'POST','/api/auth/register',{phone:'70000002', password:'pass1234', country:'BF', inviteCode: refUser.inviteCode});
  assert.equal(r.status, 200);
  let u2Token = r.data.token;

  r = await req(base,'POST','/api/auth/login',{phone:'70000002', password:'pass1234'});
  assert.equal(r.status, 200); u2Token = r.data.token;

  // claim daily
  r = await req(base,'POST','/api/wallet/claim-daily', {}, u2Token);
  assert.equal(r.status, 200); assert.equal(r.data.balance, 650);
  r = await req(base,'POST','/api/wallet/claim-daily', {}, u2Token);
  assert.equal(r.status, 400);

  // deposit pending blocks purchase, admin confirms
  r = await req(base,'POST','/api/wallet/deposit',{amount:5000, method:'otp', otp:'1234'}, u2Token);
  assert.equal(r.status, 200); assert.equal(r.data.transaction.status, 'pending');
  const depTxId = r.data.transaction.id;
  r = await req(base,'GET','/api/machines'); assert.equal(r.status, 200);
  const m1 = r.data.find(m=>!m.locked) || r.data[0];
  r = await req(base,'POST','/api/purchases',{machineId:m1.id}, u2Token);
  assert.equal(r.status, 400);

  r = await req(base,'POST','/api/admin/login',{phone: process.env.ADMIN_PHONE || '02040608', password: process.env.ADMIN_PASSWORD || 'Anzaruch@3578@'});
  assert.equal(r.status, 200); const adminToken = r.data.token;
  r = await req(base,'PATCH', `/api/admin/transactions/${depTxId}`, {status:'confirmed'}, adminToken);
  assert.equal(r.status, 200);

  // purchase + commission
  r = await req(base,'POST','/api/purchases',{machineId:m1.id}, u2Token);
  assert.equal(r.status, 200);
  const purchaseId = r.data.purchase?.id || r.data.id;
  assert.ok(purchaseId);
  r = await req(base,'GET','/api/auth/me', null, refToken);
  assert.equal(r.status, 200);
  const expectedComm = Math.round(Number(m1.priceFcfa) * 0.27);
  assert.ok(Number(r.data.balance) >= 600 + expectedComm);

  // withdraw rejection -> refund
  r = await req(base,'GET','/api/wallet', null, u2Token);
  const balBefore = Number(r.data.balance);
  assert.ok(balBefore >= 1200);
  r = await req(base,'POST','/api/wallet/withdraw',{amount:1200, phone:'70000002', beneficiary:'Test User'}, u2Token);
  assert.equal(r.status, 200); assert.equal(r.data.transaction.status,'pending');
  const wdTxId = r.data.transaction.id;
  assert.equal(Number(r.data.balance), balBefore - 1200);
  r = await req(base,'PATCH', `/api/admin/transactions/${wdTxId}`, {status:'rejected'}, adminToken);
  assert.equal(r.status, 200);
  r = await req(base,'GET','/api/wallet', null, u2Token);
  assert.equal(Number(r.data.balance), balBefore);

  // collect
  r = await req(base,'POST', `/api/purchases/${purchaseId}/collect`, {}, u2Token);
  assert.ok(r.status===200 || r.status===400);

  // reads
  r = await req(base,'GET','/api/referral', null, refToken); assert.equal(r.status, 200);
  r = await req(base,'GET','/api/wallet', null, refToken); assert.equal(r.status, 200);
  r = await req(base,'GET','/api/notifications', null, u2Token); assert.equal(r.status, 200);
});
