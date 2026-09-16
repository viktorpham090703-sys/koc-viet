import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { route } from './routes.js';
import { signJwt } from './lib/jwt.js';

test('social change requests preserve the live channel until an admin reviews them', async () => {
  const sqlite = new DatabaseSync(':memory:');
  const migration = readFileSync(new URL('./db.ts', import.meta.url), 'utf8');
  for (const table of ['users', 'kocs', 'koc_prices', 'notifications', 'audit_log']) {
    const ddl = migration.match(new RegExp('`(CREATE TABLE IF NOT EXISTS ' + table + ' \\([\\s\\S]*?)`'))?.[1];
    assert.ok(ddl);
    sqlite.exec(ddl);
  }
  for (const match of migration.matchAll(/`(ALTER TABLE kocs ADD COLUMN [^`]+)`/g)) {
    if (!sqlite.prepare('PRAGMA table_info(kocs)').all().some((c) => c.name === match[1].split(' ')[5])) sqlite.exec(match[1]);
  }
  sqlite.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
    ALTER TABLE users ADD COLUMN updated_at INTEGER DEFAULT 1;
    INSERT INTO users(id,email,password,role,name,koc_id,created_at) VALUES
      ('koc-user','koc@example.test','','koc','KOC Test','koc',1),
      ('admin','admin@example.test','','admin','Admin',NULL,1),
      ('business','biz@example.test','','business','Business',NULL,1);`);
  const original = [{ platform: 'TikTok', handle: '@old', followers: 25000, verified: true, verificationSource: 'oauth2_tiktok' }];
  sqlite.prepare(`INSERT INTO kocs(id,name,tier,province,email,followers,followers_verified,socials,categories,status,created_at)
    VALUES ('koc','KOC Test','Micro','Hà Nội','koc@example.test',25000,1,?,'["Mỹ phẩm"]','active',1)`).run(JSON.stringify(original));
  const DB = {
    prepare(sql: string) {
      const prepared = sqlite.prepare(sql);
      let args: any[] = [];
      const statement = {
        bind(...values: any[]) { args = values; return statement; },
        async first(column?: string) { const row = prepared.get(...args); return column ? row?.[column] ?? null : row ?? null; },
        async all() { return { results: prepared.all(...args) }; },
        async run() { return { meta: { changes: Number(prepared.run(...args).changes) } }; },
      };
      return statement;
    },
    async batch(statements: Array<{ run: () => Promise<unknown> }>) { return Promise.all(statements.map((s) => s.run())); },
  };
  const env = { DB, JWT_SECRET: 'social-change-test-secret-at-least-32-characters', KV: { get: async () => null } };
  const cookies: Record<string, string> = {};
  for (const [id, role] of [['koc-user', 'koc'], ['admin', 'admin'], ['business', 'business']]) {
    const now = Math.floor(Date.now() / 1000);
    cookies[id] = `kv_session=${await signJwt({ iss: 'koc-viet', aud: 'koc-viet-web', sub: id, role, sv: 0, iat: now, exp: now + 300 }, env.JWT_SECRET)}`;
  }
  async function call(path: string, user: string, body?: unknown) {
    const url = new URL('http://localhost' + path);
    const res = await route(new Request(url, { method: body ? 'POST' : 'GET',
      headers: { Cookie: cookies[user] || '', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined }), env, url);
    return { status: res.status, data: await res.json() };
  }
  const profile = (handle = 'https://www.tiktok.com/@new') => ({
    email: 'koc@example.test', bio: 'Updated bio', province: 'Hà Nội',
    socials: [{ platform: 'TikTok', handle, followers: 9999999, verified: true }],
    categories: ['Mỹ phẩm'], prices: { 'Mỹ phẩm': 1000000 },
    bank: { name: 'Techcombank', bin: '970407', account: '19031234567890', owner: 'KOC TEST' },
  });
  const row = () => sqlite.prepare("SELECT * FROM kocs WHERE id='koc'").get()!;
  const request = () => JSON.parse(String(row().social_change_request));
  const notifyCount = () => sqlite.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id='admin'").get()!.n;
  try {
    assert.equal((await call('/api/koc/profile', '', profile())).status, 401);
    assert.equal((await call('/api/koc/profile', 'business', profile())).status, 403);
    assert.equal((await call('/api/koc/profile', 'koc-user', { ...profile(), prices: {} })).status, 400);
    assert.equal(row().social_change_request, null);
    const submitted = await call('/api/koc/profile', 'koc-user', profile());
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.social_change_pending, true);
    assert.deepEqual(JSON.parse(String(row().socials)), original);
    assert.equal(row().followers, 25000);
    assert.equal(row().bio, 'Updated bio');
    assert.equal(request().socials[0].verified, undefined);
    assert.equal(notifyCount(), 1);
    const firstId = request().id;
    assert.equal((await call('/api/koc/profile', 'koc-user', profile())).status, 200);
    assert.equal(request().id, firstId);
    assert.equal(notifyCount(), 1);
    assert.equal((await call('/api/koc/profile', 'koc-user', profile('https://tiktok.com/@other'))).status, 409);
    const unchangedProfile = { ...profile(), socials: [{ ...original[0], handle: 'https://www.tiktok.com/@old' }] };
    assert.equal((await call('/api/koc/profile', 'koc-user', unchangedProfile)).status, 200);
    assert.equal(request().id, firstId);
    assert.equal((await call('/api/koc/profile', 'koc-user')).data.koc.social_change_request.status, 'pending');
    assert.equal((await call('/api/admin/social-changes', 'admin')).data.requests.length, 1);
    assert.equal((await call('/api/admin/social-changes', 'koc-user')).status, 403);
    const review = { id: 'koc', request_id: firstId, action: 'approve', followers: 30000 };
    assert.equal((await call('/api/admin/social-changes/review', 'koc-user', review)).status, 403);
    assert.equal((await call('/api/admin/social-changes/review', 'admin', { ...review, request_id: 'stale' })).status, 409);
    assert.equal((await call('/api/admin/social-changes/review', 'admin', { ...review, followers: 999 })).status, 400);
    assert.equal((await call('/api/admin/social-changes/review', 'admin', { ...review, action: 'reject' })).status, 400);
    assert.equal((await call('/api/admin/social-changes/review', 'admin', { ...review, action: 'reject', reason: 'Cần chứng minh quyền sở hữu' })).status, 200);
    assert.deepEqual(JSON.parse(String(row().socials)), original);
    assert.equal(request().status, 'rejected');
    assert.equal((await call('/api/admin/social-changes/review', 'admin', review)).status, 409);
    assert.equal((await call('/api/koc/profile', 'koc-user', profile())).status, 200);
    const pendingReview = { ...review, request_id: request().id, followers: 150000 };
    const concurrent = await Promise.all([
      call('/api/admin/social-changes/review', 'admin', pendingReview),
      call('/api/admin/social-changes/review', 'admin', { ...pendingReview, action: 'reject', reason: 'Duplicate review' }),
    ]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
    assert.equal(row().followers, 150000);
    assert.equal(row().tier, 'Mid');
    const channel = JSON.parse(String(row().socials))[0];
    assert.equal(channel.handle, 'https://www.tiktok.com/@new');
    assert.equal(channel.followers, 150000);
    assert.equal(channel.verified, true);
    assert.equal(channel.verificationSource, 'manual_review');
    assert.equal((await call('/api/admin/social-changes', 'admin')).data.requests.length, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id='koc-user'").get()!.n, 2);

    const baseline = [...original, { platform: 'Instagram', handle: '@secondary', followers: 5000, verified: true }];
    const changes = [
      { name: 'primary followers only', socials: [{ ...baseline[0], followers: 40000 }, baseline[1]] },
      { name: 'primary account only', socials: [{ ...baseline[0], handle: '@another' }, baseline[1]] },
      { name: 'secondary account', socials: [baseline[0], { ...baseline[1], handle: '@another' }] },
      { name: 'secondary followers', socials: [baseline[0], { ...baseline[1], followers: 6000 }] },
      { name: 'added channel', socials: [...baseline, { platform: 'Threads', handle: '@third', followers: 2000 }] },
      { name: 'removed channel', socials: [baseline[0]] },
      { name: 'reordered primary', socials: [baseline[1], baseline[0]] },
    ];
    const reset = (verified: number) => sqlite.prepare(`UPDATE kocs SET socials=?,followers=25000,tier='Micro',followers_verified=?,social_change_request=NULL WHERE id='koc'`)
      .run(JSON.stringify(baseline), verified);
    for (const verified of [0, 1]) {
      for (const change of changes) {
        reset(verified);
        const result = await call('/api/koc/profile', 'koc-user', { ...profile(), socials: change.socials });
        assert.equal(result.status, 200, change.name);
        assert.equal(result.data.social_change_pending, true, `${change.name}, verified=${verified}`);
        assert.deepEqual(JSON.parse(String(row().socials)), baseline, change.name);
        assert.equal(row().followers, 25000);
        assert.equal(row().tier, 'Micro');
        assert.equal(row().followers_verified, verified);
        assert.equal(request().socials[0].verified, undefined);
        const approval = await call('/api/admin/social-changes/review', 'admin', {
          id: 'koc', request_id: request().id, action: 'approve', followers: change.socials[0].followers,
        });
        assert.equal(approval.status, 200);
        assert.equal(row().followers, change.socials[0].followers);
        assert.deepEqual(JSON.parse(String(row().socials)).map(({ platform, handle, followers }: { platform: string; handle: string; followers: number }) => ({ platform, handle, followers })),
          change.socials.map(({ platform, handle, followers }) => ({ platform, handle, followers })));
      }
    }
    reset(0);
    for (const invalid of [-1, 999, 1000.5, 2000000001, null, '', 'abc', true]) {
      assert.equal((await call('/api/koc/profile', 'koc-user', { ...profile(), socials: [{ ...baseline[0], followers: invalid }] })).status, 400);
      assert.equal(row().social_change_request, null);
    }
    assert.equal((await call('/api/koc/profile', 'koc-user', { ...profile(), socials: [] })).status, 400);
    assert.equal((await call('/api/koc/profile', 'koc-user', { ...profile(), socials: 'bad' })).status, 400);
    const noticesBefore = notifyCount();
    assert.equal((await call('/api/koc/profile', 'koc-user', { ...profile(), socials: baseline })).status, 200);
    assert.equal(row().social_change_request, null);
    assert.equal(notifyCount(), noticesBefore);
    const { socials: _, ...profileWithoutSocials } = profile();
    assert.equal((await call('/api/koc/profile', 'koc-user', profileWithoutSocials)).status, 200);
    assert.equal(row().social_change_request, null);
    assert.equal((await call('/api/koc/profile', 'koc-user', { ...profileWithoutSocials, followers: 35000 })).status, 200);
    assert.equal(request().socials[0].followers, 35000);
    assert.equal(row().followers, 25000);
    assert.equal((await call('/api/admin/social-changes/review', 'admin', {
      id: 'koc', request_id: request().id, action: 'reject', reason: 'Chưa đủ bằng chứng về số người theo dõi',
    })).status, 200);
    assert.equal(row().followers, 25000);
    assert.deepEqual(JSON.parse(String(row().socials)), baseline);
  } finally { sqlite.close(); }
});
