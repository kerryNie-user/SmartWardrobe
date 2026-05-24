const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('wardrobeSelectors 应处理搜索过滤、真实分类 tabs 与扫描 payload 组装', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeSelectors.js')).href}?selector=1`;
  const {
    selectWardrobeSearchResult,
    buildWardrobeCategoryTabs,
    buildScannedWardrobeSavePayload
  } = await import(modulePath);

  const items = [
    { id: 'coat-1', title: 'Atelier Coat', category: 'Outerwear', material: 'Wool', filter: 'essentials' },
    { id: 'shirt-1', title: 'Studio Shirt', category: 'Shirting', material: 'Cotton', filter: 'all-day' }
  ];

  const visibleItems = selectWardrobeSearchResult(items, 'coat', 'essentials');
  assert.strictEqual(visibleItems.length, 1);
  assert.strictEqual(visibleItems[0].id, 'coat-1');

  const tabs = buildWardrobeCategoryTabs([
    { category: '外套', filter: 'outerwear' },
    { category: '外套', filter: 'outerwear' },
    { category: '鞋履', filter: 'footwear' }
  ], [{ key: 'all', label: 'All' }]);
  assert.strictEqual(tabs.length, 3);
  assert.strictEqual(tabs[0].count, 3);
  assert.strictEqual(tabs.find((tab) => tab.key === 'outerwear').count, 2);

  const categoryOnlyItems = [
    { id: 'bag-1', title: 'City Bag', category: '手袋', aiJson: { tags: ['commute'] } }
  ];
  const categoryOnlyTabs = buildWardrobeCategoryTabs(categoryOnlyItems, [{ key: 'all', label: '全部' }]);
  assert.strictEqual(categoryOnlyTabs.length, 2);
  assert.strictEqual(selectWardrobeSearchResult(categoryOnlyItems, 'commute', categoryOnlyTabs[1].key)[0].id, 'bag-1');

  const scanned = buildScannedWardrobeSavePayload({
    itemId: '',
    scanResult: {
      status: 'ready',
      source: 'wardrobe-item-scanner',
      item: {
        title: 'Model Coat',
        category: 'Outerwear',
        image: 'https://example.com/coats/model-coat.jpg',
        tags: ['tailoring']
      },
      metadata: { endpoint: '/api/wardrobe/scan' }
    },
    imagePreview: 'data:image/png;base64,preview',
    existingItem: { favorite: true },
    fallback: { title: 'Pending Recognition Item', category: 'Uncategorized', filter: 'uncategorized' },
    now: 321
  });
  assert.strictEqual(scanned.title, 'Model Coat');
  assert.strictEqual(scanned.image, 'https://example.com/coats/model-coat.jpg');
  assert.strictEqual(scanned.aiJson.status, 'ready');
});

async function main() {
  for (const test of testQueue) {
    try {
      const result = test.fn();
      if (result && typeof result.then === 'function') {
        await result;
      }
      process.stdout.write(`PASS ${test.name}\n`);
    } catch (error) {
      process.stderr.write(`FAIL ${test.name}\n`);
      process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}

main();
