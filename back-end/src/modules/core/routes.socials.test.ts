import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MIN_KOC_REGISTRATION_FOLLOWERS,
  preserveVerifiedPrimarySocial,
  sameSocialAccountHandle,
  validKocRegistrationFollowerCount,
  validateSocialsInput,
} from './routes.js'

test('account changes compare exact identities, including Facebook profile IDs', () => {
  assert.equal(sameSocialAccountHandle('@koc', 'https://www.tiktok.com/@koc'), true)
  assert.equal(sameSocialAccountHandle('https://tiktok.com/@koc/', 'https://www.tiktok.com/@koc'), true)
  assert.equal(sameSocialAccountHandle('@verified-koc', '@other-verified-koc'), false)
  assert.equal(sameSocialAccountHandle('https://facebook.com/profile.php?id=1', 'https://facebook.com/profile.php?id=2'), false)
  assert.equal(sameSocialAccountHandle('https://tiktok.com/@koc', 'https://example.com/@koc'), false)
})

test('requires at least 1,000 followers for KOC registration', () => {
  assert.equal(MIN_KOC_REGISTRATION_FOLLOWERS, 1000)
  assert.equal(validKocRegistrationFollowerCount(999), false)
  assert.equal(validKocRegistrationFollowerCount(1000), true)
  assert.equal(validKocRegistrationFollowerCount('25000'), true)
  assert.equal(validKocRegistrationFollowerCount(1000.5), false)
  assert.equal(validKocRegistrationFollowerCount(2_000_000_001), false)
})

test('validates and normalizes the five supported social channels', () => {
  const result = validateSocialsInput([
    { platform: 'tiktok', handle: 'https://www.tiktok.com/@kocviet', followers: 12000 },
    { platform: 'Facebook', handle: 'https://www.facebook.com/kocviet' },
    { platform: 'Instagram', handle: 'https://www.instagram.com/kocviet' },
    { platform: 'YouTube', handle: 'https://www.youtube.com/@kocviet' },
    { platform: 'Threads', handle: 'https://www.threads.net/@kocviet' },
  ])

  assert.equal(result.error, '')
  assert.deepEqual(result.socials.map((social) => social.platform), [
    'TikTok',
    'Facebook',
    'Instagram',
    'YouTube',
    'Threads',
  ])
})

test('rejects removed social platforms', () => {
  for (const platform of ['X', 'Twitter', 'LinkedIn', 'Zalo', 'Pinterest', 'Twitch']) {
    assert.match(
      validateSocialsInput([
        { platform, handle: `https://example.com/${platform}` },
      ]).error,
      /không được hỗ trợ/,
    )
  }
})

test('rejects duplicate platforms and more than five channels', () => {
  assert.match(
    validateSocialsInput([
      { platform: 'TikTok', handle: 'https://www.tiktok.com/@one' },
      { platform: 'tiktok', handle: 'https://www.tiktok.com/@two' },
    ]).error,
    /đã được chọn trùng/,
  )

  assert.match(
    validateSocialsInput([
      'TikTok',
      'Facebook',
      'Instagram',
      'YouTube',
      'Threads',
      'TikTok',
    ].map((platform) => ({ platform, handle: `https://example.com/${platform}` }))).error,
    /tối đa 5/,
  )

  assert.match(
    validateSocialsInput([
      { platform: 'TikTok', handle: 'đây không phải link kênh' },
    ]).error,
    /không hợp lệ/,
  )
})

test('keeps legacy @handles valid while the UI migrates them to full URLs', () => {
  const result = validateSocialsInput([
    { platform: 'Instagram', handle: '@koc.viet' },
  ])
  assert.equal(result.error, '')
  assert.equal(result.socials[0].handle, '@koc.viet')
})

test('keeps verified primary metadata while allowing secondary channels to change', () => {
  const primary = {
    platform: 'TikTok',
    handle: '@verified-koc',
    followers: 25000,
    verified: true,
    verificationSource: 'manual_review',
  }
  const merged = preserveVerifiedPrimarySocial(primary, [
    { platform: 'Instagram', handle: 'https://instagram.com/kocviet', followers: 25000 },
  ])

  assert.equal(merged[0], primary)
  assert.equal(merged[0].verified, true)
  assert.equal(merged[1].platform, 'Instagram')
})

test('does not preserve a verified primary channel from a removed platform', () => {
  const requested = [
    { platform: 'TikTok', handle: 'https://tiktok.com/@kocviet', followers: 25000 },
  ]
  const merged = preserveVerifiedPrimarySocial(
    {
      platform: 'X (Twitter)',
      handle: 'https://x.com/legacy-koc',
      followers: 25000,
      verified: true,
    },
    requested,
  )

  assert.deepEqual(merged, requested)
})
