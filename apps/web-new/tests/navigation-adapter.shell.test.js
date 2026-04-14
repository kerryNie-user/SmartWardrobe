const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('navigation adapter 应支持 query 读取、href 构建与跳转委托', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/outfit-detail.html?id=midnight-formalism&redirect=me.html'
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'navigationAdapter.js')).href}?adapter=1`;
  const { createNavigationAdapter } = await import(modulePath);

  let assignedHref = null;
  const adapter = createNavigationAdapter({
    locationObject: {
      href: dom.window.location.href,
      assign(nextHref) {
        assignedHref = nextHref;
      }
    }
  });

  assert.strictEqual(adapter.getQueryParam('id'), 'midnight-formalism');
  assert.strictEqual(adapter.getQueryParam('redirect'), 'me.html');
  assert.strictEqual(adapter.buildHref('wardrobe-detail.html', { id: 'coat-1' }), 'wardrobe-detail.html?id=coat-1');

  adapter.navigateToHref('profile.html');
  assert.strictEqual(assignedHref, 'profile.html');
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
