import assert from 'node:assert/strict'
import test from 'node:test'
import { signJwt } from './lib/jwt.js'
import { route } from './routes.js'

class AiCloneTestDb {
  eligible = [{ id: 'koc-1', name: 'Nguyễn Thu Hà' }, { id: 'koc-2', name: 'Lê Phương Anh' }]
  inserts: unknown[][] = []
  booking: Record<string, unknown> | null = null
  prepare(sql: string) {
    let values: unknown[] = []
    const db = this
    const statement = {
      bind(...args: unknown[]) { values = args; return statement },
      async first() {
        if (sql.includes('SELECT * FROM users WHERE id=?')) return {
          id: 'business-user', role: 'business', business_id: 'business-1',
          status: 'active', session_version: 0,
        }
        if (sql.includes('SELECT * FROM bookings')) return db.booking
        return null
      },
      async all() {
        if (sql.includes('FROM kocs k')) {
          // Neither selected KOC has a listed price for the requested category.
          assert.ok(!sql.includes('koc_prices'))
          return { results: db.eligible }
        }
        return { results: [] }
      },
      async run() {
        if (sql.includes('INSERT INTO bookings')) db.inserts.push(values)
        else assert.ok(sql.includes('INSERT INTO audit_log'), `Unexpected write: ${sql}`)
        return { meta: { changes: 1 } }
      },
    }
    return statement
  }
  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    return Promise.all(statements.map(statement => statement.run()))
  }
}

async function post(db: AiCloneTestDb, path: string, body: object) {
  const secret = 'aiclone-test-secret-at-least-32-bytes-long'
  const timestamp = Math.floor(Date.now() / 1000)
  const token = await signJwt({
    iss: 'koc-viet', aud: 'koc-viet-web', sub: 'business-user', role: 'business',
    sv: 0, iat: timestamp, exp: timestamp + 300, jti: 'aiclone-test',
  }, secret)
  const request = new Request(`http://localhost${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `kv_session=${token}` },
    body: JSON.stringify(body),
  })
  return route(request, { DB: db, JWT_SECRET: secret } as never, new URL(request.url))
}

const brief = {
  koc_ids: ['koc-1', 'koc-2'], category: 'Mẹ & Bé', format: 'review',
  product_link: 'https://example.com/product', requirements: 'Nội dung đánh giá sản phẩm',
  deadline: '2027-01-01', scope: 'standard', video_quantity: 1,
}

for (const format of ['review', 'combo', 'affiliate']) {
  test(`AI Clone ${format} accepts an unpriced category without charging the business`, async () => {
    const db = new AiCloneTestDb()
    const response = await post(db, '/api/aiclone/bookings', {
      ...brief, format, platform: 'Shopee', product_url: 'https://example.com/product', commission_rate: 10,
    })
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.equal(result.quotePending, true)
    assert.equal(result.paymentRequired, false)
    assert.equal(result.bookings.length, 2)
    assert.equal(db.inserts.length, 2)
    for (const booking of result.bookings) {
      assert.equal(booking.status, 'quote_pending')
      assert.equal(booking.price, 0)
      assert.equal(booking.estimated_price, null)
      assert.equal(booking.koc_fee, null)
    }
    for (const row of db.inserts) {
      assert.equal(row[4], 'Mẹ & Bé')
      assert.equal(row[5], 0)
      assert.equal(row[6], 0)
      assert.equal(row[10], 'quote_pending')
    }
  })
}

test('AI Clone rejects a batch if a KOC is no longer eligible', async () => {
  const db = new AiCloneTestDb()
  db.eligible = db.eligible.slice(0, 1)
  assert.equal((await post(db, '/api/aiclone/bookings', brief)).status, 400)
  assert.equal(db.inserts.length, 0)
})

test('AI Clone still validates the brief before creating requests', async () => {
  const db = new AiCloneTestDb()
  assert.equal((await post(db, '/api/aiclone/bookings', { ...brief, requirements: 'short' })).status, 400)
  assert.equal(db.inserts.length, 0)
})

test('pending requests cannot be accepted or paid, even with a stale price', async () => {
  const db = new AiCloneTestDb()
  db.booking = { id: 'booking-1', type: 'aiclone', status: 'quote_pending', price: 100000 }
  assert.equal((await post(db, '/api/aiclone/quote-response', { id: 'booking-1', action: 'accept' })).status, 400)
  assert.equal((await post(db, '/api/booking/payment-link', { booking_id: 'booking-1' })).status, 400)
})

test('accepting a zero-value official quote is rejected before wallet operations', async () => {
  const db = new AiCloneTestDb()
  db.booking = { id: 'booking-1', type: 'aiclone', status: 'quote_sent', price: 0 }
  const response = await post(db, '/api/aiclone/quote-response', { id: 'booking-1', action: 'accept' })
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /Báo giá chính thức không hợp lệ/)
})
