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

test('KOC notification search preserves global unread count and scopes both queries to the account', async () => {
  const statements: Array<{sql: string; values: unknown[]}> = []
  const database = {
    prepare(sql: string) {
      const call = {sql, values: [] as unknown[]}
      statements.push(call)
      const statement = {
        bind(...values: unknown[]) { call.values = values; return statement },
        async first(field?: string) {
          if (sql.includes('SELECT * FROM users WHERE id=?')) return {
            id:'koc-user-1', role:'koc', koc_id:'koc-1', status:'active', session_version:0,
          }
          if (sql.includes('COUNT(*)')) {
            const row = {count: sql.includes('is_read=0') ? '7' : '0'}
            return field ? row.count : row
          }
          return null
        },
        async all() { return {results: []} },
      }
      return statement
    },
  }
  const secret = 'notification-test-secret-at-least-32-bytes-long'
  const timestamp = Math.floor(Date.now() / 1000)
  const token = await signJwt({iss:'koc-viet',aud:'koc-viet-web',sub:'koc-user-1',role:'koc',sv:0,iat:timestamp,exp:timestamp+300,jti:'search-test'},secret)
  const request = new Request('http://localhost/api/notifications?search=khongtimthay&page=9', {headers:{Cookie:`kv_session=${token}`}})
  const response = await route(request,{DB:database,JWT_SECRET:secret} as never,new URL(request.url))
  assert.equal(response.status,200)
  assert.deepEqual(await response.json(), {notifications:[],unread:7,page:1,per:20,total:0,pages:1})
  const notificationQueries = statements.filter(call => call.sql.includes('FROM notifications'))
  assert.equal(notificationQueries.length,3)
  for (const call of notificationQueries) {
    assert.match(call.sql,/WHERE user_id=\?/)
    assert.equal(call.values[0],'koc-user-1')
  }
  const unreadQuery = notificationQueries.find(call => call.sql.includes('is_read=0'))!
  assert.deepEqual(unreadQuery.values,['koc-user-1'])
})

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
