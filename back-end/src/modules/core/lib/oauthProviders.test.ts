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

test('generates real Threads OAuth URL when THREADS_APP_ID is present', () => {
  const env = { PORT: 3000, THREADS_APP_ID: '1637121447938714', THREADS_APP_SECRET: 'test-secret' };
  const auth = getSocialAuthUrl(env, 'Threads', 'csrf-threads-123');
  assert.equal(auth.isMock, false);
  assert.ok(auth.url.startsWith('https://threads.net/oauth/authorize'));
  assert.ok(auth.url.includes('client_id=1637121447938714'));
  assert.ok(auth.url.includes('scope=threads_basic'));
  assert.ok(auth.url.includes('state=csrf-threads-123'));
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

test('resolves Google OAuth redirect URI using explicit or inferred origin', () => {
  // Case 1: Explicit GOOGLE_REDIRECT_URI
  const env1 = {
    PORT: 3000,
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REDIRECT_URI: 'https://kocviet.com/api/oauth/social/callback',
  };
  const auth1 = getSocialAuthUrl(env1, 'YouTube', 'csrf-1');
  assert.ok(auth1.url.includes('redirect_uri=https%3A%2F%2Fkocviet.com%2Fapi%2Foauth%2Fsocial%2Fcallback'));

  // Case 2: Inferred from THREADS_REDIRECT_URI when GOOGLE_REDIRECT_URI is not set
  const env2 = {
    PORT: 3000,
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'secret',
    THREADS_REDIRECT_URI: 'https://kocviet.com/api/oauth/social/callback',
  };
  const auth2 = getSocialAuthUrl(env2, 'YouTube', 'csrf-2');
  assert.ok(auth2.url.includes('redirect_uri=https%3A%2F%2Fkocviet.com%2Fapi%2Foauth%2Fsocial%2Fcallback'));

  // Case 3: Inferred from requestOrigin
  const env3 = {
    PORT: 3000,
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'secret',
  };
  const auth3 = getSocialAuthUrl(env3, 'YouTube', 'csrf-3', 'https://kocviet.com');
  assert.ok(auth3.url.includes('redirect_uri=https%3A%2F%2Fkocviet.com%2Fapi%2Foauth%2Fsocial%2Fcallback'));
});

