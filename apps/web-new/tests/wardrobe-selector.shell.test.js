const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('wardrobeSelectors 应处理搜索过滤与表单 payload 组装', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeSelectors.js')).href}?selector=1`;
  const {
    selectWardrobeSearchResult,
    buildWardrobeSavePayload
  } = await import(modulePath);

  const items = [
    { id: 'coat-1', title: 'Atelier Coat', category: 'Outerwear', material: 'Wool', filter: 'essentials' },
    { id: 'shirt-1', title: 'Studio Shirt', category: 'Shirting', material: 'Cotton', filter: 'all-day' }
  ];

  const visibleItems = selectWardrobeSearchResult(items, 'coat', 'essentials');
  assert.strictEqual(visibleItems.length, 1);
  assert.strictEqual(visibleItems[0].id, 'coat-1');

  const payload = buildWardrobeSavePayload({
    formValues: {
      title: 'Travel Bomber',
      category: '',
      size: '',
      color: '',
      material: '',
      image: '',
      filter: 'outerwear',
      favorite: true
    },
    locale: 'en-US',
    fallback: {
      category: 'Outerwear',
      size: 'M',
      color: 'Black',
      material: 'Technical twill'
    },
    defaultImage: '/uploads/wardrobe/wool-trench.jpg',
    now: 123
  });

  assert.strictEqual(payload.id, 'travel-bomber-123');
  assert.strictEqual(payload.category, 'Outerwear');
  assert.strictEqual(payload.favorite, true);
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
