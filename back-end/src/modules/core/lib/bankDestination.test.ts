import assert from 'node:assert/strict';
import test from 'node:test';
import { PAYOUT_BANKS, expectedPayoutBankBin, payoutBankBinError } from './bankDestination.js';

test('publishes a unique payout-bank catalogue with valid BIN values', () => {
  assert.ok(PAYOUT_BANKS.length >= 30);
  assert.equal(new Set(PAYOUT_BANKS.map(bank => bank.bin)).size, PAYOUT_BANKS.length);
  assert.equal(new Set(PAYOUT_BANKS.map(bank => bank.name)).size, PAYOUT_BANKS.length);
  PAYOUT_BANKS.forEach(bank => {
    assert.match(bank.bin, /^\d{6}$/);
    assert.equal(expectedPayoutBankBin(bank.name), bank.bin);
  });
});

test('resolves common Vietnamese bank names to their payout BIN', () => {
  assert.equal(expectedPayoutBankBin('Agribank'), '970405');
  assert.equal(expectedPayoutBankBin('Ngân hàng TMCP Ngoại Thương Việt Nam'), '970436');
  assert.equal(expectedPayoutBankBin('MB Bank'), '970422');
});

test('detects a stale BIN after the payout bank was changed', () => {
  assert.equal(
    payoutBankBinError('Agribank', '970436'),
    'Thông tin ngân hàng Agribank không khớp danh mục hiện tại',
  );
  assert.equal(payoutBankBinError('Agribank', '970405'), '');
  assert.equal(payoutBankBinError('Ngân hàng chưa có trong danh mục', '123456'), '');
});
