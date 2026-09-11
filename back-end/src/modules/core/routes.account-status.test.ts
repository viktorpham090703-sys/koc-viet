import assert from 'node:assert/strict';
import test from 'node:test';
import { route } from './routes.js';
import { signJwt } from './lib/jwt.js';

class AccountStatusDb {
  admin = { id: 'admin-status', role: 'admin', status: 'active', session_version: 0 };
  koc = { id: 'koc-status', name: 'KOC Test', status: 'active' };
  partner = { id: 'partner-status', name: 'Đối tác Test', status: 'active' };
  users = {
    koc: { status: 'active', locked_at: null, locked_reason: null },
    partner: { status: 'active', locked_at: null, locked_reason: null },
  };

  prepare(sql: string) {
    let values: any[] = [];
    const statement = {
      bind: (...bound: any[]) => { values = bound; return statement; },
      first: async () => {
        if (sql.includes('SELECT * FROM users WHERE id=?')) return { ...this.admin };
        if (sql.includes('SELECT id,name,status FROM kocs')) return { ...this.koc };
        if (sql.includes('SELECT id,name,status FROM partners')) return { ...this.partner };
        return null;
      },
      run: async () => {
        if (sql.includes('UPDATE kocs SET status')) this.koc.status = values[0];
        if (sql.includes('UPDATE partners SET status')) this.partner.status = values[0];
        if (sql.includes("UPDATE users SET status=?") && sql.includes("role='koc'")) {
          this.users.koc = { status: values[0], locked_at: values[1], locked_reason: values[2] };
        }
        if (sql.includes("UPDATE users SET status=?") && sql.includes("role='partner'")) {
          this.users.partner = { status: values[0], locked_at: values[1], locked_reason: values[2] };
        }
        return { meta: { changes: 1 } };
      },
    };
    return statement;
  }

  async batch(statements: any[]) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

async function adminCookie(secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = await signJwt({
    iss: 'koc-viet', aud: 'koc-viet-web', sub: 'admin-status', role: 'admin', sv: 0,
    iat: now, exp: now + 300, jti: 'account-status-test',
  }, secret);
  return `kv_session=${token}`;
}

async function postStatus(db: AccountStatusDb, path: string, body: any) {
  const secret = 'account-status-test-secret-at-least-32-bytes';
  const url = new URL(`http://localhost${path}`);
  const response = await route(new Request(url, {
    method: 'POST',
    headers: { Cookie: await adminCookie(secret), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), { DB: db, JWT_SECRET: secret } as never, url);
  return { response, data: await response.json() };
}

test('admin locks and unlocks a KOC account with a Vietnamese reason', async () => {
  const db = new AccountStatusDb();
  let result = await postStatus(db, '/api/admin/kocs/status', {
    id: db.koc.id, action: 'lock', reason: 'Vi phạm chính sách nội dung',
  });
  assert.equal(result.response.status, 200);
  assert.equal(db.koc.status, 'locked');
  assert.equal(db.users.koc.status, 'locked');
  assert.equal(db.users.koc.locked_reason, 'Vi phạm chính sách nội dung');

  result = await postStatus(db, '/api/admin/kocs/status', { id: db.koc.id, action: 'unlock' });
  assert.equal(result.response.status, 200);
  assert.equal(db.koc.status, 'active');
  assert.equal(db.users.koc.status, 'active');
  assert.equal(db.users.koc.locked_reason, null);
});

test('admin locks and unlocks a partner account, while requiring a reason', async () => {
  const db = new AccountStatusDb();
  let result = await postStatus(db, '/api/admin/partners/status', {
    id: db.partner.id, action: 'lock', reason: 'Tài khoản cần rà soát',
  });
  assert.equal(result.response.status, 200);
  assert.equal(db.partner.status, 'locked');
  assert.equal(db.users.partner.status, 'locked');

  result = await postStatus(db, '/api/admin/partners/status', {
    id: db.partner.id, action: 'lock', reason: '',
  });
  assert.equal(result.response.status, 409);

  result = await postStatus(db, '/api/admin/partners/status', { id: db.partner.id, action: 'unlock' });
  assert.equal(result.response.status, 200);
  assert.equal(db.partner.status, 'active');
  assert.equal(db.users.partner.status, 'active');
});
