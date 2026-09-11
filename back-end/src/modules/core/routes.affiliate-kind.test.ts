import assert from 'node:assert/strict';
import test from 'node:test';
import { route } from './routes.js';
import { signJwt } from './lib/jwt.js';
import { bookingKindFilter } from './lib/bookingKind.js';

class AffiliateKindDb {
  queries: { sql: string; values: any[] }[] = [];

  prepare(sql: string) {
    let values: any[] = [];
    const statement = {
      bind: (...bound: any[]) => { values = bound; return statement; },
      first: async () => {
        if (sql.includes('SELECT * FROM users WHERE id=?')) {
          return { id: 'user-koc', role: 'koc', status: 'active', session_version: 0, koc_id: 'koc-1' };
        }
        if (sql.includes('FROM affiliate_orders')) {
          return { orders: 0, gmv: 0, commission: 0, valid_comm: 0, settled_comm: 0 };
        }
        return null;
      },
      all: async () => {
        this.queries.push({ sql, values });
        if (sql.includes('FROM affiliate_links al')) return { results: [{ id: 'link-1', clicks: 0 }] };
        return { results: [] };
      },
      run: async () => ({ meta: { changes: 1 } }),
    };
    return statement;
  }

  query(fragment: string) {
    return this.queries.find((q) => q.sql.includes(fragment));
  }
}

async function getAsKoc(db: AffiliateKindDb, path: string) {
  const secret = 'affiliate-kind-test-secret-at-least-32-bytes';
  const now = Math.floor(Date.now() / 1000);
  const token = await signJwt({
    iss: 'koc-viet', aud: 'koc-viet-web', sub: 'user-koc', role: 'koc', sv: 0,
    iat: now, exp: now + 300, jti: 'affiliate-kind-test',
  }, secret);
  const url = new URL(`http://localhost${path}`);
  const response = await route(new Request(url, {
    headers: { Cookie: `kv_session=${token}` },
  }), { DB: db, JWT_SECRET: secret } as never, url);
  return { response, data: await response.json() };
}

test('booking kind filter matches the KOC portal tabs and binds the requested kind', () => {
  assert.equal(bookingKindFilter(null), null);
  assert.equal(bookingKindFilter(''), null);
  assert.deepEqual(bookingKindFilter('aiclone'), { sql: "b.type='aiclone'", bindings: [] });
  for (const kind of ['review', 'advertising']) {
    const filter = bookingKindFilter(kind);
    assert.match(filter!.sql, /b\.type!='aiclone'/);
    assert.match(filter!.sql, /COALESCE\(b\.booking_type,'ad'\)='ad'/);
    assert.deepEqual(filter!.bindings, [kind]);
  }
  assert.deepEqual(bookingKindFilter('combo'), { sql: 'b.booking_type=?', bindings: ['combo'] });
  const injected = bookingKindFilter("affiliate' OR 1=1 --");
  assert.equal(injected!.sql, 'b.booking_type=?');
  assert.deepEqual(injected!.bindings, ["affiliate' OR 1=1 --"]);
});

test('affiliate links list filters by booking kind', async () => {
  const db = new AffiliateKindDb();
  const { response, data } = await getAsKoc(db, '/api/affiliate/links?type=combo');
  assert.equal(response.status, 200);
  assert.equal(data.links.length, 1);
  const q = db.query('FROM affiliate_links al');
  assert.ok(q);
  assert.match(q.sql, /WHERE al\.koc_id=\? AND b\.booking_type=\? ORDER BY/);
  assert.deepEqual(q.values, ['koc-1', 'combo']);
});

test('legacy affiliate list filters review bookings the same way as the Booking page', async () => {
  const db = new AffiliateKindDb();
  const { response } = await getAsKoc(db, '/api/affiliate?type=review');
  assert.equal(response.status, 200);
  const q = db.query('FROM affiliate a JOIN bookings b');
  assert.ok(q);
  assert.match(q.sql, /COALESCE\(b\.content_type,'review'\)=\?/);
  assert.deepEqual(q.values, ['koc-1', 'review']);
});

test('affiliate lists stay unfiltered on the "Tất cả" tab', async () => {
  const db = new AffiliateKindDb();
  await getAsKoc(db, '/api/affiliate/links');
  await getAsKoc(db, '/api/affiliate');
  const links = db.query('FROM affiliate_links al');
  const legacy = db.query('FROM affiliate a JOIN bookings b');
  assert.doesNotMatch(links!.sql, /booking_type=\?|b\.type/);
  assert.deepEqual(links!.values, ['koc-1']);
  assert.doesNotMatch(legacy!.sql, /booking_type|b\.type/);
  assert.deepEqual(legacy!.values, ['koc-1']);
});
