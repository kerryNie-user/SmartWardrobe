const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('pageStoreBinding 应立即首帧渲染并执行 hydrators', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageStoreBinding.js')).href}?initial=1`;
  const { bindPageStores } = await import(modulePath);
  const calls = [];

  const binding = bindPageStores({
    paint() {
      calls.push('paint');
    },
    hydrators: [
      () => {
        calls.push('hydrate-a');
      },
      () => {
        calls.push('hydrate-b');
      }
    ]
  });

  assert.deepStrictEqual(calls, ['paint', 'hydrate-a', 'hydrate-b']);
  binding.teardown();
});

runTest('pageStoreBinding 应把 store 订阅统一接到同一个 repaint 协议', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageStoreBinding.js')).href}?batch=1`;
  const { bindPageStores } = await import(modulePath);
  const listeners = [];
  let paintCount = 0;

  const binding = bindPageStores({
    paint() {
      paintCount += 1;
    },
    subscriptions: [
      (listener) => {
        listeners.push(listener);
        return () => {};
      },
      (listener) => {
        listeners.push(listener);
        return () => {};
      }
    ]
  });

  assert.strictEqual(paintCount, 1);
  listeners[0]();
  listeners[1]();
  assert.strictEqual(paintCount, 3);
  binding.teardown();
});

runTest('pageStoreBinding teardown 应释放所有 unsubscribe', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageStoreBinding.js')).href}?teardown=1`;
  const { bindPageStores } = await import(modulePath);
  let unsubscribeCount = 0;

  const binding = bindPageStores({
    paint() {},
    subscriptions: [
      () => () => {
        unsubscribeCount += 1;
      },
      () => () => {
        unsubscribeCount += 1;
      }
    ]
  });

  binding.teardown();
  assert.strictEqual(unsubscribeCount, 2);
});

runTest('pageStoreBinding 应接管 sync feedback 渲染与 retry-domain 点击', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div data-sync-root></div></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageStoreBinding.js')).href}?sync=1`;
  const { bindPageStores } = await import(modulePath);
  const root = dom.window.document.querySelector('[data-sync-root]');
  const syncListeners = [];
  let retryCount = 0;

  const binding = bindPageStores({
    paint() {},
    syncFeedback: {
      root,
      locale: () => 'en-US',
      bindings: [
        {
          key: 'favorites',
          label: 'Favorites',
          getState: () => ({ status: 'failed', error: 'SAVE_FAILED' }),
          subscribe(listener) {
            syncListeners.push(listener);
            return () => {};
          },
          retry() {
            retryCount += 1;
          }
        }
      ]
    }
  });

  const retryButton = root.querySelector('[data-ct-sync-retry-domain="favorites"]');
  assert.ok(retryButton, 'Expected retry button for failed sync domain');
  retryButton.click();
  assert.strictEqual(retryCount, 1);

  syncListeners[0]({ status: 'synced', lastSyncedAt: Date.now() });
  assert.strictEqual(root.querySelector('[data-sync-status]'), null);
  binding.teardown();
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
