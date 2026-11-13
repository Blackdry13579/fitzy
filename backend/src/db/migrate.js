import { getPool } from './pg.js';
import { readDb } from './store.js';

function n(v, d=0){ const x=Number(v); return Number.isFinite(x)?x:d; }

export async function migrateStateToRelational() {
  const pool = getPool();
  if (!pool) throw new Error('DATABASE_URL not configured');
  const db = readDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // users
    for (const u of (db.users||[])) {
      await client.query(`INSERT INTO users
        (id,member_id,username,phone,country,invite_code,referred_by,password_hash,balance,bonus_total,vip_level,onboarding_done,invite_bonus_awarded,last_claim_date,last_active_at,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
        ON CONFLICT (id) DO UPDATE SET
          member_id=EXCLUDED.member_id, username=EXCLUDED.username, phone=EXCLUDED.phone, country=EXCLUDED.country,
          invite_code=EXCLUDED.invite_code, referred_by=EXCLUDED.referred_by, password_hash=EXCLUDED.password_hash,
          balance=EXCLUDED.balance, bonus_total=EXCLUDED.bonus_total, vip_level=EXCLUDED.vip_level,
          onboarding_done=EXCLUDED.onboarding_done, invite_bonus_awarded=EXCLUDED.invite_bonus_awarded,
          last_claim_date=EXCLUDED.last_claim_date, last_active_at=EXCLUDED.last_active_at, updated_at=NOW()`,
        [u.id, u.memberId||null, u.username||'Utilisateur', u.phone, u.country||'BF', u.inviteCode, u.referredBy||null, u.passwordHash||null,
         n(u.balance), n(u.bonus), n(u.vipLevel), !!u.onboardingDone, n(u.inviteBonusAwarded), u.lastClaimDate||null, u.lastActiveAt||null, u.createdAt||new Date().toISOString()]
      );
    }

    // machines
    for (let i=0;i<(db.machines||[]).length;i++){
      const m=db.machines[i];
      await client.query(`INSERT INTO machines (id,name,category,level,price_fcfa,daily_revenue_fcfa,duration_days,description,image,image_credit,locked,sort_order,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, level=EXCLUDED.level, price_fcfa=EXCLUDED.price_fcfa,
          daily_revenue_fcfa=EXCLUDED.daily_revenue_fcfa, duration_days=EXCLUDED.duration_days, description=EXCLUDED.description, image=EXCLUDED.image,
          image_credit=EXCLUDED.image_credit, locked=EXCLUDED.locked, sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
        [m.id,m.name,m.category||null,m.level||null,n(m.priceFcfa),n(m.dailyRevenueFcfa),n(m.durationDays),m.description||null,m.image||null,m.imageCredit||null,!!m.locked,i,m.createdAt||new Date().toISOString()]
      );
    }

    // purchases
    for (const p of (db.purchases||[])){
      await client.query(`INSERT INTO purchases (id,user_id,machine_id,amount,daily_revenue,duration_days,total_revenue,status,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET amount=EXCLUDED.amount,daily_revenue=EXCLUDED.daily_revenue,duration_days=EXCLUDED.duration_days,total_revenue=EXCLUDED.total_revenue,status=EXCLUDED.status`,
        [p.id,p.userId,p.machineId,n(p.amount),n(p.dailyRevenue),n(p.durationDays),n(p.totalRevenue),p.status||'active',p.createdAt||new Date().toISOString()]
      );
      // generate machine_earnings for choice C (available/collected based on collectedDays)
      const daysElapsed = Math.min(n(p.durationDays), Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000)));
      const collectedDays = Math.min(daysElapsed, n(p.collectedDays));
      for (let d=0; d<daysElapsed; d++){
        const date = new Date(new Date(p.createdAt).getTime() + d*86400000).toISOString().slice(0,10);
        const status = d < collectedDays ? 'collected' : 'available';
        const eid = `me_${p.id}_${date}`;
        await client.query(`INSERT INTO machine_earnings (id,purchase_id,user_id,earning_date,amount,status,collected_at,created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (purchase_id,earning_date) DO NOTHING`,
          [eid,p.id,p.userId,date,n(p.dailyRevenue),status, status==='collected'?new Date().toISOString():null, p.createdAt||new Date().toISOString()]
        );
      }
    }

    // transactions
    for (const t of (db.transactions||[])){
      await client.query(`INSERT INTO transactions (id,user_id,type,amount,fee,received,status,label,method,phone,beneficiary,level,source_purchase_id,note,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
        ON CONFLICT (id) DO UPDATE SET amount=EXCLUDED.amount,fee=EXCLUDED.fee,received=EXCLUDED.received,status=EXCLUDED.status,label=EXCLUDED.label`,
        [t.id,t.userId,t.type,n(t.amount),t.fee!=null?n(t.fee):null,t.received!=null?n(t.received):null,t.status||'confirmed',t.label||null,t.method||null,t.phone||null,t.beneficiary||null,t.level!=null?n(t.level):null,t.sourcePurchaseId||t.purchaseId||null,t.note||null,t.createdAt||new Date().toISOString()]
      );
    }

    // notifications
    for (const nt of (db.notifications||[])){
      await client.query(`INSERT INTO notifications (id,user_id,title,text,type,read,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO NOTHING`,
        [nt.id,nt.userId,nt.title||null,nt.text||null,nt.type||null,!!nt.read,nt.createdAt||new Date().toISOString()]
      );
    }

    // settings
    const s = db.settings||{};
    for (const [k,v] of Object.entries(s)){
      await client.query(`INSERT INTO settings (key,value,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()`,[k, JSON.stringify(v)]);
    }

    // audit logs
    for (const a of (db.auditLogs||[])){
      await client.query(`INSERT INTO audit_logs (id,action,details,admin,created_at) VALUES ($1,$2,$3::jsonb,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [a.id,a.action||'log',JSON.stringify(a.details||{}),a.admin||null,a.createdAt||new Date().toISOString()]
      );
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
