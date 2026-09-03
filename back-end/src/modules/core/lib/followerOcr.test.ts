import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeFollowerOcrEvidence,
  followerOcrFailureMessage,
} from './followerOcr.js';

test('reports the exact failed OCR checks in Vietnamese', () => {
  const message = followerOcrFailureMessage([
    'ownershipCode',
    'followerCount',
  ]);

  assert.match(message, /mã xác minh/);
  assert.match(message, /số người theo dõi/);
});

test('identifies the ownership-code OCR error from the reported screenshot', () => {
  const analysis = analyzeFollowerOcrEvidence({
    ocrText:
      'Chia sẻ suy nghĩ...\nViệt Khoa\n555 người theo dõi · 593 đang theo dõi\nKOQv-9DCiB2',
    ocrConfidence: 59,
    ownershipCode: 'KOCV-9DC1B2',
    claimedFollowers: 555,
  });

  assert.equal(analysis.checks.followerCount, true);
  assert.equal(analysis.checks.ownershipCode, false);
  assert.deepEqual(analysis.failedChecks, ['ownershipCode']);
  assert.equal(
    followerOcrFailureMessage(analysis.failedChecks),
    'Ảnh chưa đạt: không nhận ra đúng mã xác minh. Hãy chụp rõ đúng các mục trên rồi thử lại.',
  );
});

test('only checks the ownership code and follower count', () => {
  const analysis = analyzeFollowerOcrEvidence({
    ocrText:
      'Chia sẻ suy nghĩ...\nLê Vĩnh Quang\n123 người theo dõi · 141 đang theo dõi\nKOCV-1CCD9A',
    ocrConfidence: 1,
    ownershipCode: 'KOCV-1CCD9A',
    claimedFollowers: 123,
  });

  assert.deepEqual(analysis.failedChecks, []);
  assert.deepEqual(analysis.checks, {
    ownershipCode: true,
    followerCount: true,
  });
});
