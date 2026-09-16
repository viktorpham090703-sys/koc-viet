// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
import { hashPassword } from './lib/password.js';

let _migrated = false;
let _migrationPromise = null;
const SCHEMA_GUARD_KEY = 'runtime_schema_guard';
const SCHEMA_GUARD_VERSION = '2026-09-16-social-change-requests-v1';

const BUSINESS_PRODUCT_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS business_products (
     id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL,
     product_url TEXT NOT NULL, platform TEXT, sku TEXT, price INTEGER NOT NULL DEFAULT 0,
     image_url TEXT, commission_rate REAL NOT NULL DEFAULT 0,
     affiliate_enabled INTEGER NOT NULL DEFAULT 1,
     status TEXT NOT NULL DEFAULT 'active', notes TEXT,
     created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
     UNIQUE(business_id, product_url) )`,
  `CREATE INDEX IF NOT EXISTS idx_business_products_business_updated
     ON business_products(business_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_business_products_business_status
     ON business_products(business_id, status)`,
];

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
     role TEXT NOT NULL, name TEXT NOT NULL, koc_id TEXT, business_id TEXT,
     session_version INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS kocs (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, tier TEXT NOT NULL DEFAULT 'Nano',
     province TEXT, avatar TEXT, bio TEXT, followers INTEGER DEFAULT 0, engagement REAL DEFAULT 0,
     categories TEXT DEFAULT '[]', socials TEXT DEFAULT '[]', status TEXT DEFAULT 'pending',
     accepting TEXT DEFAULT '{}', ai_clone INTEGER DEFAULT 0, rating REAL DEFAULT 0,
     reviews_count INTEGER DEFAULT 0, completed_bookings INTEGER DEFAULT 0,
     contract_hash TEXT, leader INTEGER DEFAULT 0, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS koc_prices (
     id TEXT PRIMARY KEY, koc_id TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS businesses (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, contact TEXT, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS bookings (
     id TEXT PRIMARY KEY, code TEXT NOT NULL, business_id TEXT NOT NULL, koc_id TEXT NOT NULL,
     category TEXT, price INTEGER NOT NULL, escrow INTEGER DEFAULT 0, product_link TEXT,
     requirements TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'pending', reject_reason TEXT,
     post_link TEXT, post_platform TEXT, type TEXT DEFAULT 'marketplace', video_link TEXT,
     rating INTEGER, review TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS wallet_tx (
     id TEXT PRIMARY KEY, koc_id TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL,
     status TEXT NOT NULL DEFAULT 'settled', note TEXT, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS affiliate (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, koc_id TEXT NOT NULL, short_code TEXT NOT NULL,
     clicks INTEGER DEFAULT 0, orders INTEGER DEFAULT 0, commission INTEGER DEFAULT 0 )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
     id TEXT PRIMARY KEY, business_id TEXT NOT NULL, budget INTEGER, qty INTEGER, tier TEXT,
     category TEXT, note TEXT, status TEXT DEFAULT 'pending', assigned TEXT DEFAULT '[]', created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS ledger (
     id TEXT PRIMARY KEY, kind TEXT NOT NULL, amount INTEGER NOT NULL, ref TEXT, note TEXT, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS aiclone (
     id TEXT PRIMARY KEY, koc_id TEXT NOT NULL, status TEXT DEFAULT 'registered', created_at INTEGER NOT NULL )`,
  // ---- v11: affiliate booking + KOL + leads (additive) ----
  `ALTER TABLE bookings ADD COLUMN booking_type TEXT DEFAULT 'ad'`,
  `ALTER TABLE bookings ADD COLUMN platform TEXT`,
  `ALTER TABLE bookings ADD COLUMN product_url TEXT`,
  `ALTER TABLE bookings ADD COLUMN commission_rate REAL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN platform_fee_rate REAL DEFAULT 0.01`,
  `CREATE TABLE IF NOT EXISTS affiliate_links (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, koc_id TEXT NOT NULL,
     tracking_code TEXT NOT NULL, generated_url TEXT NOT NULL, platform TEXT,
     status TEXT DEFAULT 'active', clicks INTEGER DEFAULT 0, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS affiliate_orders (
     id TEXT PRIMARY KEY, affiliate_link_id TEXT NOT NULL, koc_id TEXT NOT NULL,
     booking_id TEXT NOT NULL, platform_order_id TEXT NOT NULL, gmv INTEGER NOT NULL DEFAULT 0,
     commission_amount INTEGER NOT NULL DEFAULT 0, platform_fee INTEGER NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'pending', ip TEXT, device TEXT, flagged INTEGER DEFAULT 0,
     ordered_at INTEGER NOT NULL, settled_at INTEGER )`,
  `CREATE TABLE IF NOT EXISTS affiliate_settlements (
     id TEXT PRIMARY KEY, kind TEXT NOT NULL, koc_id TEXT, booking_id TEXT, order_id TEXT,
     amount INTEGER NOT NULL, note TEXT, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS kol_profiles (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, field TEXT, fanbase TEXT, channels TEXT DEFAULT '[]',
     media_kit TEXT, ref_price INTEGER DEFAULT 0, price_hidden INTEGER DEFAULT 1, premium INTEGER DEFAULT 0,
     avatar TEXT, bio TEXT, status TEXT DEFAULT 'active', created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS kol_requests (
     id TEXT PRIMARY KEY, kol_id TEXT NOT NULL, business_id TEXT NOT NULL, brief TEXT,
     budget INTEGER DEFAULT 0, status TEXT DEFAULT 'pending', quote INTEGER DEFAULT 0,
     admin_note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS quote_leads (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT, phone TEXT, email TEXT,
     need TEXT, source TEXT, status TEXT DEFAULT 'new', created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
     id TEXT PRIMARY KEY, actor TEXT, action TEXT NOT NULL, ref TEXT, detail TEXT, created_at INTEGER NOT NULL )`,
  // ---- v12: email OTP onboarding + KOC payout bank details (additive) ----
  `ALTER TABLE kocs ADD COLUMN email TEXT`,
  `ALTER TABLE kocs ADD COLUMN bank_name TEXT`,
  `ALTER TABLE kocs ADD COLUMN bank_account TEXT`,
  `ALTER TABLE kocs ADD COLUMN bank_owner TEXT`,
  `CREATE TABLE IF NOT EXISTS email_otp (
     id TEXT PRIMARY KEY, email TEXT NOT NULL, code TEXT NOT NULL, purpose TEXT NOT NULL DEFAULT 'onboard',
     verified INTEGER DEFAULT 0, attempts INTEGER DEFAULT 0, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL )`,
  // ---- v13: profile pages (cover images + business payout/tax fields) + complaints module (additive) ----
  `ALTER TABLE kocs ADD COLUMN cover TEXT`,
  `ALTER TABLE businesses ADD COLUMN avatar TEXT`,
  `ALTER TABLE businesses ADD COLUMN cover TEXT`,
  `ALTER TABLE businesses ADD COLUMN industry TEXT`,
  `ALTER TABLE businesses ADD COLUMN tax_code TEXT`,
  `ALTER TABLE businesses ADD COLUMN bank_name TEXT`,
  `ALTER TABLE businesses ADD COLUMN bank_account TEXT`,
  `ALTER TABLE businesses ADD COLUMN bank_owner TEXT`,
  `CREATE TABLE IF NOT EXISTS complaints (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, raised_by_role TEXT NOT NULL, raised_by_id TEXT,
     reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', admin_note TEXT, refunded INTEGER DEFAULT 0,
     created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  // ---- v14: business account administration (lock/unlock + audit metadata) ----
  `ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`,
  `ALTER TABLE users ADD COLUMN locked_at INTEGER`,
  `ALTER TABLE users ADD COLUMN locked_reason TEXT`,
  `ALTER TABLE users ADD COLUMN updated_at INTEGER`,
  `ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0`,
  // ---- v15: immutable KOC contract snapshot + drawn signature ----
  `ALTER TABLE kocs ADD COLUMN contract_version TEXT`,
  `ALTER TABLE kocs ADD COLUMN contract_signed_at INTEGER`,
  `ALTER TABLE kocs ADD COLUMN contract_signature TEXT`,
  `ALTER TABLE kocs ADD COLUMN contract_html TEXT`,
  // ---- v16: business registration license document ----
  `ALTER TABLE businesses ADD COLUMN license_file TEXT`,
  `ALTER TABLE businesses ADD COLUMN license_name TEXT`,
  `ALTER TABLE businesses ADD COLUMN license_type TEXT`,
  // ---- v17: versioned video submissions + business approval ----
  `CREATE TABLE IF NOT EXISTS booking_video_submissions (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, stream_uid TEXT UNIQUE,
     storage_provider TEXT NOT NULL DEFAULT 'r2', object_key TEXT, r2_upload_id TEXT,
     version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'uploading',
     original_name TEXT, mime_type TEXT, size_bytes INTEGER DEFAULT 0,
     preview_url TEXT, thumbnail_url TEXT, download_url TEXT, duration REAL,
     review_note TEXT, submitted_at INTEGER, reviewed_at INTEGER, reviewed_by TEXT,
     created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  // ---- v18-v20: migrate legacy Stream rows without rebuilding the table ----
  `ALTER TABLE booking_video_submissions ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'stream'`,
  `ALTER TABLE booking_video_submissions ADD COLUMN object_key TEXT`,
  `ALTER TABLE booking_video_submissions ADD COLUMN r2_upload_id TEXT`,
  // ---- v21: payOS booking escrow collection ----
  `CREATE TABLE IF NOT EXISTS payment_requests (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, business_id TEXT NOT NULL,
     provider TEXT NOT NULL DEFAULT 'payos', order_code INTEGER NOT NULL UNIQUE,
     amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'creating',
     payment_link_id TEXT, checkout_url TEXT, qr_code TEXT, provider_reference TEXT,
     failure_reason TEXT, paid_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  `CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_created
     ON payment_requests(booking_id, created_at DESC)`,
  // ---- v22: distinguish legacy upfront escrow from final booking payment ----
  `ALTER TABLE payment_requests ADD COLUMN purpose TEXT NOT NULL DEFAULT 'escrow'`,
  // ---- v23-v25: server-side follower verification evidence ----
  `ALTER TABLE kocs ADD COLUMN followers_verified INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kocs ADD COLUMN followers_verified_at INTEGER`,
  `ALTER TABLE kocs ADD COLUMN followers_verification_source TEXT`,
  // ---- v26+: structured AI Clone booking workflow ----
  `ALTER TABLE bookings ADD COLUMN aiclone_format TEXT`,
  `ALTER TABLE bookings ADD COLUMN aiclone_message TEXT`,
  `ALTER TABLE bookings ADD COLUMN aiclone_script TEXT`,
  `ALTER TABLE bookings ADD COLUMN aiclone_batch_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN business_video_link TEXT`,
  `ALTER TABLE bookings ADD COLUMN koc_video_link TEXT`,
  `ALTER TABLE bookings ADD COLUMN aiclone_scope TEXT`,
  `ALTER TABLE bookings ADD COLUMN aiclone_video_quantity INTEGER DEFAULT 1`,
  `ALTER TABLE bookings ADD COLUMN aiclone_production_fee INTEGER DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN aiclone_platform_fee INTEGER DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN aiclone_quote_note TEXT`,
  `ALTER TABLE bookings ADD COLUMN aiclone_quote_production INTEGER DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN aiclone_quote_koc INTEGER DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN aiclone_quote_platform INTEGER DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN aiclone_quote_additional INTEGER DEFAULT 0`,
  // ---- wallet escrow v2: business deposits, holds, double-entry ledger, payouts ----
  `ALTER TABLE bookings ADD COLUMN funding_mode TEXT NOT NULL DEFAULT 'legacy'`,
  `ALTER TABLE bookings ADD COLUMN escrow_hold_id TEXT`,
  `ALTER TABLE kocs ADD COLUMN bank_bin TEXT`,
  `CREATE TABLE IF NOT EXISTS wallet_accounts (
     id TEXT PRIMARY KEY, owner_type TEXT NOT NULL, owner_id TEXT NOT NULL,
     bucket TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'VND',
     balance INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
     UNIQUE(owner_type,owner_id,bucket) )`,
  `CREATE TABLE IF NOT EXISTS journal_entries (
     id TEXT PRIMARY KEY, event_type TEXT NOT NULL, reference_type TEXT,
     reference_id TEXT, idempotency_key TEXT NOT NULL UNIQUE,
     note TEXT, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS ledger_postings (
     id TEXT PRIMARY KEY, journal_entry_id TEXT NOT NULL, account_id TEXT NOT NULL,
     amount INTEGER NOT NULL, applied INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS wallet_migrations (
     owner_type TEXT NOT NULL, owner_id TEXT NOT NULL, source_balance INTEGER NOT NULL DEFAULT 0,
     migrated_at INTEGER NOT NULL, PRIMARY KEY(owner_type,owner_id) )`,
  `CREATE TABLE IF NOT EXISTS wallet_deposits (
     id TEXT PRIMARY KEY, business_id TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'payos',
     mode TEXT NOT NULL DEFAULT 'live', order_code INTEGER NOT NULL UNIQUE,
     amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'creating',
     payment_link_id TEXT, checkout_url TEXT, qr_code TEXT, provider_reference TEXT,
     failure_reason TEXT, paid_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS escrow_holds (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE, business_id TEXT NOT NULL,
     koc_id TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'held',
     created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, released_at INTEGER )`,
  `CREATE TABLE IF NOT EXISTS payout_requests (
     id TEXT PRIMARY KEY, koc_id TEXT NOT NULL, amount INTEGER NOT NULL,
     status TEXT NOT NULL DEFAULT 'queued', mode TEXT NOT NULL DEFAULT 'live',
     bank_bin TEXT, bank_account TEXT, bank_owner TEXT,
     provider_payout_id TEXT, provider_reference TEXT, provider_state TEXT,
     failure_reason TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, paid_at INTEGER )`,
  // ---- business product catalog: reusable source links for future affiliate flows ----
  ...BUSINESS_PRODUCT_SCHEMA,
  // ---- private KOC identity images; only exposed through admin-only APIs ----
  `CREATE TABLE IF NOT EXISTS koc_identity_documents (
     koc_id TEXT PRIMARY KEY, front_image TEXT NOT NULL, back_image TEXT NOT NULL,
     selfie_image TEXT NOT NULL, front_object_key TEXT, back_object_key TEXT,
     selfie_object_key TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  `ALTER TABLE koc_identity_documents ADD COLUMN front_object_key TEXT`,
  `ALTER TABLE koc_identity_documents ADD COLUMN back_object_key TEXT`,
  `ALTER TABLE koc_identity_documents ADD COLUMN selfie_object_key TEXT`,
  `ALTER TABLE campaigns ADD COLUMN management_rate REAL NOT NULL DEFAULT 0.15`,
  `ALTER TABLE campaigns ADD COLUMN management_fee INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaigns ADD COLUMN total_amount INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaigns ADD COLUMN upfront_fee_released INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaigns ADD COLUMN funded_at INTEGER`,
  `ALTER TABLE campaigns ADD COLUMN started_at INTEGER`,
  `ALTER TABLE campaigns ADD COLUMN completed_at INTEGER`,
  `ALTER TABLE campaigns ADD COLUMN cancelled_at INTEGER`,
  `CREATE TABLE IF NOT EXISTS campaign_allocations (id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,koc_id TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',settled_at INTEGER,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(campaign_id,koc_id))`,
  `CREATE INDEX IF NOT EXISTS idx_campaign_allocations_campaign ON campaign_allocations(campaign_id,status)`,
  `ALTER TABLE campaigns ADD COLUMN quote_note TEXT`,
  `ALTER TABLE campaigns ADD COLUMN quoted_at INTEGER`,
  `ALTER TABLE campaigns ADD COLUMN deadline TEXT`,
  `ALTER TABLE campaign_allocations ADD COLUMN deadline TEXT`,
  `ALTER TABLE campaign_allocations ADD COLUMN submission_url TEXT`,
  `ALTER TABLE campaign_allocations ADD COLUMN submission_note TEXT`,
  `ALTER TABLE campaign_allocations ADD COLUMN business_note TEXT`,
  `ALTER TABLE campaign_allocations ADD COLUMN accepted_at INTEGER`,
  `ALTER TABLE campaign_allocations ADD COLUMN declined_at INTEGER`,
  `ALTER TABLE campaign_allocations ADD COLUMN submitted_at INTEGER`,
  `ALTER TABLE campaign_allocations ADD COLUMN approved_at INTEGER`,
  `UPDATE campaigns SET management_rate=0.15,
     management_fee=CASE WHEN ROUND(COALESCE(budget,0)*0.15)>2000000 THEN ROUND(COALESCE(budget,0)*0.15) ELSE 2000000 END,
     total_amount=COALESCE(budget,0)+(CASE WHEN ROUND(COALESCE(budget,0)*0.15)>2000000 THEN ROUND(COALESCE(budget,0)*0.15) ELSE 2000000 END)
     WHERE COALESCE(total_amount,0)=0`,
  `ALTER TABLE kol_requests ADD COLUMN quote_kol INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kol_requests ADD COLUMN quote_platform INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kol_requests ADD COLUMN quote_additional INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kol_requests ADD COLUMN total_amount INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kol_requests ADD COLUMN escrow_amount INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kol_requests ADD COLUMN contract_reference TEXT`,
  `ALTER TABLE kol_requests ADD COLUMN delivery_url TEXT`,
  `ALTER TABLE kol_requests ADD COLUMN delivery_note TEXT`,
  `ALTER TABLE kol_requests ADD COLUMN business_note TEXT`,
  `ALTER TABLE kol_requests ADD COLUMN quoted_at INTEGER`,
  `ALTER TABLE kol_requests ADD COLUMN funded_at INTEGER`,
  `ALTER TABLE kol_requests ADD COLUMN confirmed_at INTEGER`,
  `ALTER TABLE kol_requests ADD COLUMN delivered_at INTEGER`,
  `ALTER TABLE kol_requests ADD COLUMN approved_at INTEGER`,
  `ALTER TABLE kol_requests ADD COLUMN completed_at INTEGER`,
  `ALTER TABLE kol_requests ADD COLUMN cancelled_at INTEGER`,
  // ---- device push notifications (append-only: migration indexes are persisted) ----
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
     endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
     created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
     ON push_subscriptions(user_id, updated_at DESC)`,
  // ---- KOC Viet partner program: a standalone, admin-managed partner earns a
  // share of the 5% service fee on each booking of the KOCs assigned to it.
  // Additive only. ----
  `CREATE TABLE IF NOT EXISTS partners (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT,
     bank_name TEXT, bank_bin TEXT, bank_account TEXT, bank_owner TEXT,
     fee_rate REAL NOT NULL DEFAULT 0.3, status TEXT NOT NULL DEFAULT 'active',
     note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  `CREATE TABLE IF NOT EXISTS partner_members (
     id TEXT PRIMARY KEY, partner_id TEXT NOT NULL, koc_id TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'active', assigned_at INTEGER NOT NULL,
     assigned_by TEXT, removed_at INTEGER )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_members_active_koc
     ON partner_members(koc_id) WHERE status='active'`,
  `CREATE INDEX IF NOT EXISTS idx_partner_members_partner
     ON partner_members(partner_id, status)`,
  `CREATE TABLE IF NOT EXISTS partner_earnings (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, partner_id TEXT NOT NULL,
     koc_id TEXT NOT NULL, base_service_fee INTEGER NOT NULL, rate REAL NOT NULL,
     amount INTEGER NOT NULL, created_at INTEGER NOT NULL )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_earnings_booking
     ON partner_earnings(booking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner
     ON partner_earnings(partner_id, created_at DESC)`,
  // Bring forward a `partners` table created by an earlier build of this feature
  // (business-linked, no avatar/bank columns). Each ALTER is idempotent: it
  // fails harmlessly when the column already exists on a fresh install.
  `ALTER TABLE partners ADD COLUMN avatar TEXT`,
  `ALTER TABLE partners ADD COLUMN bank_name TEXT`,
  `ALTER TABLE partners ADD COLUMN bank_bin TEXT`,
  `ALTER TABLE partners ADD COLUMN bank_account TEXT`,
  `ALTER TABLE partners ADD COLUMN bank_owner TEXT`,
  `ALTER TABLE partners ALTER COLUMN business_id DROP NOT NULL`,
  // ---- partner login accounts: admin-issued, forced password change on first login ----
  `ALTER TABLE users ADD COLUMN partner_id TEXT`,
  `ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kocs ADD COLUMN social_change_request TEXT`,
];

// Repair the v14 schema even when a previous deployment advanced schema_version
// after swallowing a failed migration. This is required for older persistent
// databases that can report the latest version while still missing objects.
async function ensureV14Schema(env) {
  await env.DB.exec(
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
       endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
       created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  );
  await env.DB.exec(
    `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
       ON push_subscriptions(user_id, updated_at DESC)`,
  );
  await env.DB.exec(
    `CREATE TABLE IF NOT EXISTS koc_identity_documents (
       koc_id TEXT PRIMARY KEY, front_image TEXT NOT NULL, back_image TEXT NOT NULL,
       selfie_image TEXT NOT NULL, front_object_key TEXT, back_object_key TEXT,
       selfie_object_key TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
  );
  const identityColumns = await env.DB.prepare(`PRAGMA table_info(koc_identity_documents)`).all();
  const existingIdentityColumns = new Set(
    (identityColumns.results || []).map(column => column.name),
  );
  for (const [column, sql] of [
    ['front_object_key', `ALTER TABLE koc_identity_documents ADD COLUMN front_object_key TEXT`],
    ['back_object_key', `ALTER TABLE koc_identity_documents ADD COLUMN back_object_key TEXT`],
    ['selfie_object_key', `ALTER TABLE koc_identity_documents ADD COLUMN selfie_object_key TEXT`],
  ]) {
    if (!existingIdentityColumns.has(column)) await env.DB.exec(sql);
  }
  const columns = await env.DB.prepare(`PRAGMA table_info(bookings)`).all();
  const hasContentType = (columns.results || []).some(column => column.name === 'content_type');
  if (!hasContentType) {
    await env.DB.exec(`ALTER TABLE bookings ADD COLUMN content_type TEXT DEFAULT 'review'`);
  }
  const existingBookingColumns = new Set(
    (columns.results || []).map(column => column.name),
  );
  const requiredAiCloneColumns = [
    ['aiclone_format', `ALTER TABLE bookings ADD COLUMN aiclone_format TEXT`],
    ['aiclone_message', `ALTER TABLE bookings ADD COLUMN aiclone_message TEXT`],
    ['aiclone_script', `ALTER TABLE bookings ADD COLUMN aiclone_script TEXT`],
    ['aiclone_batch_id', `ALTER TABLE bookings ADD COLUMN aiclone_batch_id TEXT`],
    ['business_video_link', `ALTER TABLE bookings ADD COLUMN business_video_link TEXT`],
    ['koc_video_link', `ALTER TABLE bookings ADD COLUMN koc_video_link TEXT`],
    ['aiclone_scope', `ALTER TABLE bookings ADD COLUMN aiclone_scope TEXT`],
    ['aiclone_video_quantity', `ALTER TABLE bookings ADD COLUMN aiclone_video_quantity INTEGER DEFAULT 1`],
    ['aiclone_production_fee', `ALTER TABLE bookings ADD COLUMN aiclone_production_fee INTEGER DEFAULT 0`],
    ['aiclone_platform_fee', `ALTER TABLE bookings ADD COLUMN aiclone_platform_fee INTEGER DEFAULT 0`],
    ['aiclone_quote_note', `ALTER TABLE bookings ADD COLUMN aiclone_quote_note TEXT`],
    ['aiclone_quote_production', `ALTER TABLE bookings ADD COLUMN aiclone_quote_production INTEGER DEFAULT 0`],
    ['aiclone_quote_koc', `ALTER TABLE bookings ADD COLUMN aiclone_quote_koc INTEGER DEFAULT 0`],
    ['aiclone_quote_platform', `ALTER TABLE bookings ADD COLUMN aiclone_quote_platform INTEGER DEFAULT 0`],
    ['aiclone_quote_additional', `ALTER TABLE bookings ADD COLUMN aiclone_quote_additional INTEGER DEFAULT 0`],
    ['funding_mode', `ALTER TABLE bookings ADD COLUMN funding_mode TEXT NOT NULL DEFAULT 'legacy'`],
    ['escrow_hold_id', `ALTER TABLE bookings ADD COLUMN escrow_hold_id TEXT`],
  ];
  for (const [name, sql] of requiredAiCloneColumns) {
    if (!existingBookingColumns.has(name)) await env.DB.prepare(sql).run();
  }

  // Some existing databases already have the latest schema_version value but
  // were created before business-account status fields were introduced.
  // Inspect the real table shape instead of relying only on schema_version.
  const userColumns = await env.DB.prepare(`PRAGMA table_info(users)`).all();
  const existingUserColumns = new Set((userColumns.results || []).map(column => column.name));
  const requiredUserColumns = [
    ['status', `ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`],
    ['locked_at', `ALTER TABLE users ADD COLUMN locked_at INTEGER`],
    ['locked_reason', `ALTER TABLE users ADD COLUMN locked_reason TEXT`],
    ['updated_at', `ALTER TABLE users ADD COLUMN updated_at INTEGER`],
    ['session_version', `ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0`],
    ['partner_id', `ALTER TABLE users ADD COLUMN partner_id TEXT`],
    ['must_change_password', `ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`],
  ];
  for (const [name, sql] of requiredUserColumns) {
    if (!existingUserColumns.has(name)) await env.DB.prepare(sql).run();
  }

  const businessColumns = await env.DB.prepare(`PRAGMA table_info(businesses)`).all();
  const existingBusinessColumns = new Set(
    (businessColumns.results || []).map(column => column.name),
  );
  const requiredBusinessColumns = [
    ['license_file', `ALTER TABLE businesses ADD COLUMN license_file TEXT`],
    ['license_name', `ALTER TABLE businesses ADD COLUMN license_name TEXT`],
    ['license_type', `ALTER TABLE businesses ADD COLUMN license_type TEXT`],
  ];
  for (const [name, sql] of requiredBusinessColumns) {
    if (!existingBusinessColumns.has(name)) await env.DB.prepare(sql).run();
  }

  // Campaign migrations used to ignore individual ALTER failures while still
  // advancing schema_version. Repair the real table shape on every guard bump.
  const campaignColumns = await env.DB.prepare(`PRAGMA table_info(campaigns)`).all();
  const existingCampaignColumns = new Set(
    (campaignColumns.results || []).map(column => column.name),
  );
  const requiredCampaignColumns = [
    ['management_rate', `ALTER TABLE campaigns ADD COLUMN management_rate REAL NOT NULL DEFAULT 0.15`],
    ['management_fee', `ALTER TABLE campaigns ADD COLUMN management_fee INTEGER NOT NULL DEFAULT 0`],
    ['total_amount', `ALTER TABLE campaigns ADD COLUMN total_amount INTEGER NOT NULL DEFAULT 0`],
    ['upfront_fee_released', `ALTER TABLE campaigns ADD COLUMN upfront_fee_released INTEGER NOT NULL DEFAULT 0`],
    ['funded_at', `ALTER TABLE campaigns ADD COLUMN funded_at INTEGER`],
    ['started_at', `ALTER TABLE campaigns ADD COLUMN started_at INTEGER`],
    ['completed_at', `ALTER TABLE campaigns ADD COLUMN completed_at INTEGER`],
    ['cancelled_at', `ALTER TABLE campaigns ADD COLUMN cancelled_at INTEGER`],
    ['quote_note', `ALTER TABLE campaigns ADD COLUMN quote_note TEXT`],
    ['quoted_at', `ALTER TABLE campaigns ADD COLUMN quoted_at INTEGER`],
    ['deadline', `ALTER TABLE campaigns ADD COLUMN deadline TEXT`],
  ];
  for (const [name, sql] of requiredCampaignColumns) {
    if (!existingCampaignColumns.has(name)) await env.DB.prepare(sql).run();
  }
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS campaign_allocations (
       id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,koc_id TEXT NOT NULL,
       amount INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',
       settled_at INTEGER,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
       UNIQUE(campaign_id,koc_id))`,
  ).run();
  const allocationColumns = await env.DB.prepare(`PRAGMA table_info(campaign_allocations)`).all();
  const existingAllocationColumns = new Set(
    (allocationColumns.results || []).map(column => column.name),
  );
  const requiredAllocationColumns = [
    ['deadline', `ALTER TABLE campaign_allocations ADD COLUMN deadline TEXT`],
    ['submission_url', `ALTER TABLE campaign_allocations ADD COLUMN submission_url TEXT`],
    ['submission_note', `ALTER TABLE campaign_allocations ADD COLUMN submission_note TEXT`],
    ['business_note', `ALTER TABLE campaign_allocations ADD COLUMN business_note TEXT`],
    ['accepted_at', `ALTER TABLE campaign_allocations ADD COLUMN accepted_at INTEGER`],
    ['declined_at', `ALTER TABLE campaign_allocations ADD COLUMN declined_at INTEGER`],
    ['submitted_at', `ALTER TABLE campaign_allocations ADD COLUMN submitted_at INTEGER`],
    ['approved_at', `ALTER TABLE campaign_allocations ADD COLUMN approved_at INTEGER`],
  ];
  for (const [name, sql] of requiredAllocationColumns) {
    if (!existingAllocationColumns.has(name)) await env.DB.prepare(sql).run();
  }
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_campaign_allocations_campaign ON campaign_allocations(campaign_id,status)`,
  ).run();

  const kolRequestColumns = await env.DB.prepare(`PRAGMA table_info(kol_requests)`).all();
  const existingKolRequestColumns = new Set(
    (kolRequestColumns.results || []).map(column => column.name),
  );
  const requiredKolRequestColumns = [
    ['quote_kol', `ALTER TABLE kol_requests ADD COLUMN quote_kol INTEGER NOT NULL DEFAULT 0`],
    ['quote_platform', `ALTER TABLE kol_requests ADD COLUMN quote_platform INTEGER NOT NULL DEFAULT 0`],
    ['quote_additional', `ALTER TABLE kol_requests ADD COLUMN quote_additional INTEGER NOT NULL DEFAULT 0`],
    ['total_amount', `ALTER TABLE kol_requests ADD COLUMN total_amount INTEGER NOT NULL DEFAULT 0`],
    ['escrow_amount', `ALTER TABLE kol_requests ADD COLUMN escrow_amount INTEGER NOT NULL DEFAULT 0`],
    ['contract_reference', `ALTER TABLE kol_requests ADD COLUMN contract_reference TEXT`],
    ['delivery_url', `ALTER TABLE kol_requests ADD COLUMN delivery_url TEXT`],
    ['delivery_note', `ALTER TABLE kol_requests ADD COLUMN delivery_note TEXT`],
    ['business_note', `ALTER TABLE kol_requests ADD COLUMN business_note TEXT`],
    ['quoted_at', `ALTER TABLE kol_requests ADD COLUMN quoted_at INTEGER`],
    ['funded_at', `ALTER TABLE kol_requests ADD COLUMN funded_at INTEGER`],
    ['confirmed_at', `ALTER TABLE kol_requests ADD COLUMN confirmed_at INTEGER`],
    ['delivered_at', `ALTER TABLE kol_requests ADD COLUMN delivered_at INTEGER`],
    ['approved_at', `ALTER TABLE kol_requests ADD COLUMN approved_at INTEGER`],
    ['completed_at', `ALTER TABLE kol_requests ADD COLUMN completed_at INTEGER`],
    ['cancelled_at', `ALTER TABLE kol_requests ADD COLUMN cancelled_at INTEGER`],
  ];
  for (const [name, sql] of requiredKolRequestColumns) {
    if (!existingKolRequestColumns.has(name)) await env.DB.prepare(sql).run();
  }

  // Older databases may report the latest schema version even though an
  // idempotent ALTER TABLE was previously swallowed. Repair contract columns
  // from the actual KOC table shape instead of trusting schema_version.
  const kocColumns = await env.DB.prepare(`PRAGMA table_info(kocs)`).all();
  const existingKocColumns = new Set(
    (kocColumns.results || []).map(column => column.name),
  );
  const requiredKocColumns = [
    ['social_change_request', `ALTER TABLE kocs ADD COLUMN social_change_request TEXT`],
    ['contract_version', `ALTER TABLE kocs ADD COLUMN contract_version TEXT`],
    ['contract_signed_at', `ALTER TABLE kocs ADD COLUMN contract_signed_at INTEGER`],
    ['contract_signature', `ALTER TABLE kocs ADD COLUMN contract_signature TEXT`],
    ['contract_html', `ALTER TABLE kocs ADD COLUMN contract_html TEXT`],
    ['followers_verified', `ALTER TABLE kocs ADD COLUMN followers_verified INTEGER NOT NULL DEFAULT 0`],
    ['followers_verified_at', `ALTER TABLE kocs ADD COLUMN followers_verified_at INTEGER`],
    ['followers_verification_source', `ALTER TABLE kocs ADD COLUMN followers_verification_source TEXT`],
    ['bank_bin', `ALTER TABLE kocs ADD COLUMN bank_bin TEXT`],
  ];
  for (const [name, sql] of requiredKocColumns) {
    if (!existingKocColumns.has(name)) await env.DB.prepare(sql).run();
  }
  // Keep account access aligned with the KOC review state. This also
  // backfills accounts created before pending-login enforcement existed.
  await env.DB.prepare(
    `UPDATE users SET status='pending',updated_at=?
     WHERE role='koc' AND status='active' AND koc_id IN (
       SELECT id FROM kocs WHERE status IN ('pending','leader_ok')
     )`,
  ).bind(now()).run();
  await env.DB.prepare(
    `UPDATE users SET status='rejected',updated_at=?
     WHERE role='koc' AND status='active' AND koc_id IN (
       SELECT id FROM kocs WHERE status='rejected'
     )`,
  ).bind(now()).run();

  const leadColumns = await env.DB.prepare(`PRAGMA table_info(quote_leads)`).all();
  const existingLeadColumns = new Set((leadColumns.results || []).map(column => column.name));
  if (!existingLeadColumns.has('assigned_to')) {
    await env.DB.prepare(`ALTER TABLE quote_leads ADD COLUMN assigned_to TEXT`).run();
  }
  if (!existingLeadColumns.has('updated_at')) {
    await env.DB.prepare(`ALTER TABLE quote_leads ADD COLUMN updated_at INTEGER`).run();
  }
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS sales_agents (
       id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, status TEXT NOT NULL DEFAULT 'active',
       created_at INTEGER NOT NULL
     )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS lead_activities (
       id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, actor_id TEXT, status TEXT NOT NULL,
       note TEXT, created_at INTEGER NOT NULL
     )`
  ).run();
  const salesSeed = [
    ['sales-lan', 'Nguyễn Thị Lan', 'lan.sales@netviet.vn'],
    ['sales-hung', 'Trần Quốc Hùng', 'hung.sales@netviet.vn'],
    ['sales-minh', 'Lê Hoàng Minh', 'minh.sales@netviet.vn'],
  ];
  for (const [id, name, email] of salesSeed) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO sales_agents (id,name,email,status,created_at) VALUES (?,?,?,'active',?)`
    ).bind(id, name, email, now()).run();
  }

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS notifications (
       id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL,
       title TEXT NOT NULL, message TEXT NOT NULL, href TEXT,
       is_read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
     )`
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS payment_requests (
       id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, business_id TEXT NOT NULL,
       provider TEXT NOT NULL DEFAULT 'payos', order_code INTEGER NOT NULL UNIQUE,
       amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'creating',
       payment_link_id TEXT, checkout_url TEXT, qr_code TEXT, provider_reference TEXT,
       failure_reason TEXT, paid_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
       purpose TEXT NOT NULL DEFAULT 'escrow'
     )`
  ).run();
  const paymentColumns = await env.DB.prepare(
    `PRAGMA table_info(payment_requests)`,
  ).all();
  const existingPaymentColumns = new Set(
    (paymentColumns.results || []).map(column => column.name),
  );
  if (!existingPaymentColumns.has('purpose')) {
    await env.DB.prepare(
      `ALTER TABLE payment_requests ADD COLUMN purpose TEXT NOT NULL DEFAULT 'escrow'`,
    ).run();
  }

  const walletSchema = [
    `CREATE TABLE IF NOT EXISTS wallet_accounts (
       id TEXT PRIMARY KEY, owner_type TEXT NOT NULL, owner_id TEXT NOT NULL,
       bucket TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'VND',
       balance INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
       UNIQUE(owner_type,owner_id,bucket)
     )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
       id TEXT PRIMARY KEY, event_type TEXT NOT NULL, reference_type TEXT,
       reference_id TEXT, idempotency_key TEXT NOT NULL UNIQUE,
       note TEXT, created_at INTEGER NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS ledger_postings (
       id TEXT PRIMARY KEY, journal_entry_id TEXT NOT NULL, account_id TEXT NOT NULL,
       amount INTEGER NOT NULL, applied INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS wallet_migrations (
       owner_type TEXT NOT NULL, owner_id TEXT NOT NULL, source_balance INTEGER NOT NULL DEFAULT 0,
       migrated_at INTEGER NOT NULL, PRIMARY KEY(owner_type,owner_id)
     )`,
    `CREATE TABLE IF NOT EXISTS wallet_deposits (
       id TEXT PRIMARY KEY, business_id TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'payos',
       mode TEXT NOT NULL DEFAULT 'live', order_code INTEGER NOT NULL UNIQUE,
       amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'creating',
       payment_link_id TEXT, checkout_url TEXT, qr_code TEXT, provider_reference TEXT,
       failure_reason TEXT, paid_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS escrow_holds (
       id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE, business_id TEXT NOT NULL,
       koc_id TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'held',
       created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, released_at INTEGER
     )`,
    `CREATE TABLE IF NOT EXISTS payout_requests (
       id TEXT PRIMARY KEY, koc_id TEXT NOT NULL, amount INTEGER NOT NULL,
       status TEXT NOT NULL DEFAULT 'queued', mode TEXT NOT NULL DEFAULT 'live',
       bank_bin TEXT, bank_account TEXT, bank_owner TEXT,
       provider_payout_id TEXT, provider_reference TEXT, provider_state TEXT,
       failure_reason TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, paid_at INTEGER
     )`,
  ];
  for (const sql of walletSchema) await env.DB.prepare(sql).run();

  for (const sql of BUSINESS_PRODUCT_SCHEMA) {
    try {
      await env.DB.prepare(sql).run();
    } catch (e) {
      console.warn('business products schema migration skipped', e && e.message || e);
    }
  }

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS booking_video_submissions (
       id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, stream_uid TEXT UNIQUE,
       storage_provider TEXT NOT NULL DEFAULT 'r2', object_key TEXT, r2_upload_id TEXT,
       version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'uploading',
       original_name TEXT, mime_type TEXT, size_bytes INTEGER DEFAULT 0,
       preview_url TEXT, thumbnail_url TEXT, download_url TEXT, duration REAL,
       review_note TEXT, submitted_at INTEGER, reviewed_at INTEGER, reviewed_by TEXT,
       created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
     )`
  ).run();
  const videoColumns = await env.DB.prepare(
    `PRAGMA table_info(booking_video_submissions)`,
  ).all();
  const existingVideoColumns = new Set(
    (videoColumns.results || []).map(column => column.name),
  );
  const requiredVideoColumns = [
    [
      'storage_provider',
      `ALTER TABLE booking_video_submissions ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'stream'`,
    ],
    ['object_key', `ALTER TABLE booking_video_submissions ADD COLUMN object_key TEXT`],
    ['r2_upload_id', `ALTER TABLE booking_video_submissions ADD COLUMN r2_upload_id TEXT`],
  ];
  for (const [name, sql] of requiredVideoColumns) {
    if (!existingVideoColumns.has(name)) await env.DB.prepare(sql).run();
  }

  // The index improves notification reads but is not required for correctness.
  // Keep the application usable on SQLite-compatible runtimes with limited
  // CREATE INDEX support.
  try {
    await env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_created
       ON notifications(user_id, created_at DESC)`
    ).run();
  } catch (e) {
    console.warn('notifications index migration skipped', e && e.message || e);
  }
  try {
    await env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_created
       ON payment_requests(booking_id, created_at DESC)`
    ).run();
  } catch (e) {
    console.warn('payment requests index migration skipped', e && e.message || e);
  }
  try {
    await env.DB.batch([
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_wallet_entries_reference
         ON journal_entries(reference_type,reference_id,created_at DESC)`
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_wallet_deposits_business_created
         ON wallet_deposits(business_id,created_at DESC)`
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_payout_requests_koc_created
         ON payout_requests(koc_id,created_at DESC)`
      ),
    ]);
  } catch (e) {
    console.warn('wallet indexes migration skipped', e && e.message || e);
  }
  try {
    await env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_booking_video_version
       ON booking_video_submissions(booking_id, version DESC)`
    ).run();
  } catch (e) {
    console.warn('booking video index migration skipped', e && e.message || e);
  }

  // KOC Viet partner program. Rebuild from the real table shape so a swallowed
  // ALTER/CREATE on an older database is repaired on the next guard bump.
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS partners (
       id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT,
       bank_name TEXT, bank_bin TEXT, bank_account TEXT, bank_owner TEXT,
       fee_rate REAL NOT NULL DEFAULT 0.3, status TEXT NOT NULL DEFAULT 'active',
       note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL )`,
    `CREATE TABLE IF NOT EXISTS partner_members (
       id TEXT PRIMARY KEY, partner_id TEXT NOT NULL, koc_id TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'active', assigned_at INTEGER NOT NULL,
       assigned_by TEXT, removed_at INTEGER )`,
    `CREATE TABLE IF NOT EXISTS partner_earnings (
       id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, partner_id TEXT NOT NULL,
       koc_id TEXT NOT NULL, base_service_fee INTEGER NOT NULL, rate REAL NOT NULL,
       amount INTEGER NOT NULL, created_at INTEGER NOT NULL )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_members_active_koc
       ON partner_members(koc_id) WHERE status='active'`,
    `CREATE INDEX IF NOT EXISTS idx_partner_members_partner
       ON partner_members(partner_id, status)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_earnings_booking
       ON partner_earnings(booking_id)`,
    `CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner
       ON partner_earnings(partner_id, created_at DESC)`,
  ]) {
    try {
      await env.DB.prepare(sql).run();
    } catch (e) {
      console.warn('partner program schema migration skipped', e && e.message || e);
    }
  }
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS partner_payout_tickets (
    id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id),
    user_id TEXT NOT NULL REFERENCES users(id), amount BIGINT NOT NULL CHECK (amount >= 10000),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','settled','rejected')),
    bank_name TEXT NOT NULL, bank_bin TEXT NOT NULL, bank_account TEXT NOT NULL, bank_owner TEXT NOT NULL,
    note TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL
  )`);
  await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_partner_payout_created ON partner_payout_tickets(partner_id,created_at DESC)`);
  // Upgrade a `partners` table left by an earlier build of this feature
  // (business-linked, missing the standalone avatar/bank columns).
  const partnerColumns = await env.DB.prepare(`PRAGMA table_info(partners)`).all();
  const existingPartnerColumns = new Set(
    (partnerColumns.results || []).map(column => column.name),
  );
  if (existingPartnerColumns.has('id')) {
    for (const [name, sql] of [
      ['avatar', `ALTER TABLE partners ADD COLUMN avatar TEXT`],
      ['bank_name', `ALTER TABLE partners ADD COLUMN bank_name TEXT`],
      ['bank_bin', `ALTER TABLE partners ADD COLUMN bank_bin TEXT`],
      ['bank_account', `ALTER TABLE partners ADD COLUMN bank_account TEXT`],
      ['bank_owner', `ALTER TABLE partners ADD COLUMN bank_owner TEXT`],
    ]) {
      if (!existingPartnerColumns.has(name)) {
        try { await env.DB.prepare(sql).run(); } catch (e) { /* idempotent */ }
      }
    }
    if (existingPartnerColumns.has('business_id')) {
      try {
        await env.DB.prepare(`ALTER TABLE partners ALTER COLUMN business_id DROP NOT NULL`).run();
      } catch (e) { /* already nullable or unsupported */ }
    }
  }
}

async function migrateLegacySecrets(env) {
  const marker = await env.DB.prepare(
    `SELECT v FROM _meta WHERE k='password_hash_migration_v1'`,
  ).first();
  if (!marker) {
    const { results = [] } = await env.DB.prepare(
      `SELECT id,password FROM users WHERE password NOT LIKE 'pbkdf2_sha256$%'`,
    ).all();
    for (const user of results) {
      const passwordHash = await hashPassword(String(user.password || ''));
      await env.DB.prepare(
        `UPDATE users SET password=?,session_version=session_version+1,updated_at=? WHERE id=?`,
      ).bind(passwordHash, now(), user.id).run();
    }
    await env.DB.prepare(
      `INSERT INTO _meta (k,v) VALUES ('password_hash_migration_v1',?)`,
    ).bind(String(now())).run();
  }

  // OTPs created by older releases were stored as raw digits. Expire them so
  // only HMAC-protected OTP rows can be accepted after this deployment.
  await env.DB.prepare(
    `UPDATE email_otp SET expires_at=? WHERE code NOT LIKE 'hmac_sha256$%'`,
  ).bind(now()).run();
}

async function runMigrations(env) {
  let cur = 0;
  let guardVersion = '';
  let metadataRows = [];
  try {
    const { results = [] } = await env.DB.prepare(
      `SELECT k,v FROM _meta WHERE k IN ('schema_version',?)`,
    ).bind(SCHEMA_GUARD_KEY).all();
    metadataRows = results;
  } catch (_) {
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT)`);
    const { results = [] } = await env.DB.prepare(
      `SELECT k,v FROM _meta WHERE k IN ('schema_version',?)`,
    ).bind(SCHEMA_GUARD_KEY).all();
    metadataRows = results;
  }
  for (const row of metadataRows) {
    if (row.k === 'schema_version') cur = Number(row.v) || 0;
    if (row.k === SCHEMA_GUARD_KEY) guardVersion = String(row.v || '');
  }

  // Fast-path: if schema version and structural repair guard version are both current,
  // skip running MIGRATIONS and ensureV14Schema entirely (saves 35+ D1 round trips).
  if (cur < MIGRATIONS.length || guardVersion !== SCHEMA_GUARD_VERSION) {
    for (let i = cur; i < MIGRATIONS.length; i++) {
      try { await env.DB.exec(MIGRATIONS[i].replace(/\s+/g, ' ')); } catch (e) { /* idempotent */ }
    }
    await ensureV14Schema(env);
    await migrateLegacySecrets(env);
    await env.DB.prepare(
      `INSERT INTO _meta (k,v) VALUES ('schema_version',?), (?,?)
       ON CONFLICT(k) DO UPDATE SET v=excluded.v`,
    ).bind(String(MIGRATIONS.length), SCHEMA_GUARD_KEY, SCHEMA_GUARD_VERSION).run();
  }
}

export async function migrate(env) {
  if (_migrated) return;
  if (!_migrationPromise) _migrationPromise = runMigrations(env);
  try {
    await _migrationPromise;
    _migrated = true;
  } catch (error) {
    _migrationPromise = null;
    throw error;
  }
}

export const now = () => Math.floor(Date.now() / 1000);
export const uid = () => crypto.randomUUID();
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
