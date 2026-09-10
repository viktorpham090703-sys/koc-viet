import assert from 'node:assert/strict';
import test from 'node:test';
import {matchesSearch, searchForm} from './list-search.js';

test('list search matches Vietnamese names across accents, case and word order', () => {
  for (const query of ['nguyen thu ha', 'HÀ NGUYỄN', '  thu  nguyen ']) {
    assert.equal(matchesSearch('AF-001 Nguyễn Thu Hà Shopee', query), true);
  }
  assert.equal(matchesSearch('Đặng Mỹ phẩm'.normalize('NFD'), 'dang my'), true);
  assert.equal(matchesSearch('Nguyễn Thu Hà', 'nguyen mai'), false);
  assert.equal(matchesSearch('AF-001', '%'), false);
  assert.equal(matchesSearch(null, ''), true);
});

test('restoring search text cannot inject markup or event attributes', () => {
  const html = searchForm('orders', 'Tìm đơn', 'Mã đơn', '\"><img src=x onerror="alert(1)">');
  assert.equal(html.includes('<img'), false);
  assert.match(html, /value="&quot;&gt;&lt;img/);
  assert.match(html, /<label for="search-orders">Tìm đơn<\/label>/);
});
