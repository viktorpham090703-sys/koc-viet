import assert from 'node:assert/strict';
import test from 'node:test';
import { sendAccountReviewEmail } from './smtp.js';

const env = {
  BREVO_API_KEY: 'test-brevo-key',
  EMAIL_FROM_ADDRESS: 'no-reply@kocviet.com',
  EMAIL_FROM_NAME: 'KOC Việt',
};

test('sends an approval email for an approved KOC account', async (t) => {
  let request: { url: string; init: RequestInit } | undefined;
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init: init || {} };
    return Response.json({ messageId: 'approval-test' });
  });

  const result = await sendAccountReviewEmail(env, 'koc@example.com', {
    role: 'koc',
    name: 'Nguyễn Văn A',
    status: 'active',
  });

  assert.equal(result.messageId, 'approval-test');
  assert.equal(request?.url, 'https://api.brevo.com/v3/smtp/email');
  const payload = JSON.parse(String(request?.init.body));
  assert.equal(payload.to[0].email, 'koc@example.com');
  assert.match(payload.subject, /đã được duyệt/i);
  assert.match(payload.textContent, /đã được kích hoạt/i);
  assert.deepEqual(payload.tags, ['account-review', 'KOC', 'approved']);
});

test('includes the rejection reason in a business review email', async (t) => {
  let payload: any;
  t.mock.method(globalThis, 'fetch', async (_url: string | URL | Request, init?: RequestInit) => {
    payload = JSON.parse(String(init?.body));
    return Response.json({ messageId: 'rejection-test' });
  });

  await sendAccountReviewEmail(env, 'business@example.com', {
    role: 'business',
    name: 'Công ty A',
    status: 'rejected',
    reason: 'Thiếu giấy phép kinh doanh',
  });

  assert.match(payload.textContent, /Thiếu giấy phép kinh doanh/);
  assert.deepEqual(payload.tags, ['account-review', 'doanh nghiệp', 'rejected']);
});
