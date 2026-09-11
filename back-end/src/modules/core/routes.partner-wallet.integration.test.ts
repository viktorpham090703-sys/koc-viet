import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { PostgresD1Adapter } from '../../database/d1-adapter.js';
import { route } from './routes.js';
import { signJwt } from './lib/jwt.js';
import { now } from './db.js';

// TEST_DATABASE_URL must point to a local disposable PostgreSQL database.
// Every run owns a fresh schema; it never changes application rows or sends email.
test('partner wallet: OTP, holds, concurrent withdrawals, review and history on PostgreSQL', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  const schema = `test_partner_wallet_${randomUUID().replaceAll('-', '')}`;
  const control = new pg.Pool({ connectionString: url.href });
  await control.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: url.href, options: `-c search_path=${schema}`, max: 6 });
  const DB = new PostgresD1Adapter(pool);
  const env = { DB, JWT_SECRET: 'test-jwt-secret-with-at-least-32-characters', OTP_PEPPER: 'test-otp-secret-with-at-least-32-characters', KV: { get: async () => null, put: async () => {} } };
  try {
    await pool.query(`CREATE TABLE users (id text PRIMARY KEY,role text,email text,name text,status text DEFAULT 'active',session_version int DEFAULT 0,partner_id text,koc_id text);
      CREATE TABLE kocs (id text PRIMARY KEY,name text,email text,phone text,avatar text,bank_name text,bank_bin text,bank_account text,bank_owner text);
      CREATE TABLE wallet_tx (id text PRIMARY KEY,koc_id text,type text,amount bigint,status text,note text,created_at bigint);`);
    const migration = readFileSync(new URL('./db.ts', import.meta.url), 'utf8');
    for (const table of ['partners', 'partner_payout_tickets', 'wallet_accounts', 'journal_entries', 'ledger_postings', 'email_otp', 'audit_log', 'notifications']) {
      const ddl = migration.match(new RegExp('`(CREATE TABLE IF NOT EXISTS ' + table + ' \\([\\s\\S]*?)`'))?.[1];
      assert.ok(ddl, `runtime migration for ${table}`);
      await DB.exec(ddl);
    }
    await pool.query(`INSERT INTO partners(id,name,status,bank_name,bank_bin,bank_account,bank_owner,created_at,updated_at)
      VALUES ('p1','Đối tác A','active','Techcombank','970407','19031234567890','DOI TAC A',1,1),('p2','Đối tác B','active','Techcombank','970407','19039876543210','DOI TAC B',1,1);
      INSERT INTO users(id,role,email,name,partner_id) VALUES ('u1','partner','p1@example.test','Đối tác A','p1'),('u2','partner','p2@example.test','Đối tác B','p2'),('admin','admin','admin@example.test','Admin',NULL),('business','business','b@example.test','Business',NULL);
      INSERT INTO wallet_accounts(id,owner_type,owner_id,bucket,balance,created_at,updated_at) VALUES ('partner:p1:revenue','partner','p1','revenue',100000,1,1);`);
    const cookies: Record<string, string> = {};
    for (const [id, role] of [['u1', 'partner'], ['u2', 'partner'], ['admin', 'admin'], ['business', 'business']]) {
      cookies[id] = `kv_session=${await signJwt({ iss: 'koc-viet', aud: 'koc-viet-web', sub: id, role, sv: 0, iat: now(), exp: now() + 3600 }, env.JWT_SECRET)}`;
    }
    async function call(path: string, user = 'u1', body?: unknown) {
      const url = new URL('http://localhost' + path);
      const res = await route(new Request(url, { method: body ? 'POST' : 'GET', headers: { Cookie: cookies[user], 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), env, url);
      return { status: res.status, data: await res.json() };
    }
    async function otp() {
      const id = randomUUID();
      const code = '123456';
      const hash = createHmac('sha256', env.OTP_PEPPER).update(`${id}\np1@example.test\npartner_withdraw\n${code}`).digest('hex');
      await pool.query('DELETE FROM email_otp');
      await DB.prepare('INSERT INTO email_otp(id,email,purpose,code,verified,attempts,expires_at,created_at) VALUES (?,?,?,?,0,0,?,?)')
        .bind(id, 'p1@example.test', 'partner_withdraw', `hmac_sha256$${hash}`, now() + 300, now()).run();
      return code;
    }
    async function balances() {
      const rows = (await pool.query("SELECT bucket,balance FROM wallet_accounts WHERE owner_type='partner' AND owner_id='p1'")).rows;
      return Object.fromEntries(rows.map(r => [r.bucket, Number(r.balance)]));
    }
    const withdraw = (amount: number, code: string, user = 'u1') => call('/api/partner/wallet/withdraw', user, { amount, otp: code, partner_id: 'p1' });
    const reject = (id: string) => call('/api/admin/payout-tickets/reject', 'admin', { id, reason: 'Sai thông tin' });
    const approve = (id: string) => call('/api/admin/payout-tickets/approve', 'admin', { id, reference_code: 'BANK123' });

    assert.equal((await withdraw(10000, '123456', 'business')).status, 403);
    assert.equal((await withdraw(10000, '123456', 'u2')).status, 400); // Cannot spend p1's balance.
    for (const amount of [-1, 9999, 10000.5, Number.MAX_SAFE_INTEGER + 1, 100001]) {
      assert.equal((await withdraw(amount, '123456')).status, 400);
    }
    await otp();
    await pool.query('UPDATE email_otp SET expires_at=1');
    assert.equal((await withdraw(10000, '123456')).status, 400);
    await otp();
    await pool.query("UPDATE email_otp SET purpose='withdraw'");
    assert.equal((await withdraw(10000, '123456')).status, 400);
    await otp();
    assert.equal((await withdraw(10000, '000000')).status, 400);
    assert.equal((await pool.query('SELECT attempts FROM email_otp')).rows[0].attempts, 1);
    await pool.query("UPDATE partners SET bank_owner='' WHERE id='p1'");
    assert.equal((await withdraw(10000, '123456')).status, 400);
    await pool.query("UPDATE partners SET bank_owner='DOI TAC A' WHERE id='p1'");

    const code = await otp();
    const requests = await Promise.all([withdraw(30000, code), withdraw(30000, code)]);
    assert.deepEqual(requests.map(r => r.status).sort(), [200, 400]); // A valid OTP can be consumed once.
    const first = requests.find(r => r.status === 200)!.data.ticketId;
    assert.deepEqual(await balances(), { revenue: 70000, payout_pending: 30000 });
    let history = await call('/api/partner/wallet');
    assert.equal(history.data.rows.length, 1);
    assert.equal(history.data.rows[0].status, 'pending_review');
    assert.equal(history.data.balance, 70000);
    assert.equal((await call('/api/partner/wallet', 'u2')).data.rows.length, 0);
    const admin = await call('/api/admin/payout-tickets?status=pending', 'admin');
    assert.equal(admin.data.pendingCount, 1);
    assert.equal(admin.data.tickets[0].owner_type, 'partner');
    assert.match(admin.data.tickets[0].vietqr_url, /970407-19031234567890/);
    assert.equal((await call('/api/admin/payout-tickets/approve', 'u1', { id: first })).status, 404);
    assert.equal((await reject(first)).status, 200);
    assert.deepEqual(await balances(), { revenue: 100000, payout_pending: 0 });
    assert.equal((await approve(first)).status, 409);

    const second = (await withdraw(80000, await otp())).data.ticketId;
    assert.equal((await withdraw(30000, await otp())).status, 400);
    await pool.query("UPDATE partners SET bank_account='19030000000000' WHERE id='p1'");
    const snapshot = await call('/api/admin/payout-tickets?status=pending', 'admin');
    assert.equal(snapshot.data.tickets[0].bank_account, '19031234567890');
    const decisions = await Promise.all([approve(second), reject(second)]);
    assert.deepEqual(decisions.map(r => r.status).sort(), [200, 409]);
    const paid = (await pool.query('SELECT status FROM partner_payout_tickets WHERE id=$1', [second])).rows[0].status === 'settled';
    assert.deepEqual(await balances(), { revenue: paid ? 20000 : 100000, payout_pending: 0 });
    history = await call('/api/partner/wallet?page=999');
    assert.equal(history.data.rows.length, 2); // No duplicate ledger payment in history.
    assert.equal(history.data.page, 1);
    assert.equal((await call('/api/admin/payout-tickets?status=pending', 'admin')).data.total, 0);
    assert.equal(Number((await pool.query('SELECT SUM(amount) sum FROM ledger_postings WHERE applied=1')).rows[0].sum), 0);

    const third = (await withdraw(10000, await otp())).data.ticketId;
    const beforePayment = await balances();
    assert.equal((await approve(third)).status, 200);
    assert.equal((await approve(third)).status, 409);
    assert.equal((await reject(third)).status, 409);
    assert.deepEqual(await balances(), { revenue: beforePayment.revenue, payout_pending: 0 });
    assert.equal(Number((await pool.query("SELECT balance FROM wallet_accounts WHERE id='system:manual:cash_clearing'")).rows[0].balance), paid ? 90000 : 10000);
    assert.equal((await call('/api/partner/wallet')).data.rows.length, 3);

    // A failed ledger write rolls back the ticket, consumed OTP and debit together.
    await pool.query("CREATE FUNCTION fail_payout() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test ledger failure'; END $$; CREATE TRIGGER fail_payout BEFORE INSERT ON ledger_postings FOR EACH ROW EXECUTE FUNCTION fail_payout()");
    const before = await balances();
    assert.equal((await withdraw(10000, await otp())).status, 500);
    assert.deepEqual(await balances(), before);
    assert.equal((await pool.query('SELECT verified FROM email_otp')).rows[0].verified, 0);
    assert.equal(Number((await pool.query('SELECT COUNT(*) count FROM partner_payout_tickets')).rows[0].count), 3);
  } finally {
    await pool.end();
    // The generated identifier is restricted to this run's test schema.
    assert.match(schema, /^test_partner_wallet_[a-f0-9]{32}$/);
    await control.query(`DROP SCHEMA ${schema} CASCADE`);
    await control.end();
  }
});
