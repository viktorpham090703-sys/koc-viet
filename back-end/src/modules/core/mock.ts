// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
// Mock external-service adapters. Each simulates latency + realistic states.
// Replace internals later with real integrations without touching callers.

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const eKYC = {
  async verify(payload) {
    await delay(200);
    // Simulate near-always-pass with a doc score
    return { ok: true, score: 0.93, docId: 'KYC' + Math.floor(Math.random()*1e6) };
  },
};

export const Signature = {
  // Digital signature / e-contract hashing
  async sign(text) {
    await delay(120);
    const data = new TextEncoder().encode(text + Date.now());
    const buf = await crypto.subtle.digest('SHA-256', data);
    const hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
    return { hash, ts: Date.now() };
  },
};

export const Payment = {
  // Escrow hold + payout gateway (mock)
  async hold(amount) { await delay(150); return { ok: true, txId: 'HOLD' + Math.floor(Math.random()*1e6) }; },
  async refund(amount) { await delay(150); return { ok: true, txId: 'RFND' + Math.floor(Math.random()*1e6) }; },
  async payout(amount) { await delay(200); return { ok: true, txId: 'PAY' + Math.floor(Math.random()*1e6) }; },
};

export const Tracking = {
  shortCode() { return Math.random().toString(36).slice(2, 8); },
};

// ---- Affiliate provider adapter (adapter pattern per platform). Each real sàn would
// implement generateLink()/syncOrders() against its Affiliate/Open API. Here mocked. ----
export const PLATFORMS = ['Shopee', 'Lazada', 'TikTok Shop', 'Tiki', 'Facebook Shop'];

function baseProvider(name, apiSupported) {
  return {
    name, apiSupported,
    // Build a per-KOC tracking url. Real impl calls the sàn Affiliate API; fallback
    // (apiSupported=false) returns an internal redirect service url.
    async generateLink({ productUrl, kocId, bookingId, trackingCode }) {
      await delay(120);
      const sub = encodeURIComponent(trackingCode);
      if (apiSupported && productUrl) {
        const sep = productUrl.includes('?') ? '&' : '?';
        return `${productUrl}${sep}aff_platform=${encodeURIComponent(name)}&koc_id=${kocId}&booking_id=${bookingId}&sub_id=${sub}`;
      }
      // internal redirect service fallback
      return `https://go.kocviet.vn/r/${trackingCode}?koc=${kocId}&bk=${bookingId}`;
    },
    // Simulate pulling a settled order from the sàn (webhook/cron). Returns raw order.
    async fetchOrder({ gmvHint }) {
      await delay(100);
      const gmv = gmvHint || (100000 + Math.floor(Math.random() * 900000));
      return { platform_order_id: name.slice(0, 2).toUpperCase() + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10), gmv };
    },
  };
}

const PROVIDERS = {
  'Shopee': baseProvider('Shopee', true),
  'Lazada': baseProvider('Lazada', true),
  'TikTok Shop': baseProvider('TikTok Shop', true),
  'Tiki': baseProvider('Tiki', true),
  'Facebook Shop': baseProvider('Facebook Shop', false), // no public affiliate API → fallback
};

export function affiliateProvider(platform) {
  return PROVIDERS[platform] || baseProvider(platform || 'Khác', false);
}
// @ts-nocheck -- compatibility core migrated from the original Worker; type incrementally by domain.
