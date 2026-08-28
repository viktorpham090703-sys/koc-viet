import assert from 'node:assert/strict'
import test from 'node:test'
import { signJwt } from './lib/jwt.js'
import { route } from './routes.js'

class NotificationTestDb {
  booking = {
    id: 'booking-1',
    code: 'RV123456',
    business_id: 'business-1',
    koc_id: 'koc-1',
    status: 'pending',
    type: 'marketplace',
    booking_type: 'ad',
  }

  notifications: Array<{ userId: string; title: string; href: string }> = []

  prepare(sql: string) {
    const database = this
    let values: unknown[] = []
    const statement = {
      bind(...bound: unknown[]) {
        values = bound
        return statement
      },
      async first(field?: string) {
        let row: Record<string, unknown> | null = null
        if (sql.includes('SELECT * FROM users WHERE id=?')) {
          row = {
            id: 'koc-user-1',
            email: 'koc@example.com',
            role: 'koc',
            name: 'KOC Test',
            koc_id: 'koc-1',
            status: 'active',
            session_version: 0,
          }
        } else if (sql.includes('SELECT * FROM bookings WHERE id=?')) {
          row = { ...database.booking }
        }
        return field ? row?.[field] ?? null : row
      },
      async all() {
        if (sql.includes("WHERE role='business' AND business_id=?")) {
          return { results: [{ id: 'business-user-1' }] }
        }
        if (sql.includes("WHERE role='koc' AND koc_id=?")) {
          return { results: [{ id: 'koc-user-1' }] }
        }
        return { results: [] }
      },
      async run() {
        if (sql.startsWith('UPDATE bookings SET')) {
          database.booking.status = String(values[0])
        }
        if (sql.includes('INSERT INTO notifications')) {
          database.notifications.push({
            userId: String(values[1]),
            title: String(values[3]),
            href: String(values[5]),
          })
        }
        return { meta: { changes: 1 } }
      },
    }
    return statement
  }
}

test('KOC confirmation notifies the linked business account', async () => {
  const database = new NotificationTestDb()
  const secret = 'notification-test-secret-at-least-32-bytes-long'
  const timestamp = Math.floor(Date.now() / 1000)
  const token = await signJwt({
    iss: 'koc-viet',
    aud: 'koc-viet-web',
    sub: 'koc-user-1',
    role: 'koc',
    sv: 0,
    iat: timestamp,
    exp: timestamp + 300,
    jti: 'notification-test',
  }, secret)
  const request = new Request('http://localhost/api/booking/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `kv_session=${token}`,
    },
    body: JSON.stringify({ id: 'booking-1', action: 'confirm' }),
  })

  const response = await route(request, {
    DB: database,
    JWT_SECRET: secret,
  } as never, new URL(request.url))

  assert.equal(response.status, 200)
  assert.equal(database.booking.status, 'confirmed')
  assert.deepEqual(database.notifications, [{
    userId: 'business-user-1',
    title: 'KOC đã xác nhận booking',
    href: '#/orders',
  }])
})
