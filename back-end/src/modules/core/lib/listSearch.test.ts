import assert from 'node:assert/strict'
import test from 'node:test'
import { matchesSearch, sqlSearch, listPage } from './listSearch.js'
import { postgresSql } from '../../../database/d1-adapter.js'

test('Vietnamese search accepts accents, decomposed text and reordered words', () => {
  for (const query of ['nguyen dang', 'ĐẶNG Nguyễn', '  nguyễ\u0303n   đặng ']) {
    assert.equal(matchesSearch('Nguyễn Đặng — Mỹ phẩm', query), true)
  }
  assert.equal(matchesSearch('Nguyễn Đặng', 'nguyen lan'), false)
  assert.equal(matchesSearch(null, ''), true)
})

test('SQL search binds user input and treats wildcard characters literally', () => {
  const query = "Đặng 50% A_B c\\d ');DROP"
  const result = sqlSearch(['b.code', 'k.name'], query)
  assert.deepEqual(result.bindings, ['%dang%', '%50\\%%', '%a\\_b%', '%c\\\\d%', "%');drop%"])
  assert.equal(result.sql.includes('DROP'), false)
  const converted = postgresSql(`SELECT b.id FROM bookings b WHERE b.koc_id=? AND ${result.sql} LIMIT ? OFFSET ?`)
  assert.match(converted, /b.koc_id=\$1/)
  assert.match(converted, /LIMIT \$7 OFFSET \$8$/)
  assert.equal((converted.match(/ESCAPE/g) || []).length, 5)
  assert.throws(() => sqlSearch(['name); DROP TABLE users'], 'x'))
})

test('pagination stays valid after a search shrinks or empties the result set', () => {
  assert.deepEqual(listPage(new URLSearchParams('page=9&per=10'), 12), {page:2,per:10,total:12,pages:2})
  assert.deepEqual(listPage(new URLSearchParams('page=9&per=10'), 0), {page:1,per:10,total:0,pages:1})
  assert.deepEqual(listPage(new URLSearchParams('page=abc&per=abc'), 23, 20), {page:1,per:20,total:23,pages:2})
  assert.equal(listPage(new URLSearchParams('per=1000000'), 100).per, 50)
})
