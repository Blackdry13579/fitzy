import test from 'node:test';
import assert from 'node:assert/strict';
import { calcReferral, creditReferralCommissionsForPurchase, getSettings, generateInviteCode, awardInviteMilestones } from '../src/server.js';

function baseDb() {
  return {
    users: [
      { id: 'u1', inviteCode: 'AAA111', referredBy: null, balance: 0 },
      { id: 'u2', inviteCode: 'BBB222', referredBy: 'u1', balance: 0 },
      { id: 'u3', inviteCode: 'CCC333', referredBy: 'u2', balance: 0 },
      { id: 'u4', inviteCode: 'DDD444', referredBy: 'u3', balance: 0 },
    ],
    transactions: [],
    purchases: [],
    notifications: [],
    settings: {},
  };
}

test('generateInviteCode returns 6-char uppercase unique code', () => {
  const db = baseDb();
  const code = generateInviteCode(db);
  assert.match(code, /^[A-Z0-9]{6}$/);
  assert.ok(!db.users.some(u => u.inviteCode === code));
});

test('getSettings provides defaults and normalizes values', () => {
  const db = { settings: { minWithdraw: '2000', depositPresets: '1000, 2000, abc', withdrawFeePercent: '5' } };
  const s = getSettings(db);
  assert.equal(s.minWithdraw, 2000);
  assert.equal(s.withdrawFeePercent, 5);
  assert.deepEqual(s.depositPresets, [1000, 2000]);
  assert.ok(Array.isArray(s.withdrawPresets) && s.withdrawPresets.length > 0);
  assert.equal(typeof s.maxDeposit, 'number');
});

test('creditReferralCommissionsForPurchase credits 27/3/1% to upline and records transactions', () => {
  const db = baseDb();
  const buyer = db.users.find(u => u.id === 'u4'); // chain: u4<-u3(L1)<-u2(L2)<-u1(L3)
  const purchase = { id: 'p1', amount: 10000 };
  creditReferralCommissionsForPurchase(db, purchase, buyer);
  const u3 = db.users.find(u=>u.id==='u3');
  const u2 = db.users.find(u=>u.id==='u2');
  const u1 = db.users.find(u=>u.id==='u1');
  assert.equal(u3.balance, 2700);
  assert.equal(u2.balance, 300);
  assert.equal(u1.balance, 100);
  const comms = db.transactions.filter(t=>t.type==='commission');
  assert.equal(comms.length, 3);
  assert.ok(comms.every(c => c.status === 'confirmed' && c.sourcePurchaseId === 'p1'));
  assert.deepEqual(comms.map(c=>c.level).sort(), [1,2,3]);
});

test('creditReferralCommissionsForPurchase is idempotent (no double credit)', () => {
  const db = baseDb();
  const buyer = db.users.find(u => u.id === 'u4');
  const purchase = { id: 'p1', amount: 10000 };
  creditReferralCommissionsForPurchase(db, purchase, buyer);
  creditReferralCommissionsForPurchase(db, purchase, buyer);
  const u3 = db.users.find(u=>u.id==='u3');
  const u2 = db.users.find(u=>u.id==='u2');
  const u1 = db.users.find(u=>u.id==='u1');
  assert.equal(u3.balance, 2700);
  assert.equal(u2.balance, 300);
  assert.equal(u1.balance, 100);
  assert.equal(db.transactions.filter(t=>t.type==='commission').length, 3);
});

test('creditReferralCommissionsForPurchase stops at available levels', () => {
  const db = baseDb();
  // buyer u2 has only u1 as referrer
  const buyer = db.users.find(u => u.id === 'u2');
  const purchase = { id: 'p2', amount: 10000 };
  creditReferralCommissionsForPurchase(db, purchase, buyer);
  assert.equal(db.users.find(u=>u.id==='u1').balance, 2700);
  assert.equal(db.transactions.filter(t=>t.type==='commission').length, 1);
  assert.equal(db.transactions[0].level, 1);
});

test('calcReferral returns counts and totalEarned from credited commissions', () => {
  const db = baseDb();
  const buyer = db.users.find(u => u.id === 'u4');
  const purchase = { id: 'p1', amount: 10000 };
  creditReferralCommissionsForPurchase(db, purchase, buyer);
  const r1 = calcReferral(db, 'u1'); // has u2 direct, u3 lvl2, u4 lvl3
  assert.equal(r1.levels[0].count, 1);
  assert.equal(r1.levels[1].count, 1);
  assert.equal(r1.levels[2].count, 1);
  assert.equal(r1.levels[2].commission, 100); // u1 earned level3 commission
  assert.equal(r1.totalEarned, 100);
  const r3 = calcReferral(db, 'u3');
  assert.equal(r3.levels[0].count, 1);
  assert.equal(r3.levels[0].commission, 2700);
  assert.equal(r3.totalEarned, 2700);
});

test('calcReferral includes invite code and link', () => {
  const db = baseDb();
  const r = calcReferral(db, 'u1');
  assert.equal(r.code, 'AAA111');
  assert.ok(r.link.includes('/invite/AAA111'));
});

test('awardInviteMilestones awards cumulative top-up bonuses by direct invite count', () => {
  const db = baseDb();
  // give u1 3 direct referrals
  db.users.push({ id: 'u5', inviteCode: 'EEE555', referredBy: 'u1', balance: 0 });
  db.users.push({ id: 'u6', inviteCode: 'FFF666', referredBy: 'u1', balance: 0 });
  awardInviteMilestones(db, 'u1');
  const u1 = db.users.find(u=>u.id==='u1');
  assert.equal(u1.inviteBonusAwarded, 700);
  assert.equal(u1.balance, 700);
  assert.equal(db.transactions.filter(t=>t.type==='bonus' && t.userId==='u1' && t.label?.includes('Bonus invitation')).length, 1);
  // add 2 more -> total 5, should top up to 1200 (+500)
  db.users.push({ id: 'u7', inviteCode: 'GGG777', referredBy: 'u1', balance: 0 });
  db.users.push({ id: 'u8', inviteCode: 'HHH888', referredBy: 'u1', balance: 0 });
  awardInviteMilestones(db, 'u1');
  assert.equal(u1.inviteBonusAwarded, 1200);
  assert.equal(u1.balance, 1200);
  // idempotent
  awardInviteMilestones(db, 'u1');
  assert.equal(u1.inviteBonusAwarded, 1200);
  assert.equal(u1.balance, 1200);
});

test('awardInviteMilestones gives no bonus below threshold', () => {
  const db = baseDb();
  awardInviteMilestones(db, 'u1'); // only 1 direct
  const u1 = db.users.find(u=>u.id==='u1');
  assert.equal(u1.inviteBonusAwarded || 0, 0);
  assert.equal(u1.balance, 0);
});
