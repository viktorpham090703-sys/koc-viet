-- Nexrall KOC Viet - PostgreSQL schema
-- Converted from the Cloudflare D1/SQLite schema in server/db.js.
--
-- Import into an empty PostgreSQL database with:
--   psql -v ON_ERROR_STOP=1 -U <user> -d <database> -f database/postgresql_schema.sql
--
-- Compatibility notes:
--   * Application timestamps remain Unix seconds and are therefore BIGINT.
--   * Money, counters, and SQLite INTEGER values use BIGINT to retain SQLite's
--     signed 64-bit range.
--   * JSON-shaped values remain TEXT because the current application serializes
--     and parses them itself.
--   * 0/1 flags remain numeric to match current JavaScript/D1 behavior.

BEGIN;

CREATE TABLE IF NOT EXISTS _meta (
  k TEXT PRIMARY KEY,
  v TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  koc_id TEXT,
  business_id TEXT,
  session_version BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  locked_at BIGINT,
  locked_reason TEXT,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS kocs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  tier TEXT NOT NULL DEFAULT 'Nano',
  province TEXT,
  avatar TEXT,
  bio TEXT,
  followers BIGINT DEFAULT 0,
  engagement DOUBLE PRECISION DEFAULT 0,
  categories TEXT DEFAULT '[]',
  socials TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  accepting TEXT DEFAULT '{}',
  ai_clone BIGINT DEFAULT 0,
  rating DOUBLE PRECISION DEFAULT 0,
  reviews_count BIGINT DEFAULT 0,
  completed_bookings BIGINT DEFAULT 0,
  contract_hash TEXT,
  leader BIGINT DEFAULT 0,
  created_at BIGINT NOT NULL,
  email TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_owner TEXT,
  cover TEXT,
  contract_version TEXT,
  contract_signed_at BIGINT,
  contract_signature TEXT,
  contract_html TEXT,
  followers_verified BIGINT NOT NULL DEFAULT 0,
  followers_verified_at BIGINT,
  followers_verification_source TEXT,
  bank_bin TEXT
);

CREATE TABLE IF NOT EXISTS koc_prices (
  id TEXT PRIMARY KEY,
  koc_id TEXT NOT NULL,
  category TEXT NOT NULL,
  price BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS koc_identity_documents (
  koc_id TEXT PRIMARY KEY,
  front_image TEXT NOT NULL,
  back_image TEXT NOT NULL,
  selfie_image TEXT NOT NULL,
  front_object_key TEXT,
  back_object_key TEXT,
  selfie_object_key TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  contact TEXT,
  created_at BIGINT NOT NULL,
  avatar TEXT,
  cover TEXT,
  industry TEXT,
  tax_code TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_owner TEXT,
  license_file TEXT,
  license_name TEXT,
  license_type TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  business_id TEXT NOT NULL,
  koc_id TEXT NOT NULL,
  category TEXT,
  price BIGINT NOT NULL,
  escrow BIGINT DEFAULT 0,
  product_link TEXT,
  requirements TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  post_link TEXT,
  post_platform TEXT,
  type TEXT DEFAULT 'marketplace',
  video_link TEXT,
  rating BIGINT,
  review TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  booking_type TEXT DEFAULT 'ad',
  platform TEXT,
  product_url TEXT,
  commission_rate DOUBLE PRECISION DEFAULT 0,
  platform_fee_rate DOUBLE PRECISION DEFAULT 0.01,
  content_type TEXT DEFAULT 'review',
  aiclone_format TEXT,
  aiclone_message TEXT,
  aiclone_script TEXT,
  aiclone_batch_id TEXT,
  business_video_link TEXT,
  koc_video_link TEXT,
  aiclone_scope TEXT,
  aiclone_video_quantity BIGINT DEFAULT 1,
  aiclone_production_fee BIGINT DEFAULT 0,
  aiclone_platform_fee BIGINT DEFAULT 0,
  aiclone_quote_note TEXT,
  aiclone_quote_production BIGINT DEFAULT 0,
  aiclone_quote_koc BIGINT DEFAULT 0,
  aiclone_quote_platform BIGINT DEFAULT 0,
  aiclone_quote_additional BIGINT DEFAULT 0,
  funding_mode TEXT NOT NULL DEFAULT 'legacy',
  escrow_hold_id TEXT
);

CREATE TABLE IF NOT EXISTS wallet_tx (
  id TEXT PRIMARY KEY,
  koc_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'settled',
  note TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  koc_id TEXT NOT NULL,
  short_code TEXT NOT NULL,
  clicks BIGINT DEFAULT 0,
  orders BIGINT DEFAULT 0,
  commission BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  budget BIGINT,
  qty BIGINT,
  tier TEXT,
  category TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending',
  assigned TEXT DEFAULT '[]',
  management_rate DOUBLE PRECISION NOT NULL DEFAULT 0.15,
  management_fee BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  upfront_fee_released BIGINT NOT NULL DEFAULT 0,
  funded_at BIGINT, started_at BIGINT, completed_at BIGINT, cancelled_at BIGINT,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaign_allocations (id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,koc_id TEXT NOT NULL,amount BIGINT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',settled_at BIGINT,created_at BIGINT NOT NULL,updated_at BIGINT NOT NULL,UNIQUE(campaign_id,koc_id));
CREATE INDEX IF NOT EXISTS idx_campaign_allocations_campaign ON campaign_allocations(campaign_id,status);

CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  amount BIGINT NOT NULL,
  ref TEXT,
  note TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS aiclone (
  id TEXT PRIMARY KEY,
  koc_id TEXT NOT NULL,
  status TEXT DEFAULT 'registered',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  koc_id TEXT NOT NULL,
  tracking_code TEXT NOT NULL,
  generated_url TEXT NOT NULL,
  platform TEXT,
  status TEXT DEFAULT 'active',
  clicks BIGINT DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_orders (
  id TEXT PRIMARY KEY,
  affiliate_link_id TEXT NOT NULL,
  koc_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  platform_order_id TEXT NOT NULL,
  gmv BIGINT NOT NULL DEFAULT 0,
  commission_amount BIGINT NOT NULL DEFAULT 0,
  platform_fee BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  ip TEXT,
  device TEXT,
  flagged BIGINT DEFAULT 0,
  ordered_at BIGINT NOT NULL,
  settled_at BIGINT
);

CREATE TABLE IF NOT EXISTS affiliate_settlements (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  koc_id TEXT,
  booking_id TEXT,
  order_id TEXT,
  amount BIGINT NOT NULL,
  note TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS kol_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  field TEXT,
  fanbase TEXT,
  channels TEXT DEFAULT '[]',
  media_kit TEXT,
  ref_price BIGINT DEFAULT 0,
  price_hidden BIGINT DEFAULT 1,
  premium BIGINT DEFAULT 0,
  avatar TEXT,
  bio TEXT,
  status TEXT DEFAULT 'active',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS kol_requests (
  id TEXT PRIMARY KEY,
  kol_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  brief TEXT,
  budget BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  quote BIGINT DEFAULT 0,
  admin_note TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  need TEXT,
  source TEXT,
  status TEXT DEFAULT 'new',
  created_at BIGINT NOT NULL,
  assigned_to TEXT,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT,
  action TEXT NOT NULL,
  ref TEXT,
  detail TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_otp (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'onboard',
  verified BIGINT DEFAULT 0,
  attempts BIGINT DEFAULT 0,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  raised_by_role TEXT NOT NULL,
  raised_by_id TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_note TEXT,
  refunded BIGINT DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_video_submissions (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  stream_uid TEXT UNIQUE,
  storage_provider TEXT NOT NULL DEFAULT 'r2',
  object_key TEXT,
  r2_upload_id TEXT,
  version BIGINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'uploading',
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  preview_url TEXT,
  thumbnail_url TEXT,
  download_url TEXT,
  duration DOUBLE PRECISION,
  review_note TEXT,
  submitted_at BIGINT,
  reviewed_at BIGINT,
  reviewed_by TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'payos',
  order_code BIGINT NOT NULL UNIQUE,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating',
  payment_link_id TEXT,
  checkout_url TEXT,
  qr_code TEXT,
  provider_reference TEXT,
  failure_reason TEXT,
  paid_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'escrow'
);

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  bucket TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND',
  balance BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (owner_type, owner_id, bucket)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  note TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_postings (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  applied BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_migrations (
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  source_balance BIGINT NOT NULL DEFAULT 0,
  migrated_at BIGINT NOT NULL,
  PRIMARY KEY (owner_type, owner_id)
);

CREATE TABLE IF NOT EXISTS wallet_deposits (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'payos',
  mode TEXT NOT NULL DEFAULT 'live',
  order_code BIGINT NOT NULL UNIQUE,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating',
  payment_link_id TEXT,
  checkout_url TEXT,
  qr_code TEXT,
  provider_reference TEXT,
  failure_reason TEXT,
  paid_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS escrow_holds (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  business_id TEXT NOT NULL,
  koc_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  released_at BIGINT
);

CREATE TABLE IF NOT EXISTS payout_requests (
  id TEXT PRIMARY KEY,
  koc_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  mode TEXT NOT NULL DEFAULT 'live',
  bank_bin TEXT,
  bank_account TEXT,
  bank_owner TEXT,
  provider_payout_id TEXT,
  provider_reference TEXT,
  provider_state TEXT,
  failure_reason TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  paid_at BIGINT
);

CREATE TABLE IF NOT EXISTS business_products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  platform TEXT,
  sku TEXT,
  price BIGINT NOT NULL DEFAULT 0,
  image_url TEXT,
  commission_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  affiliate_enabled BIGINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (business_id, product_url)
);

CREATE TABLE IF NOT EXISTS sales_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  actor_id TEXT,
  status TEXT NOT NULL,
  note TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  href TEXT,
  is_read BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

-- Present in the existing local D1 database (legacy verification workflow).
-- Kept so a full D1 export can be restored without dropping historical rows.
CREATE TABLE IF NOT EXISTS kyc_evidence (
  id TEXT PRIMARY KEY,
  koc_id TEXT NOT NULL,
  front_object_key TEXT NOT NULL,
  front_mime_type TEXT NOT NULL,
  back_object_key TEXT NOT NULL,
  back_mime_type TEXT NOT NULL,
  selfie_object_key TEXT NOT NULL,
  selfie_mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS follower_evidence (
  id TEXT PRIMARY KEY,
  koc_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  expected_username TEXT,
  detected_username TEXT,
  follower_text TEXT,
  follower_count BIGINT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  readable BIGINT NOT NULL DEFAULT 0,
  username_matches BIGINT NOT NULL DEFAULT 0,
  image_appears_modified BIGINT NOT NULL DEFAULT 0,
  warnings TEXT NOT NULL DEFAULT '[]',
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'observed',
  created_at BIGINT NOT NULL,
  ownership_verified BIGINT NOT NULL DEFAULT 0,
  verification_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_business_products_business_updated
  ON business_products (business_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_products_business_status
  ON business_products (business_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_created
  ON payment_requests (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_entries_reference
  ON journal_entries (reference_type, reference_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_business_created
  ON wallet_deposits (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_koc_created
  ON payout_requests (koc_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_video_version
  ON booking_video_submissions (booking_id, version DESC);

-- KOC Viet partner program: a standalone, admin-managed partner earns a share
-- of the 5% service fee on bookings of its KOCs.
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  bank_name TEXT,
  bank_bin TEXT,
  bank_account TEXT,
  bank_owner TEXT,
  fee_rate DOUBLE PRECISION NOT NULL DEFAULT 0.3,
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_members (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  koc_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_at BIGINT NOT NULL,
  assigned_by TEXT,
  removed_at BIGINT
);

CREATE TABLE IF NOT EXISTS partner_earnings (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  koc_id TEXT NOT NULL,
  base_service_fee BIGINT NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  amount BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_members_active_koc
  ON partner_members (koc_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_partner_members_partner
  ON partner_members (partner_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_earnings_booking
  ON partner_earnings (booking_id);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner
  ON partner_earnings (partner_id, created_at DESC);

COMMIT;
