const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

function createJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'application/json' : null;
      }
    },
    async json() {
      return payload;
    }
  };
}

function normalizePath(url) {
  if (typeof url !== 'string') return '';
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

runTest('syncFeedback 应按优先级聚合 failed 覆盖 synced 并输出 retry-all', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'components', 'syncFeedback.js')).href}?aggregate=1`;
  const { buildSyncFeedbackSummary, renderSyncFeedback } = await import(modulePath);
  const summary = buildSyncFeedbackSummary([
    { key: 'profile', label: 'Profile', state: { status: 'synced', lastSyncedAt: 1 }, retry: () => {} },
    { key: 'favorites', label: 'Favorites', state: { status: 'failed', error: 'SAVE_FAILED' }, retry: () => {} }
  ], 'en-US');

  const html = renderSyncFeedback(summary);
  assert.strictEqual(summary.status, 'failed');
  assert.ok(html.includes('data-ct-sync-retry-all'), 'Expected retry-all action');
  assert.ok(html.includes('Favorites'), 'Expected affected domain label');
});

runTest('syncFeedback 在仅有 synced 状态时不应常驻渲染', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'components', 'syncFeedback.js')).href}?synced-hidden=1`;
  const { buildSyncFeedbackSummary, renderSyncFeedback } = await import(modulePath);
  const summary = buildSyncFeedbackSummary([
    { key: 'favorites', label: 'Favorites', state: { status: 'synced', lastSyncedAt: 1 }, retry: () => {} }
  ], 'en-US');

  assert.strictEqual(summary, null);
  assert.strictEqual(renderSyncFeedback(summary), '');
});

runTest('syncFeedback 应创建 topbar 下方的独立挂载根', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div data-topbar></div></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'components', 'syncFeedback.js')).href}?root=1`;
  const { ensureSyncFeedbackRoot } = await import(modulePath);
  const topbarRoot = dom.window.document.querySelector('[data-topbar]');
  const feedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'favorites');

  assert.ok(feedbackRoot, 'Expected sync feedback root');
  assert.strictEqual(feedbackRoot.previousElementSibling, topbarRoot);
  assert.strictEqual(feedbackRoot.getAttribute('data-ct-sync-feedback-root'), 'favorites');
});

runTest('Settings 页面应展示 stale sync feedback 并支持 retry-all', async () => {
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div data-ct-topbar></div>
        <div data-ct-settings-profile></div>
        <div data-ct-settings-panel></div>
        <div data-ct-bottom-nav></div>
      </body>
    </html>
  `, { url: 'http://localhost/settings.html' });

  let failOnce = true;
  const fetch = async (url) => {
    const path = normalizePath(url);

    if (path === '/api/profile') {
      return createJsonResponse({
        profile: {
          name: 'Remote Nova',
          bio: 'Remote bio',
          avatar: './images/profile/elara-vance.jpg'
        }
      });
    }

    if (path === '/api/settings' && failOnce) {
      failOnce = false;
      return createJsonResponse({ error: 'SETTINGS_FETCH_FAILED' }, 500);
    }

    if (path === '/api/settings') {
      return createJsonResponse({
        settings: {
          language: 'en-US',
          'display-mode': 'dark',
          'wardrobe-layout': 'grid',
          'temperature-unit': 'celsius',
          'public-profile': true,
          'outfit-reminders': true
        }
      });
    }

    return createJsonResponse({ error: 'NOT_FOUND' }, 404);
  };

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.fetch = fetch;
  dom.window.fetch = fetch;

  dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
    user: { id: 'user-1', name: 'Nova Lane' }
  }));

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?settings-sync=1`;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const root = dom.window.document.querySelector('[data-ct-sync-feedback-root="settings"]');
  assert.strictEqual(root.querySelector('[data-sync-status]')?.getAttribute('data-sync-status'), 'stale');

  root.querySelector('[data-ct-sync-retry-all]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.strictEqual(root.querySelector('[data-sync-status]'), null);
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
