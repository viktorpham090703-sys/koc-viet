import assert from 'node:assert/strict'
import test from 'node:test'
import {
  preserveVerifiedPrimarySocial,
  validateSocialsInput,
} from './routes.js'

test('validates and normalizes multiple distinct social channels', () => {
  const result = validateSocialsInput([
    { platform: 'tiktok', handle: 'https://www.tiktok.com/@kocviet', followers: 12000 },
    { platform: 'Threads', handle: 'https://www.threads.net/@kocviet' },
    { platform: 'twitter', handle: 'https://x.com/kocviet' },
    { platform: 'Zalo', handle: 'https://zalo.me/0900000000' },
  ])

  assert.equal(result.error, '')
  assert.deepEqual(result.socials.map((social) => social.platform), [
    'TikTok',
    'Threads',
    'X (Twitter)',
    'Zalo',
  ])
})

test('rejects duplicate platforms and more than six channels', () => {
  assert.match(
    validateSocialsInput([
      { platform: 'X', handle: 'https://x.com/one' },
      { platform: 'Twitter', handle: 'https://x.com/two' },
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
      'LinkedIn',
      'Zalo',
    ].map((platform) => ({ platform, handle: `https://example.com/${platform}` }))).error,
    /tối đa 6/,
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
    verificationSource: 'tesseract_ocr',
  }
  const merged = preserveVerifiedPrimarySocial(primary, [
    { platform: 'Instagram', handle: 'https://instagram.com/kocviet', followers: 25000 },
  ])

  assert.equal(merged[0], primary)
  assert.equal(merged[0].verified, true)
  assert.equal(merged[1].platform, 'Instagram')
})
