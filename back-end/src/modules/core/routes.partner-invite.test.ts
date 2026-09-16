import assert from 'node:assert/strict';
import test from 'node:test';
import { route } from './routes.js';
import { signJwt } from './lib/jwt.js';

const SECRET = 'partner-invite-test-secret-at-least-32-bytes';

class MemoryKv {
  values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) || null; }
  async put(key: string, value: string) { this.values.set(key, value); }
  async delete(key: string) { this.values.delete(key); }
}

class PartnerInviteDb {
  user = {
    id: 'koc-user-1', role: 'koc', koc_id: 'koc-1', name: 'KOC Test',
    email: 'koc@example.com', status: 'active', session_version: 0,
  };
  invite = {
    id: 'invite-1', partner_id: 'partner-1', partner_name: 'Đối tác Test',
    partner_avatar: '', partner_status: 'active', created_at: 1_700_000_000,
    expires_at: Math.floor(Date.now() / 1000) + 3600, use_count: 0,
  };
  koc = { id: 'koc-1', name: 'KOC Test', status: 'active' };
  membership: null | { partner_id: string; status: string; partner_name: string } = null;

  prepare(sql: string) {
    let values: any[] = [];
    const statement = {
      bind: (...bound: any[]) => { values = bound; return statement; },
      first: async (field?: string) => {
        let row: any = null;
        if (sql.includes('SELECT * FROM users WHERE id=?')) row = { ...this.user };
        else if (sql.includes('FROM partner_invite_links pil')) row = { ...this.invite };
        else if (sql.includes('SELECT id,name,status FROM kocs')) row = { ...this.koc };
        else if (sql.includes('FROM partner_members pm JOIN partners p')) row = this.membership ? { ...this.membership } : null;
        return field ? row?.[field] ?? null : row;
      },
      all: async () => ({ results: [] }),
      run: async () => {
        if (sql.includes('INSERT INTO partner_members')) {
          this.membership = {
            partner_id: String(values[1]),
            status: 'active',
            partner_name: this.invite.partner_name,
          };
        }
        if (sql.includes('UPDATE partner_invite_links SET use_count')) this.invite.use_count++;
        return { meta: { changes: 1 } };
      },
    };
    return statement;
  }

  async batch(statements: any[]) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

async function inviteToken(db: PartnerInviteDb) {
  const timestamp = Math.floor(Date.now() / 1000);
  return signJwt({
    iss: 'koc-viet', aud: 'koc-viet-web', purpose: 'partner-invite',
    sub: db.invite.partner_id, jti: db.invite.id,
    iat: timestamp, exp: db.invite.expires_at,
  }, SECRET);
}

async function kocCookie() {
  const timestamp = Math.floor(Date.now() / 1000);
  const token = await signJwt({
    iss: 'koc-viet', aud: 'koc-viet-web', sub: 'koc-user-1', role: 'koc', sv: 0,
    iat: timestamp, exp: timestamp + 300, jti: 'partner-invite-session',
  }, SECRET);
  return `kv_session=${token}`;
}

async function call(db: PartnerInviteDb, path: string, body: any, authenticated = false) {
  const request = new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated ? { Cookie: await kocCookie() } : {}),
    },
    body: JSON.stringify(body),
  });
  const response = await route(request, { DB: db, KV: new MemoryKv(), JWT_SECRET: SECRET } as never, new URL(request.url));
  return { response, data: await response.json() as any };
}

test('partner invite preview is public and exposes only safe partner details', async () => {
  const db = new PartnerInviteDb();
  const result = await call(db, '/api/partner-invite/preview', { token: await inviteToken(db) });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.data.partner, { name: 'Đối tác Test', avatar: '' });
  assert.equal(result.data.viewerRole, null);
  assert.equal(result.data.membership, null);
});

test('active KOC can accept an invite and repeated acceptance is idempotent', async () => {
  const db = new PartnerInviteDb();
  const token = await inviteToken(db);
  let result = await call(db, '/api/partner-invite/accept', { token }, true);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.ok, true);
  assert.equal(db.membership?.partner_id, 'partner-1');
  assert.equal(db.invite.use_count, 1);

  result = await call(db, '/api/partner-invite/accept', { token }, true);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.alreadyMember, true);
  assert.equal(db.invite.use_count, 1);
});

test('invite cannot transfer a KOC that belongs to another partner', async () => {
  const db = new PartnerInviteDb();
  db.membership = { partner_id: 'partner-2', status: 'active', partner_name: 'Đối tác Khác' };
  const result = await call(db, '/api/partner-invite/accept', { token: await inviteToken(db) }, true);
  assert.equal(result.response.status, 409);
  assert.match(result.data.error, /Đối tác Khác/);
  assert.equal(db.invite.use_count, 0);
});
