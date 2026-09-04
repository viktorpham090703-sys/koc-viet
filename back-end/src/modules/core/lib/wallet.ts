// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
import { now } from '../db.js';

const OWNER_TYPES = new Set(['business', 'koc', 'platform', 'system', 'partner']);
const BUCKETS = new Set([
  'available',
  'escrow',
  'payout_pending',
  'cash_clearing',
  'revenue',
]);

function cleanPart(value, name) {
  const result = String(value || '').trim();
  if (!result || result.length > 180) throw new Error(`${name} không hợp lệ`);
  return result;
}

export function walletAccountId(ownerType, ownerId, bucket) {
  const type = cleanPart(ownerType, 'Loại chủ ví');
  const owner = cleanPart(ownerId, 'Chủ ví');
  const accountBucket = cleanPart(bucket, 'Loại số dư');
  if (!OWNER_TYPES.has(type)) throw new Error('Loại chủ ví không được hỗ trợ');
  if (!BUCKETS.has(accountBucket)) throw new Error('Loại số dư không được hỗ trợ');
  return `${type}:${owner}:${accountBucket}`;
}

export function walletAccount(ownerType, ownerId, bucket) {
  return {
    id: walletAccountId(ownerType, ownerId, bucket),
    ownerType,
    ownerId: String(ownerId),
    bucket,
  };
}

async function ensureAccounts(env, accounts) {
  const unique = [...new Map(accounts.map(account => [account.id, account])).values()];
  if (!unique.length) return;
  await env.DB.batch(unique.map(account =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO wallet_accounts
       (id,owner_type,owner_id,bucket,currency,balance,created_at,updated_at)
       VALUES (?,?,?,?,'VND',0,?,?)`,
    ).bind(
      account.id,
      account.ownerType,
      account.ownerId,
      account.bucket,
      now(),
      now(),
    )
  ));
}

function entryId(idempotencyKey) {
  return `wallet:${cleanPart(idempotencyKey, 'Khóa chống trùng')}`;
}

function validateEntry(postings) {
  if (!Array.isArray(postings) || postings.length < 2)
    throw new Error('Bút toán ví cần ít nhất hai vế');
  let total = 0;
  for (const posting of postings) {
    if (!posting?.account?.id) throw new Error('Tài khoản bút toán không hợp lệ');
    if (!Number.isSafeInteger(posting.amount) || posting.amount === 0)
      throw new Error('Số tiền bút toán không hợp lệ');
    total += posting.amount;
  }
  if (total !== 0) throw new Error('Bút toán ví không cân bằng');
}

export async function postWalletEntry(env, {
  idempotencyKey,
  eventType,
  referenceType,
  referenceId,
  note = '',
  postings,
}) {
  validateEntry(postings);
  await ensureAccounts(env, postings.map(posting => posting.account));
  const id = entryId(idempotencyKey);
  const createdAt = now();
  const statements = [
    env.DB.prepare(
      `INSERT OR IGNORE INTO journal_entries
       (id,event_type,reference_type,reference_id,idempotency_key,note,created_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(
      id,
      cleanPart(eventType, 'Loại sự kiện'),
      String(referenceType || '').slice(0, 80),
      String(referenceId || '').slice(0, 180),
      cleanPart(idempotencyKey, 'Khóa chống trùng'),
      String(note || '').slice(0, 500),
      createdAt,
    ),
  ];

  postings.forEach((posting, index) => {
    const postingId = `${id}:${index}`;
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO ledger_postings
         (id,journal_entry_id,account_id,amount,applied,created_at)
         SELECT ?,?,?,?,0,? WHERE EXISTS (
           SELECT 1 FROM journal_entries WHERE id=?
         )`,
      ).bind(postingId, id, posting.account.id, posting.amount, createdAt, id),
      env.DB.prepare(
        `UPDATE wallet_accounts
         SET balance=balance+(
           SELECT amount FROM ledger_postings WHERE id=? AND applied=0
         ),updated_at=?
         WHERE id=? AND EXISTS (
           SELECT 1 FROM ledger_postings WHERE id=? AND applied=0
         )`,
      ).bind(postingId, createdAt, posting.account.id, postingId),
      env.DB.prepare(
        `UPDATE ledger_postings SET applied=1 WHERE id=? AND applied=0`,
      ).bind(postingId),
    );
  });
  await env.DB.batch(statements);
  return { id, idempotent: true };
}

export async function transferWalletFunds(env, {
  idempotencyKey,
  eventType,
  referenceType,
  referenceId,
  note = '',
  source,
  destinations,
}) {
  if (!source?.id || !Array.isArray(destinations) || !destinations.length)
    throw new Error('Luồng chuyển ví không hợp lệ');
  const total = destinations.reduce((sum, item) => {
    if (!item?.account?.id || !Number.isSafeInteger(item.amount) || item.amount <= 0)
      throw new Error('Số tiền chuyển ví không hợp lệ');
    return sum + item.amount;
  }, 0);
  if (!Number.isSafeInteger(total) || total <= 0)
    throw new Error('Số tiền chuyển ví không hợp lệ');

  await ensureAccounts(env, [source, ...destinations.map(item => item.account)]);
  const id = entryId(idempotencyKey);
  const debitPostingId = `${id}:source`;
  const createdAt = now();
  const statements = [
    env.DB.prepare(
      `INSERT OR IGNORE INTO journal_entries
       (id,event_type,reference_type,reference_id,idempotency_key,note,created_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(
      id,
      cleanPart(eventType, 'Loại sự kiện'),
      String(referenceType || '').slice(0, 80),
      String(referenceId || '').slice(0, 180),
      cleanPart(idempotencyKey, 'Khóa chống trùng'),
      String(note || '').slice(0, 500),
      createdAt,
    ),
    env.DB.prepare(
      `INSERT OR IGNORE INTO ledger_postings
       (id,journal_entry_id,account_id,amount,applied,created_at)
       SELECT ?,?,?,?,0,?
       FROM wallet_accounts
       WHERE id=? AND balance>=? AND EXISTS (
         SELECT 1 FROM journal_entries WHERE id=?
       )`,
    ).bind(
      debitPostingId,
      id,
      source.id,
      -total,
      createdAt,
      source.id,
      total,
      id,
    ),
    env.DB.prepare(
      `UPDATE wallet_accounts
       SET balance=balance-?,updated_at=?
       WHERE id=? AND EXISTS (
         SELECT 1 FROM ledger_postings WHERE id=? AND applied=0
       )`,
    ).bind(total, createdAt, source.id, debitPostingId),
    env.DB.prepare(
      `UPDATE ledger_postings SET applied=1 WHERE id=? AND applied=0`,
    ).bind(debitPostingId),
  ];

  destinations.forEach((destination, index) => {
    const postingId = `${id}:destination:${index}`;
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO ledger_postings
         (id,journal_entry_id,account_id,amount,applied,created_at)
         SELECT ?,?,?,?,0,? WHERE EXISTS (
           SELECT 1 FROM ledger_postings WHERE id=?
         )`,
      ).bind(
        postingId,
        id,
        destination.account.id,
        destination.amount,
        createdAt,
        debitPostingId,
      ),
      env.DB.prepare(
        `UPDATE wallet_accounts
         SET balance=balance+?,updated_at=?
         WHERE id=? AND EXISTS (
           SELECT 1 FROM ledger_postings WHERE id=? AND applied=0
         )`,
      ).bind(
        destination.amount,
        createdAt,
        destination.account.id,
        postingId,
      ),
      env.DB.prepare(
        `UPDATE ledger_postings SET applied=1 WHERE id=? AND applied=0`,
      ).bind(postingId),
    );
  });

  await env.DB.batch(statements);
  const debit = await env.DB.prepare(
    `SELECT id FROM ledger_postings WHERE id=? LIMIT 1`,
  ).bind(debitPostingId).first();
  if (!debit) {
    const error = new Error('Số dư khả dụng không đủ');
    error.code = 'INSUFFICIENT_FUNDS';
    error.required = total;
    error.available = await walletBalance(env, source.ownerType, source.ownerId, source.bucket);
    throw error;
  }
  return { id, amount: total };
}

export async function walletBalance(env, ownerType, ownerId, bucket = 'available') {
  const account = walletAccount(ownerType, ownerId, bucket);
  await ensureAccounts(env, [account]);
  const row = await env.DB.prepare(
    `SELECT balance FROM wallet_accounts WHERE id=?`,
  ).bind(account.id).first();
  return Number(row?.balance || 0);
}

export async function walletBalances(env, ownerType, ownerId) {
  const buckets = ownerType === 'business'
    ? ['available', 'escrow']
    : ['available', 'payout_pending'];
  const accounts = buckets.map(bucket => walletAccount(ownerType, ownerId, bucket));
  await ensureAccounts(env, accounts);
  const placeholders = accounts.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT bucket,balance FROM wallet_accounts WHERE id IN (${placeholders})`,
  ).bind(...accounts.map(account => account.id)).all();
  return Object.fromEntries(buckets.map(bucket => [
    bucket,
    Math.max(0, Number(results.find(row => row.bucket === bucket)?.balance || 0)),
  ]));
}

export async function walletTransactions(env, ownerType, ownerId, limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));
  const { results } = await env.DB.prepare(
    `SELECT j.id,j.event_type,j.reference_type,j.reference_id,j.note,j.created_at,
            p.amount,a.bucket
     FROM ledger_postings p
     JOIN journal_entries j ON j.id=p.journal_entry_id
     JOIN wallet_accounts a ON a.id=p.account_id
     WHERE a.owner_type=? AND a.owner_id=? AND a.bucket='available'
       AND j.event_type!='legacy_opening'
     ORDER BY j.created_at DESC,j.rowid DESC
     LIMIT ?`,
  ).bind(ownerType, String(ownerId), safeLimit).all();
  return results;
}

export async function ensureKocWalletMigrated(env, kocId) {
  const ownerId = cleanPart(kocId, 'KOC');
  const marker = await env.DB.prepare(
    `SELECT owner_id FROM wallet_migrations
     WHERE owner_type='koc' AND owner_id=? LIMIT 1`,
  ).bind(ownerId).first();
  if (marker) return;

  const { results } = await env.DB.prepare(
    `SELECT type,amount,status FROM wallet_tx WHERE koc_id=?`,
  ).bind(ownerId).all();
  let openingBalance = 0;
  for (const transaction of results) {
    const amount = Number(transaction.amount || 0);
    if (transaction.type === 'withdraw') openingBalance -= amount;
    else if (['settled', 'reconciled', 'paid'].includes(transaction.status))
      openingBalance += amount;
  }
  openingBalance = Math.max(0, openingBalance);
  if (openingBalance > 0) {
    await postWalletEntry(env, {
      idempotencyKey: `legacy-opening:koc:${ownerId}`,
      eventType: 'legacy_opening',
      referenceType: 'koc',
      referenceId: ownerId,
      note: 'Số dư chuyển đổi từ ví KOC phiên bản cũ',
      postings: [
        {
          account: walletAccount('system', 'payos', 'cash_clearing'),
          amount: -openingBalance,
        },
        {
          account: walletAccount('koc', ownerId, 'available'),
          amount: openingBalance,
        },
      ],
    });
  } else {
    await ensureAccounts(env, [walletAccount('koc', ownerId, 'available')]);
  }
  await env.DB.prepare(
    `INSERT OR IGNORE INTO wallet_migrations
     (owner_type,owner_id,source_balance,migrated_at) VALUES ('koc',?,?,?)`,
  ).bind(ownerId, openingBalance, now()).run();
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
