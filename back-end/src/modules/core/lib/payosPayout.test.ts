import assert from 'node:assert/strict';
import test from 'node:test';
import { createPayOSPayout, payOSPayoutConfig, payoutSignatureData } from './payosPayout.js';

const payoutEnv = {
  PAYOS_CLIENT_ID: 'payment-client',
  PAYOS_API_KEY: 'payment-api-key',
  PAYOS_CHECKSUM_KEY: 'payment-checksum',
  PAYOS_PAYOUT_CLIENT_ID: 'payout-client',
  PAYOS_PAYOUT_API_KEY: 'payout-api-key',
  PAYOS_PAYOUT_CHECKSUM_KEY: 'payout-checksum',
};

test('payout configuration does not fall back to payment collection keys', () => {
  assert.throws(
    () => payOSPayoutConfig({
      PAYOS_CLIENT_ID: 'payment-client',
      PAYOS_API_KEY: 'payment-api-key',
      PAYOS_CHECKSUM_KEY: 'payment-checksum',
    }),
    /mã kết nối kênh rút tiền/,
  );
});

test('payout configuration rejects a copied payment collection key set', () => {
  assert.throws(
    () => payOSPayoutConfig({
      PAYOS_CLIENT_ID: 'same-client',
      PAYOS_API_KEY: 'same-api-key',
      PAYOS_CHECKSUM_KEY: 'same-checksum',
      PAYOS_PAYOUT_CLIENT_ID: 'same-client',
      PAYOS_PAYOUT_API_KEY: 'same-api-key',
      PAYOS_PAYOUT_CHECKSUM_KEY: 'same-checksum',
    }),
    /chưa được cấu hình đúng/,
  );
});

test('payout signature data is sorted and safely encoded', () => {
  assert.equal(
    payoutSignatureData({
      toBin: '970436',
      description: 'RUT VI KOC 1234',
      amount: 100000,
      category: ['other'],
      toAccountNumber: '0123456789',
      referenceId: 'wd-1234',
    }),
    'amount=100000&category=%5B%22other%22%5D&description=RUT%20VI%20KOC%201234&referenceId=wd-1234&toAccountNumber=0123456789&toBin=970436',
  );
});

test('payout rejection preserves safe provider details for the API response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    code: '231',
    desc: '  Destination account is not eligible\nfor payout.  ',
  }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });

  try {
    await assert.rejects(
      createPayOSPayout(payoutEnv, {
        referenceId: 'wd-test-provider-error',
        amount: 10000,
        description: 'RUT VI KOC TEST',
        toBin: '970436',
        toAccountNumber: '0123456789',
      }, 'wd-test-provider-error'),
      error => {
        const payoutError = error as Error & {
          providerCode?: string;
          providerDescription?: string;
        };
        assert.equal(payoutError.providerCode, '231');
        assert.equal(
          payoutError.providerDescription,
          'Destination account is not eligible for payout.',
        );
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payout explains an invalid destination account without retrying', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({
      code: '607',
      desc: 'Tài khoản đích không hợp lệ',
    }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await assert.rejects(
      createPayOSPayout(payoutEnv, {
        referenceId: 'wd-test-invalid-destination',
        amount: 10000,
        description: 'RUT VI KOC TEST',
        toBin: '970405',
        toAccountNumber: '0123456789',
      }, 'wd-test-invalid-destination'),
      error => {
        const payoutError = error as Error & {
          invalidDestination?: boolean;
          providerCode?: string;
        };
        assert.equal(payoutError.invalidDestination, true);
        assert.equal(payoutError.providerCode, '607');
        assert.match(payoutError.message, /ngân hàng và số tài khoản trong Hồ sơ/);
        return true;
      },
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payout retries a rate-limited idempotent request', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get('x-idempotency-key'), 'wd-test-rate-limit');
    if (calls === 1) {
      return new Response(JSON.stringify({ code: '429', desc: 'Too Many Requests' }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '0' },
      });
    }
    return new Response(JSON.stringify({
      code: '00',
      desc: 'success',
      data: { id: 'payout-test' },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await createPayOSPayout(payoutEnv, {
      referenceId: 'wd-test-rate-limit',
      amount: 10000,
      description: 'RUT VI KOC TEST',
      toBin: '970436',
      toAccountNumber: '0123456789',
    }, 'wd-test-rate-limit');
    assert.equal(result.id, 'payout-test');
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payout returns rate-limit metadata after bounded retries', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ code: '429', desc: 'Too Many Requests' }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '0' },
    });
  };

  try {
    await assert.rejects(
      createPayOSPayout(payoutEnv, {
        referenceId: 'wd-test-rate-limit-exhausted',
        amount: 10000,
        description: 'RUT VI KOC TEST',
        toBin: '970436',
        toAccountNumber: '0123456789',
      }, 'wd-test-rate-limit-exhausted'),
      error => {
        const payoutError = error as Error & {
          rateLimited?: boolean;
          retryAfter?: number;
          status?: number;
        };
        assert.equal(payoutError.rateLimited, true);
        assert.equal(payoutError.retryAfter, 0);
        assert.equal(payoutError.status, 429);
        return true;
      },
    );
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payout requires an idempotency key before calling payOS', async () => {
  await assert.rejects(
    createPayOSPayout(payoutEnv, {
      referenceId: 'wd-test-no-key',
      amount: 10000,
      description: 'RUT VI KOC TEST',
      toBin: '970436',
      toAccountNumber: '0123456789',
    }, undefined),
    /khóa chống trùng lệnh chi/,
  );
});
