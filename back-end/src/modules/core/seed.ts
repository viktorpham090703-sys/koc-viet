// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
import { now, uid } from './db.js';
import { hashPassword } from './lib/password.js';

// Vietnamese seed data. Deterministic (no Math.random) so tests are reproducible.
export const TIERS = [
  { name: 'Nano',  min: 200000,  max: 1500000,  minF: 1000,   maxF: 10000,   fee: 5 },
  { name: 'Micro', min: 1000000, max: 5000000,  minF: 10000,  maxF: 50000,   fee: 5 },
  { name: 'Mid',   min: 4000000, max: 20000000, minF: 50000,  maxF: 500000,  fee: 4 },
  { name: 'Macro', min: 15000000,max: 80000000, minF: 500000, maxF: 99000000,fee: 3 },
];

export const CATEGORIES = ['Thời trang','Mỹ phẩm','Ẩm thực','Công nghệ','Mẹ & Bé','Du lịch','Gia dụng','Sức khỏe'];
export const PROVINCES = ['Hà Nội','TP.HCM','Đà Nẵng','Hải Phòng','Cần Thơ','Nghệ An','Bình Dương','Khánh Hòa','Thanh Hóa','Lâm Đồng'];

function tierOf(followers, eng) {
  const score = followers * (1 + eng / 100);
  if (score >= 500000) return 'Macro';
  if (score >= 50000) return 'Mid';
  if (score >= 10000) return 'Micro';
  return 'Nano';
}
export { tierOf };

// Deterministic pseudo-value from a seed integer (replaces Math.random in seeding).
function det(n, lo, hi) { const x = ((n * 2654435761) % 1000) / 1000; return lo + (hi - lo) * x; }

async function seedState(env) {
  const row = await env.DB.prepare(`SELECT v FROM _meta WHERE k='seeded'`).first();
  return row ? row.v : null;
}

const DEMO_ACCOUNT_META_KEY = 'demo_account_ids_v1';
const DEMO_ACCOUNT_PASSWORD = 'demo123';
const DEMO_ACCOUNT_DEFS = [
  { role: 'koc', legacyEmail: 'koc@demo.vn', legacyName: 'Nguyễn Thu Hà' },
  { role: 'business', legacyEmail: 'business@demo.vn', legacyName: 'Cocoon' },
  { role: 'admin', legacyEmail: 'admin@demo.vn', legacyName: 'Admin NetViet' },
];

async function ensureDemoAccountIds(env) {
  const saved = await env.DB.prepare('SELECT v FROM _meta WHERE k=?')
    .bind(DEMO_ACCOUNT_META_KEY).first();
  if (saved?.v) {
    try {
      const ids = JSON.parse(saved.v);
      if (ids && typeof ids === 'object') return ids;
    } catch (_) {}
  }

  // Backfill existing databases created before demo IDs were persisted. Match only
  // known seed identities so a real account can never become publicly listed by accident.
  const ids = {};
  for (const def of DEMO_ACCOUNT_DEFS) {
    const user = await env.DB.prepare(
      `SELECT id FROM users
       WHERE role=? AND (email=? OR name=?)
       ORDER BY created_at ASC LIMIT 1`
    ).bind(def.role, def.legacyEmail, def.legacyName).first();
    if (user?.id) ids[def.role] = user.id;
  }
  if (Object.keys(ids).length) {
    await env.DB.prepare(
      `INSERT INTO _meta (k,v) VALUES (?,?)
       ON CONFLICT(k) DO UPDATE SET v=excluded.v`
    ).bind(DEMO_ACCOUNT_META_KEY, JSON.stringify(ids)).run();
  }
  return ids;
}

export function demoAccountsEnabled(env) {
  const configured = String(env.DEMO_ACCOUNTS_ENABLED || '').trim().toLowerCase();
  // This product intentionally exposes its seeded demo accounts. Nexrall does
  // not automatically import local .dev.vars/wrangler vars, so an absent value
  // must preserve demo access. Operators can still disable it explicitly.
  return !['false', '0', 'off', 'no'].includes(configured);
}

export async function getDemoAccounts(env) {
  if (!demoAccountsEnabled(env)) return [];
  const ids = await ensureDemoAccountIds(env);
  const accounts = [];
  for (const def of DEMO_ACCOUNT_DEFS) {
    const id = ids[def.role];
    if (!id) continue;
    const user = await env.DB.prepare(
      'SELECT role,email FROM users WHERE id=? AND role=? AND status=?'
    ).bind(id, def.role, 'active').first();
    if (user) {
      accounts.push({
        role: user.role,
        email: String(user.email || ''),
      });
    }
  }
  return accounts;
}

export async function getDemoAccount(env, role) {
  if (!demoAccountsEnabled(env)) return null;
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!DEMO_ACCOUNT_DEFS.some(def => def.role === normalizedRole)) return null;
  const ids = await ensureDemoAccountIds(env);
  const id = ids[normalizedRole];
  if (!id) return null;
  return env.DB.prepare('SELECT * FROM users WHERE id=? AND role=? AND status=?')
    .bind(id, normalizedRole, 'active').first();
}

export async function isDemoUser(env, userId) {
  const ids = await ensureDemoAccountIds(env);
  return Object.values(ids).includes(userId);
}

const KOC_AVATARS = {
  'Ngô Quốc Việt': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486258/2._Ng%C3%B4_Qu%E1%BB%91c_Vi%E1%BB%87t_Mid_Du_l%E1%BB%8Bch_C%C3%B4ng_ngh%E1%BB%87_uxfqdc.jpg?_s=public-apps',
  'Trần Minh Quân': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486258/3._Tr%E1%BA%A7n_Minh_Qu%C3%A2n_Mid_C%C3%B4ng_ngh%E1%BB%87_Gia_d%E1%BB%A5ng_b0us06.jpg?_s=public-apps',
  'Bùi Ngọc Mai': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486256/4._B%C3%B9i_Ng%E1%BB%8Dc_Mai_Mid_M%E1%BB%B9_ph%E1%BA%A9m_S%E1%BB%A9c_kh%E1%BB%8Fe_H%C3%A0_N%E1%BB%99i_nodqqw.jpg?_s=public-apps',
  'Lê Phương Anh': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486259/5._L%C3%AA_Ph%C6%B0%C6%A1ng_Anh_Mid_%E1%BA%A8m_th%E1%BB%B1c_Du_l%E1%BB%8Bch_%C4%90%C3%A0_N%E1%BA%B5ng_achpug.jpg?_s=public-apps',
  'Lý Hải Đăng': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486260/6._L%C3%BD_H%E1%BA%A3i_%C4%90%C4%83ng_Mid_S%E1%BB%A9c_kh%E1%BB%8Fe_Thanh_H%C3%B3a_zbyrdl.jpg?_s=public-apps',
  'Nguyễn Thu Hà': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486728/Nguy%E1%BB%85n_Thu_H%C3%A0_Macro_M%E1%BB%B9_ph%E1%BA%A9m_Th%E1%BB%9Di_trang_TP.HCM_4.8_gogpqq.jpg?_s=public-apps',
  'Phạm Gia Bảo': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486815/1._Ph%E1%BA%A1m_Gia_B%E1%BA%A3o_Micro_Th%E1%BB%9Di_trang_TP.HCM_ahqjyy.jpg?_s=public-apps',
  'Đỗ Thùy Linh': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486817/2._%C4%90%E1%BB%97_Th%C3%B9y_Linh_Micro_Gia_d%E1%BB%A5ng_M%E1%BA%B9_B%C3%A9_gdlxon.jpg?_s=public-apps',
  'Nguyễn Test': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486816/3._Nguyen_Test_Micro_M%E1%BB%B9_ph%E1%BA%A9m_L%C3%A0m_%C4%91%E1%BA%B9p_H%C3%A0_N%E1%BB%99i_vil2mp.jpg?_s=public-apps',
  'Võ Thanh Trúc': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486816/3._Nguyen_Test_Micro_M%E1%BB%B9_ph%E1%BA%A9m_L%C3%A0m_%C4%91%E1%BA%B9p_H%C3%A0_N%E1%BB%99i_vil2mp.jpg?_s=public-apps',
  'QC Auto 210726': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486819/5._QC_Auto_210726_Micro_M%E1%BB%B9_ph%E1%BA%A9m_H%C3%A0_N%E1%BB%99i_g6th0k.jpg?_s=public-apps',
  'Đặng Hoàng Long': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486819/6._%C4%90%E1%BA%B7ng_Ho%C3%A0ng_Long_Nano_C%C3%B4ng_ngh%E1%BB%87_H%E1%BA%A3i_Ph%C3%B2ng_adpqig.jpg?_s=public-apps',
  'Phạm Thị D': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486937/1._Ph%E1%BA%A1m_Th%E1%BB%8B_D_Nano_S%E1%BB%A9c_kh%E1%BB%8Fe_H%C3%A0_N%E1%BB%99i_oi1rub.jpg?_s=public-apps',
  'Hồ Anh Tuân': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486937/1._Ph%E1%BA%A1m_Th%E1%BB%8B_D_Nano_S%E1%BB%A9c_kh%E1%BB%8Fe_H%C3%A0_N%E1%BB%99i_oi1rub.jpg?_s=public-apps',
  'Hồ Anh Tuấn': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486937/1._Ph%E1%BA%A1m_Th%E1%BB%8B_D_Nano_S%E1%BB%A9c_kh%E1%BB%8Fe_H%C3%A0_N%E1%BB%99i_oi1rub.jpg?_s=public-apps',
  'New KOC': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486940/3._New_KOC_Nano_Th%E1%BB%9Di_trang_H%C3%A0_N%E1%BB%99i_nandpp.jpg?_s=public-apps',
  'Trịnh Bảo Ngọc': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486938/4._Tr%E1%BB%8Bnh_B%E1%BA%A3o_Ng%E1%BB%8Dc_Nano_Th%E1%BB%9Di_trang_Du_l%E1%BB%8Bch_kjciqg.jpg?_s=public-apps',
  'Quang': 'https://res.cloudinary.com/drxum5uxt/image/upload/fl_preserve_transparency/v1785486945/5._Quang_Nano_Th%E1%BB%9Di_trang_H%C3%A0_N%E1%BB%99i_ezylsw.jpg?_s=public-apps',
};

async function syncKocAvatars(env) {
  const stmts = Object.entries(KOC_AVATARS).map(([name, avatar]) =>
    env.DB.prepare('UPDATE kocs SET avatar=? WHERE name=?').bind(avatar, name));
  if (stmts.length) await env.DB.batch(stmts);
}

let _seedReady = false;
let _seedPromise = null;
const SEED_EXTRAS_META_KEY = 'seed_extras_guard_v1';

export async function ensureSeedData(env) {
  if (_seedReady) return;
  if (!_seedPromise) {
    _seedPromise = (async () => {
      const { results = [] } = await env.DB.prepare(
        `SELECT k,v FROM _meta WHERE k IN ('seeded',?, 'qc_fixtures_v1')`,
      ).bind(SEED_EXTRAS_META_KEY).all();
      const guards = new Map(results.map(row => [row.k, row.v]));
      if (
        guards.get('seeded') === 'done' &&
        guards.get('qc_fixtures_v1') === 'done'
      ) return;
      await seedIfEmpty(env);
      await seedExtras(env);
    })();
  }
  try {
    await _seedPromise;
    _seedReady = true;
  } catch (error) {
    _seedPromise = null;
    throw error;
  }
}

export async function seedIfEmpty(env) {
  // Atomic guard: _meta.k is PRIMARY KEY, so the INSERT succeeds for exactly one
  // request even under concurrency. That request runs the seed; every OTHER
  // concurrent request loses the INSERT and must WAIT until seeding is 'done'
  // before returning — otherwise it would query a half-seeded DB (the flaky bug).
  try {
    await env.DB.prepare(`INSERT INTO _meta (k,v) VALUES ('seeded','running')`).run();
  } catch (e) {
    for (let i = 0; i < 150; i++) {
      const st = await seedState(env);
      if (st === 'done') {
        await syncKocAvatars(env);
        return;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return; // ~15s timeout safeguard
  }
  try {
    await doSeed(env);
    await env.DB.prepare(`UPDATE _meta SET v='done' WHERE k='seeded'`).run();
    await syncKocAvatars(env);
  } catch (e) {
    // Failed midway — clear the guard so a later request can retry cleanly.
    try { await env.DB.prepare(`DELETE FROM _meta WHERE k='seeded'`).run(); } catch (_) {}
    throw e;
  }
}

async function doSeed(env) {
  const t = now();
  const demoPasswordHashes = await Promise.all([
    hashPassword(DEMO_ACCOUNT_PASSWORD),
    hashPassword(DEMO_ACCOUNT_PASSWORD),
    hashPassword(DEMO_ACCOUNT_PASSWORD),
  ]);
  const kocDefs = [
    ['Nguyễn Thu Hà','TP.HCM',['Mỹ phẩm','Thời trang'],820000,6.2,[['TikTok','@thuha',920000],['Instagram','@thuha',540000]],true],
    ['Trần Minh Quân','Hà Nội',['Công nghệ','Gia dụng'],210000,4.8,[['YouTube','MinhQuanTech',260000]],false],
    ['Lê Phương Anh','Đà Nẵng',['Ẩm thực','Du lịch'],68000,7.1,[['TikTok','@phuonganhfood',72000]],true],
    ['Phạm Gia Bảo','TP.HCM',['Thời trang'],44000,5.5,[['Instagram','@giabaostyle',44000]],false],
    ['Võ Thanh Trúc','Cần Thơ',['Mẹ & Bé','Sức khỏe'],15600,8.3,[['Facebook','Trúc Mẹ Bỉm',18000]],false],
    ['Đặng Hoàng Long','Hải Phòng',['Công nghệ'],9200,6.0,[['TikTok','@longtech',9200]],false],
    ['Bùi Ngọc Mai','Hà Nội',['Mỹ phẩm','Sức khỏe'],132000,5.9,[['TikTok','@ngocmai',150000]],true],
    ['Hồ Anh Tuấn','Nghệ An',['Ẩm thực'],5400,9.1,[['Facebook','Tuấn Food',6000]],false],
    ['Đỗ Thùy Linh','Bình Dương',['Gia dụng','Mẹ & Bé'],27000,6.7,[['TikTok','@thuylinh',30000]],false],
    ['Ngô Quốc Việt','Khánh Hòa',['Du lịch','Công nghệ'],390000,4.2,[['YouTube','Việt Travel',420000]],true],
    ['Trịnh Bảo Ngọc','Lâm Đồng',['Thời trang','Du lịch'],2100,10.5,[['Instagram','@baongoc',2100]],false],
    ['Lý Hải Đăng','Thanh Hóa',['Sức khỏe'],62000,5.1,[['TikTok','@haidang',63000]],false],
  ];

  const stmts = [];
  const kocIds = [];
  kocDefs.forEach((d, i) => {
    const [name, prov, cats, fol, eng, socials, ai] = d;
    const id = uid(); kocIds.push({ id, name, cats });
    const tier = tierOf(fol, eng);
    const accepting = {}; cats.forEach(c => accepting[c] = true);
    const rating = (4 + det(i + 1, 0, 1)).toFixed(1); // deterministic 4.0–5.0
    stmts.push(env.DB.prepare(
      `INSERT INTO kocs (id,name,phone,tier,province,avatar,bio,followers,engagement,categories,socials,status,accepting,ai_clone,rating,reviews_count,completed_bookings,contract_hash,leader,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, name, '09'+(10000000+i*111111), tier, prov, KOC_AVATARS[name] || '',
      `KOC ${tier} chuyên ${cats.join(', ')}. Hợp tác uy tín, nội dung chất lượng.`,
      fol, eng, JSON.stringify(cats), JSON.stringify(socials.map(s=>({platform:s[0],handle:s[1],followers:s[2]}))),
      'active', JSON.stringify(accepting), ai?1:0,
      rating, 8+i, 5+i, 'HASH'+i, i===0?1:0, t - i*86400));
    // prices per category within tier range (deterministic)
    const tr = TIERS.find(x => x.name === tier);
    cats.forEach((c, ci) => {
      const price = Math.round((tr.min + (tr.max - tr.min) * det(i*7 + ci + 3, 0.3, 0.7)) / 100000) * 100000;
      stmts.push(env.DB.prepare(`INSERT INTO koc_prices (id,koc_id,category,price) VALUES (?,?,?,?)`)
        .bind(uid(), id, c, price));
    });
  });

  const bizDefs = [
    ['Công ty TNHH Mỹ phẩm Cocoon','cocoon@biz.vn','Chị Lan'],
    ['Điện máy XANH Store','xanh@biz.vn','Anh Hùng'],
    ['Thời trang Yody','yody@biz.vn','Chị Thảo'],
    ['Sữa hạt NutiFood','nuti@biz.vn','Anh Khoa'],
    ['Du lịch Vietravel','vietravel@biz.vn','Chị My'],
  ];
  const bizIds = [];
  bizDefs.forEach((b, i) => {
    const id = uid(); bizIds.push(id);
    stmts.push(env.DB.prepare(`INSERT INTO businesses (id,name,email,contact,created_at) VALUES (?,?,?,?,?)`)
      .bind(id, b[0], b[1], b[2], t - i*86400));
  });

  // demo users
  const demoAccountIds = {
    koc: uid(),
    business: uid(),
    admin: uid(),
  };
  stmts.push(env.DB.prepare(`INSERT INTO users (id,email,password,role,name,koc_id,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(demoAccountIds.koc,'koc@demo.vn',demoPasswordHashes[0],'koc','Nguyễn Thu Hà',kocIds[0].id,t));
  stmts.push(env.DB.prepare(`INSERT INTO users (id,email,password,role,name,business_id,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(demoAccountIds.business,'business@demo.vn',demoPasswordHashes[1],'business','Cocoon',bizIds[0],t));
  stmts.push(env.DB.prepare(`INSERT INTO users (id,email,password,role,name,created_at) VALUES (?,?,?,?,?,?)`)
    .bind(demoAccountIds.admin,'admin@demo.vn',demoPasswordHashes[2],'admin','Admin NetViet',t));
  stmts.push(env.DB.prepare(
    `INSERT INTO _meta (k,v) VALUES (?,?)
     ON CONFLICT(k) DO UPDATE SET v=excluded.v`
  ).bind(DEMO_ACCOUNT_META_KEY, JSON.stringify(demoAccountIds)));

  await env.DB.batch(stmts);

  // bookings in various states (deterministic codes)
  const bset = [];
  let seq = 0;
  const B = (bi, ki, cat, price, status, extra={}) => {
    const id = uid(); const escrow = status==='rejected' ? 0 : price;
    const code = 'BK' + String(100000 + (seq * 13337) % 899999);
    seq++;
    bset.push(env.DB.prepare(
      `INSERT INTO bookings (id,code,business_id,koc_id,category,price,escrow,product_link,requirements,deadline,status,reject_reason,post_link,post_platform,type,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id,code,bizIds[bi],kocIds[ki].id,cat,price,escrow,
      'https://sanpham.demo.vn/product/'+(1000+ki),'Quay video review 60s, tự nhiên, có gắn link affiliate.','2025-08-30',
      status, extra.reason||null, extra.post||null, extra.platform||null, extra.type||'marketplace', t-3600*(seq+1), t-1800*(seq+1)));
    return id;
  };
  B(0,0,'Mỹ phẩm',12000000,'pending');
  B(1,1,'Công nghệ',3500000,'confirmed');
  B(2,2,'Ẩm thực',900000,'producing');
  const bDemoPosted = B(1,0,'Thời trang',9000000,'posted',{post:'https://tiktok.com/@thuha/video/999',platform:'TikTok'});
  const bDemoDone = B(4,0,'Mỹ phẩm',10000000,'completed',{post:'https://tiktok.com/@thuha/video/888',platform:'TikTok'});
  const bPosted = B(0,6,'Mỹ phẩm',4500000,'posted',{post:'https://tiktok.com/@ngocmai/video/123',platform:'TikTok'});
  const bSettling = B(3,4,'Mẹ & Bé',800000,'settling',{post:'https://facebook.com/reel/456',platform:'Facebook'});
  const bDone = B(4,9,'Du lịch',18000000,'completed',{post:'https://youtube.com/watch?v=abc',platform:'YouTube'});
  B(2,3,'Thời trang',2000000,'rejected',{reason:'Sản phẩm không phù hợp hình ảnh kênh.'});
  B(1,5,'Công nghệ',700000,'confirmed');
  await env.DB.batch(bset);

  // affiliate + wallet + ledger for posted/completed (deterministic short codes)
  const sc = (n) => 'kv' + String(1000000 + (n * 48611) % 8999999).toString(36);
  const w = [];
  w.push(env.DB.prepare(`INSERT INTO affiliate (id,booking_id,koc_id,short_code,clicks,orders,commission) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),bDemoPosted,kocIds[0].id,sc(1),890,42,1260000));
  w.push(env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),kocIds[0].id,'booking',Math.round(10000000*0.95),'settled','Phí booking (95%)',t-90000));
  w.push(env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),kocIds[0].id,'commission',1260000,'pending','Hoa hồng affiliate (chờ đối soát)',t-5000));
  w.push(env.DB.prepare(`INSERT INTO affiliate (id,booking_id,koc_id,short_code,clicks,orders,commission) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),bPosted,kocIds[6].id,sc(2),340,18,540000));
  w.push(env.DB.prepare(`INSERT INTO affiliate (id,booking_id,koc_id,short_code,clicks,orders,commission) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),bDone,kocIds[9].id,sc(3),1200,64,2100000));
  w.push(env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),kocIds[9].id,'booking',Math.round(18000000*0.95),'settled','Phí booking BK (95%)',t-86400));
  w.push(env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),kocIds[9].id,'commission',2100000,'settled','Hoa hồng affiliate',t-80000));
  w.push(env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(uid(),kocIds[6].id,'commission',540000,'pending','Hoa hồng affiliate (chờ đối soát)',t-3600));
  w.push(env.DB.prepare(`INSERT INTO ledger (id,kind,amount,ref,note,created_at) VALUES (?,?,?,?,?,?)`)
    .bind(uid(),'service_fee',Math.round(18000000*0.05),bDone,'Phí dịch vụ 5%',t-86400));
  // aiclone registrations
  [0,6,9,2].forEach(k => w.push(env.DB.prepare(`INSERT INTO aiclone (id,koc_id,status,created_at) VALUES (?,?,?,?)`)
    .bind(uid(),kocIds[k].id,'registered',t)));
  await env.DB.batch(w);

  await seedExtras(env);
}

// Idempotent: seed KOL profiles + one affiliate booking demo. Runs on every boot but only
// inserts when the tables are empty — so already-seeded (pre-v11) DBs get backfilled too.
export async function seedExtras(env) {
  await seedQcFixtures(env);
  const kolCount = Number(await env.DB.prepare('SELECT COUNT(*) c FROM kol_profiles').first('c'))||0;
  if (kolCount > 0) return;
  const t = now();
  // ---- KOL / nghệ sĩ profiles (quote-request flow) ----
  const kolDefs = [
    ['Sơn Tùng M-TP','Ca sĩ / Nghệ sĩ','~15 triệu fan',[['YouTube','sontungmtp'],['Instagram','@sontungmtp']],500000000,1,1],
    ['Trấn Thành','MC / Diễn viên','~12 triệu fan',[['Facebook','Trấn Thành'],['TikTok','@tranthanh']],400000000,1,1],
    ['Chi Pu','Ca sĩ / Diễn viên','~8 triệu fan',[['Instagram','@chipublic']],250000000,1,1],
    ['Độ Mixi','Streamer','~5 triệu fan',[['YouTube','MixiGaming']],120000000,0,0],
    ['Ninh Dương Lan Ngọc','Diễn viên','~6 triệu fan',[['Instagram','@lanngoc']],180000000,1,0],
  ];
  const kw = [];
  kolDefs.forEach((d,i)=>{
    const [name,field,fanbase,channels,ref,hidden,premium] = d;
    kw.push(env.DB.prepare(`INSERT INTO kol_profiles (id,name,field,fanbase,channels,media_kit,ref_price,price_hidden,premium,avatar,bio,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(uid(),name,field,fanbase,JSON.stringify(channels.map(c=>({platform:c[0],handle:c[1]}))),
        'https://netviet.vn/mediakit/'+i+'.pdf',ref,hidden,premium,`https://i.pravatar.cc/150?u=kol${i}`,
        `${field} hàng đầu Việt Nam. Booking qua yêu cầu báo giá.`,'active',t-i*3600));
  });
  await env.DB.batch(kw);

  // ---- one affiliate booking demo (accepted → link generated → orders). Look up real ids. ----
  const koc = await env.DB.prepare(`SELECT id FROM kocs WHERE status='active' AND categories LIKE '%Mỹ phẩm%' ORDER BY followers ASC LIMIT 1`).first()
    || await env.DB.prepare(`SELECT id FROM kocs WHERE status='active' LIMIT 1`).first();
  const biz = await env.DB.prepare('SELECT id FROM businesses LIMIT 1').first();
  if (!koc || !biz) return; // no base data yet
  const kocId = koc.id, bizId = biz.id;
  const affBkId = uid();
  const affLinkId = uid();
  const trackCode = 'kvsp'+kocId.slice(0,4);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO bookings (id,code,business_id,koc_id,category,price,escrow,product_link,requirements,deadline,status,type,booking_type,platform,product_url,commission_rate,platform_fee_rate,post_link,post_platform,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(affBkId,'AF'+String(200100),bizId,kocId,'Mỹ phẩm',0,0,
        'https://sanpham.demo.vn/serum-vitc','Review serum + gắn link affiliate Shopee, gắn #quangcao.','2025-09-15',
        'posted','marketplace','affiliate','Shopee','https://shopee.vn/serum-vitc-i.123.456',12,0.01,
        'https://tiktok.com/@ngocmai/video/aff1','TikTok',t-7200,t-3600),
    env.DB.prepare(`INSERT INTO affiliate_links (id,booking_id,koc_id,tracking_code,generated_url,platform,status,clicks,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(affLinkId,affBkId,kocId,trackCode,
        'https://shopee.vn/serum-vitc-i.123.456?aff_platform=Shopee&koc_id='+kocId+'&booking_id='+affBkId+'&sub_id='+trackCode,
        'Shopee','active',420,t-3600),
  ]);
  const ordDefs = [
    ['SP20100234',850000,'confirmed'],
    ['SP20100235',1200000,'pending'],
    ['SP20100236',600000,'cancelled'],
  ];
  const ow = [];
  ordDefs.forEach((o,i)=>{
    const gmv=o[1], comm=Math.round(gmv*0.12), fee=Math.round(gmv*0.01);
    ow.push(env.DB.prepare(`INSERT INTO affiliate_orders (id,affiliate_link_id,koc_id,booking_id,platform_order_id,gmv,commission_amount,platform_fee,status,ip,device,flagged,ordered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(uid(),affLinkId,kocId,affBkId,o[0],gmv,comm,fee,o[2],'113.161.0.'+i,'Chrome/Android',0,t-1800*(i+1)));
    if (o[2]!=='cancelled') ow.push(env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(uid(),kocId,'commission',comm,'pending',`Hoa hồng affiliate AF200100 · đơn ${o[0]}`,t-1800*(i+1)));
  });
  await env.DB.batch(ow);
}

// Additive, idempotent fixtures for KOC acceptance/QC flows. Kept separate from
// the original seed guard so existing local databases also receive the scenarios.
export async function seedQcFixtures(env) {
  const demoAccountIds = await ensureDemoAccountIds(env);
  const demoUser = demoAccountIds.koc
    ? await env.DB.prepare(
        `SELECT id,koc_id FROM users WHERE id=? AND role='koc'`,
      ).bind(demoAccountIds.koc).first()
    : null;
  const business = await env.DB.prepare(
    `SELECT b.id FROM users u JOIN businesses b ON b.id=u.business_id
     WHERE u.id=? AND u.role='business' LIMIT 1`,
  ).bind(demoAccountIds.business || "").first()
    || await env.DB.prepare(`SELECT id FROM businesses ORDER BY created_at DESC LIMIT 1`).first();
  if (!demoUser?.koc_id || !business?.id) return;

  const t = now();
  const kocId = demoUser.koc_id;
  const bizId = business.id;
  // Keep legacy demo profiles editable even when they predate payout columns.
  await env.DB.prepare(
    `UPDATE kocs SET
       email=COALESCE(NULLIF(email,''),'koc@demo.vn'),
       bank_name=COALESCE(NULLIF(bank_name,''),'Vietcombank'),
       bank_bin=COALESCE(NULLIF(bank_bin,''),'970436'),
       bank_account=COALESCE(NULLIF(bank_account,''),'0123456789'),
       bank_owner=COALESCE(NULLIF(bank_owner,''),'NGUYEN THU HA')
     WHERE id=?`
  ).bind(kocId).run();

  const marker = await env.DB.prepare(`SELECT v FROM _meta WHERE k='qc_fixtures_v1'`).first();
  if (marker) {
    // Older local fixtures selected the oldest business record (Vietravel),
    // while the only demo business account belongs to Cocoon. Keep these
    // exact fixture bookings reachable from the account used to test them.
    await env.DB.prepare(
      `UPDATE bookings SET business_id=?,updated_at=?
       WHERE code IN ('AF-QC-001','CB-QC-001')`,
    ).bind(bizId, now()).run();
    return;
  }

  // Existing fixed-fee data now explicitly demonstrates both Review and Quảng cáo.
  const fixed = await env.DB.prepare(
    `SELECT id FROM bookings WHERE koc_id=? AND COALESCE(booking_type,'ad')='ad'
     ORDER BY created_at ASC, rowid ASC`
  ).bind(kocId).all();
  for (let i = 0; i < fixed.results.length; i++) {
    await env.DB.prepare(`UPDATE bookings SET content_type=? WHERE id=?`)
      .bind(i % 2 === 0 ? 'review' : 'advertising', fixed.results[i].id).run();
  }

  const affiliateBookingId = uid();
  const comboBookingId = uid();
  const affiliateLinkId = uid();
  const comboLinkId = uid();
  const affiliateCode = 'AF-QC-001';
  const comboCode = 'CB-QC-001';

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO bookings (id,code,business_id,koc_id,category,price,escrow,product_link,requirements,deadline,status,type,booking_type,content_type,platform,product_url,commission_rate,platform_fee_rate,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(affiliateBookingId, affiliateCode, bizId, kocId, 'Mỹ phẩm', 0, 0,
      'https://sanpham.demo.vn/affiliate-qc', 'Video trải nghiệm và gắn link affiliate.', '2026-08-15',
      'confirmed', 'marketplace', 'affiliate', 'affiliate', 'Shopee',
      'https://shopee.vn/san-pham-affiliate-qc', 12, 0.01, t - 7200, t - 7000),
    env.DB.prepare(
      `INSERT INTO bookings (id,code,business_id,koc_id,category,price,escrow,product_link,requirements,deadline,status,type,booking_type,content_type,platform,product_url,commission_rate,platform_fee_rate,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(comboBookingId, comboCode, bizId, kocId, 'Thời trang', 9000000, 9000000,
      'https://sanpham.demo.vn/combo-qc', 'Review sản phẩm kết hợp quảng cáo và affiliate.', '2026-08-20',
      'pending', 'marketplace', 'combo', 'combo', 'TikTok Shop',
      'https://shop.tiktok.com/view/product/combo-qc', 10, 0.01, t - 3600, t - 3500),
    env.DB.prepare(
      `INSERT INTO affiliate_links (id,booking_id,koc_id,tracking_code,generated_url,platform,status,clicks,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(affiliateLinkId, affiliateBookingId, kocId, 'qcaff001',
      `https://shopee.vn/san-pham-affiliate-qc?sub_id=qcaff001`, 'Shopee', 'active', 186, t - 6800),
    env.DB.prepare(
      `INSERT INTO affiliate_links (id,booking_id,koc_id,tracking_code,generated_url,platform,status,clicks,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(comboLinkId, comboBookingId, kocId, 'qccombo001',
      `https://shop.tiktok.com/view/product/combo-qc?sub_id=qccombo001`, 'TikTok Shop', 'active', 92, t - 3400),
  ]);

  const orderDefs = [
    ['QC-ORDER-EXPECTED', 800000, 96000, 'pending', t - 6000],
    ['QC-ORDER-RECONCILED', 1250000, 150000, 'confirmed', t - 5200],
    ['QC-ORDER-CANCELLED', 640000, 76800, 'cancelled', t - 4400],
    ['QC-ORDER-REFUNDED', 980000, 117600, 'refunded', t - 3600],
  ];
  const orderStatements = [];
  for (const [orderId, gmv, commission, status, orderedAt] of orderDefs) {
    orderStatements.push(env.DB.prepare(
      `INSERT INTO affiliate_orders (id,affiliate_link_id,koc_id,booking_id,platform_order_id,gmv,commission_amount,platform_fee,status,ip,device,flagged,ordered_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(uid(), affiliateLinkId, kocId, affiliateBookingId, orderId, gmv, commission,
      Math.round(gmv * 0.01), status, '113.161.20.10', 'Chrome/Android', 0, orderedAt));
  }

  orderStatements.push(
    env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(uid(), kocId, 'commission', 96000, 'expected', `Hoa hồng dự kiến ${affiliateCode} · đơn QC-ORDER-EXPECTED`, t - 6000),
    env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(uid(), kocId, 'commission', 150000, 'reconciled', `Hoa hồng đã đối soát ${affiliateCode} · đơn QC-ORDER-RECONCILED`, t - 5200),
    env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(uid(), kocId, 'commission', 210000, 'paid', `Hoa hồng đã thanh toán kỳ trước`, t - 90000),
    env.DB.prepare(`INSERT INTO wallet_tx (id,koc_id,type,amount,status,note,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(uid(), kocId, 'commission', 117600, 'refunded', `Hoa hồng bị hoàn · đơn QC-ORDER-REFUNDED`, t - 3500),
    env.DB.prepare(`INSERT INTO notifications (id,user_id,type,title,message,href,is_read,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(uid(), demoUser.id, 'booking', 'Booking Combo mới', `${comboCode} đang chờ bạn xác nhận.`, '#/bookings', 0, t - 3300),
    env.DB.prepare(`INSERT INTO notifications (id,user_id,type,title,message,href,is_read,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(uid(), demoUser.id, 'commission', 'Hoa hồng đã đối soát', '150.000đ từ đơn QC-ORDER-RECONCILED đã được đối soát.', '#/wallet', 0, t - 2500),
    env.DB.prepare(`INSERT INTO notifications (id,user_id,type,title,message,href,is_read,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(uid(), demoUser.id, 'refund', 'Đơn affiliate đã hoàn', 'QC-ORDER-REFUNDED đã hoàn; hoa hồng 117.600đ không được ghi nhận.', '#/affiliate', 1, t - 1800),
    env.DB.prepare(`INSERT INTO _meta (k,v) VALUES ('qc_fixtures_v1','done')`)
  );
  await env.DB.batch(orderStatements);
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
