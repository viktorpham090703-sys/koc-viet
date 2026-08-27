import assert from 'node:assert/strict';
import test from 'node:test';
import kolProfiles from './kol-profiles.json' with { type: 'json' };

test('publishes the normalized Cloudinary KOL catalog', () => {
  assert.equal(kolProfiles.length, 202);
  assert.equal(new Set(kolProfiles.map((profile) => profile.id)).size, kolProfiles.length);
  assert.equal(new Set(kolProfiles.map((profile) => profile.name.trim().toLocaleLowerCase('vi'))).size, kolProfiles.length);

  for (const profile of kolProfiles) {
    assert.equal(profile.status, 'active');
    assert.match(profile.avatar, /^https:\/\/res\.cloudinary\.com\/drxum5uxt\/image\/upload\//);
    assert.ok(profile.name.trim());
    assert.ok(profile.field.trim());
    assert.ok(Array.isArray(profile.channels));
    assert.ok(!('email' in profile));
    assert.ok(!('phone' in profile));
  }
});
