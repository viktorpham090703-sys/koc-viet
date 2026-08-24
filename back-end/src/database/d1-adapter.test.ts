import assert from 'node:assert/strict'
import test from 'node:test'
import { postgresSql } from './d1-adapter.js'

test('converts D1 placeholders without touching quoted question marks', () => {
  assert.equal(
    postgresSql("SELECT '?' AS literal, id FROM users WHERE email=? AND status=?"),
    "SELECT '?' AS literal, id FROM users WHERE email=$1 AND status=$2",
  )
})

test('converts PRAGMA table_info to PostgreSQL information_schema', () => {
  assert.equal(
    postgresSql('PRAGMA table_info(bookings)'),
    "SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bookings' ORDER BY ordinal_position",
  )
})

test('converts INSERT OR IGNORE and preserves a trailing semicolon', () => {
  assert.equal(
    postgresSql('INSERT OR IGNORE INTO _meta (k, v) VALUES (?, ?);'),
    'INSERT INTO _meta (k, v) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
  )
})

test('uses primary ids instead of SQLite rowid tie breakers', () => {
  assert.equal(
    postgresSql('SELECT * FROM bookings b ORDER BY b.rowid DESC'),
    'SELECT * FROM bookings b ORDER BY b.id DESC',
  )
})
