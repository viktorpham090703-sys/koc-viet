import assert from 'node:assert/strict'
import test from 'node:test'
import { signJwt, verifyJwt } from './jwt.js'

const secret = 'test-only-jwt-secret-with-at-least-32-bytes'

test('signs and verifies an HS256 JWT', async () => {
  const now = Math.floor(Date.now() / 1000)
  const token = await signJwt({
    iss: 'koc-viet', aud: 'koc-viet-web', sub: 'user-1', role: 'koc', sv: 2,
    iat: now, exp: now + 60,
  }, secret)
  const payload = await verifyJwt(token, secret)
  assert.equal(payload?.sub, 'user-1')
  assert.equal(payload?.role, 'koc')
  assert.equal(payload?.sv, 2)
})

test('rejects tampered and expired JWTs', async () => {
  const now = Math.floor(Date.now() / 1000)
  const token = await signJwt({
    iss: 'koc-viet', aud: 'koc-viet-web', sub: 'user-1',
    iat: now - 120, exp: now - 60,
  }, secret)
  assert.equal(await verifyJwt(token, secret), null)
  assert.equal(await verifyJwt(`${token.slice(0, -1)}x`, secret), null)
})
