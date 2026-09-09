import test from 'node:test';
import assert from 'node:assert/strict';
import { getSocialAuthUrl, generateDevMockChannelStats } from './oauthProviders.js';

test('generates mock auth url in development when credentials are not configured', () => {
  const env = { PORT: 3000, NODE_ENV: 'development' };
  const auth = getSocialAuthUrl(env, 'YouTube', 'csrf-state-123');
  assert.equal(auth.isMock, true);
  assert.ok(auth.url.includes('/api/oauth/social/dev-connect'));
  assert.ok(auth.url.includes('platform=YouTube'));
  assert.ok(auth.url.includes('state=csrf-state-123'));
});

test('generates real Google OAuth URL when GOOGLE_CLIENT_ID is present', () => {
  const env = { PORT: 3000, GOOGLE_CLIENT_ID: 'test-google-id', GOOGLE_CLIENT_SECRET: 'test-secret' };
  const auth = getSocialAuthUrl(env, 'YouTube', 'csrf-state-123');
  assert.equal(auth.isMock, false);
  assert.ok(auth.url.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
  assert.ok(auth.url.includes('client_id=test-google-id'));
  assert.ok(auth.url.includes('state=csrf-state-123'));
});

test('generates dev mock channel stats with verified flag and followers', () => {
  const stats = generateDevMockChannelStats('TikTok', 12500);
  assert.equal(stats.platform, 'TikTok');
  assert.equal(stats.followers, 12500);
  assert.equal(stats.verified, true);
  assert.equal(stats.verificationSource, 'oauth2_mock_dev');
  assert.ok(stats.handle.includes('tiktok.com'));
});

test('generates mock channel stats with random followers when not specified', () => {
  const stats = generateDevMockChannelStats('YouTube');
  assert.equal(stats.platform, 'YouTube');
  assert.ok(stats.followers >= 5000);
  assert.equal(stats.verified, true);
});

