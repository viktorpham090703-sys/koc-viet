import assert from 'node:assert/strict';
import test from 'node:test';
import { payOSPayoutConfig, payoutSignatureData } from './payosPayout.js';

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
