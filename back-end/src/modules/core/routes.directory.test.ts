import assert from 'node:assert/strict'
import test from 'node:test'
import { route } from './routes.js'
import { signJwt } from './lib/jwt.js'

// Capture the count and list queries at the route boundary: neither may
// silently include a different field (for example, "khoa" in an email).
async function directoryQueries(params: string) {
  const calls: Array<{sql: string; values: unknown[]}> = []
  const database = {
    prepare(sql: string) {
      const call = {sql, values: [] as unknown[]}
      calls.push(call)
      const statement = {
        bind(...values: unknown[]) { call.values = values; return statement },
        async first(column?: string) {
          if (sql.includes('SELECT * FROM users WHERE id=?')) return {
            id:'admin-test',role:'admin',status:'active',session_version:0,
          }
          if (sql.includes('COUNT(*)')) return column ? 0 : {c:0}
          return null
        },
        async all() { return {results:[]} },
      }
      return statement
    },
  }
  const secret = 'directory-test-secret-at-least-32-bytes-long'
  const now = Math.floor(Date.now()/1000)
  const token = await signJwt({iss:'koc-viet',aud:'koc-viet-web',sub:'admin-test',role:'admin',sv:0,iat:now,exp:now+300,jti:'directory-test'},secret)
  const request = new Request('http://localhost/api/admin/kocs?'+params,{headers:{Cookie:`kv_session=${token}`}})
  const response = await route(request,{DB:database,JWT_SECRET:secret} as never,new URL(request.url))
  assert.equal(response.status,200)
  return calls.filter(call=>call.sql.includes('FROM kocs'))
}

test('KOC directory defaults to name only for both results and total', async () => {
  const calls = await directoryQueries('search=khoa')
  assert.equal(calls.length,2)
  for (const {sql,values} of calls) {
    assert.match(sql,/concat_ws\(' ', name\)/)
    assert.doesNotMatch(sql,/email|phone/)
    assert.equal(values[0],'%khoa%')
  }
})

test('full Vietnamese name uses normalized words with status and pagination', async () => {
  const query = new URLSearchParams({search:'  NGUYỄN  hồ việt Khoa ',status:'active',page:'2'})
  const calls = await directoryQueries(query.toString())
  for (const call of calls) {
    assert.deepEqual(call.values.slice(0,5),['active','%nguyen%','%ho%','%viet%','%khoa%'])
    assert.match(call.sql,/status=\?/)
  }
  assert.deepEqual(calls[1].values.slice(-2),[10,10])
})

test('contact search requires an explicit allowed field', async () => {
  for (const field of ['email','phone','name) OR 1=1 --']) {
    const calls = await directoryQueries(new URLSearchParams({search:'khoa',searchBy:field}).toString())
    const expected = field === 'email' || field === 'phone' ? field : 'name'
    for (const call of calls) assert.ok(call.sql.includes(`concat_ws(' ', ${expected})`))
  }
})
