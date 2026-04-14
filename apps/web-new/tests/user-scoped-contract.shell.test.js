const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

function setupDom(url = 'http://localhost/') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  return dom;
}

runTest('userScopedStorage 在 guest 场景也应统一写入 users.guest 包装', async () => {
  const dom = setupDom('http://localhost/guest-scope.html');
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'userScopedStorage.js')).href}?guest-wrap=1`;
  const { writeUserScopedValue } = await import(modulePath);

  writeUserScopedValue('ct_contract_guest', { mode: 'guest' });

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_contract_guest'));
  assert.deepStrictEqual(stored, {
    version: 1,
    users: {
      guest: {
        mode: 'guest'
      }
    }
  });
});

runTest('ownerId 应只来自 ct_auth_session 而不是 currentUser 回退', async () => {
  const dom = setupDom('http://localhost/owner-source.html');
  dom.window.localStorage.setItem('currentUser', JSON.stringify({
    id: 'legacy-user',
    name: 'Legacy User'
  }));

  const scopedModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'userScopedStorage.js')).href}?owner-source=1`;
  const backendModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'liteBackendClient.js')).href}?owner-source=1`;
  const { getCurrentScopedUserId } = await import(scopedModulePath);
  const { getLiteBackendUserId } = await import(backendModulePath);

  assert.strictEqual(getCurrentScopedUserId(), 'guest');
  assert.strictEqual(getLiteBackendUserId(), null);
});

runTest('Settings 应优先读取当前用户的 scoped snapshot 而不是设备级镜像 key', async () => {
  const dom = setupDom('http://localhost/settings-scope.html');
  dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
    user: {
      id: 'user-1',
      name: 'Scoped User'
    }
  }));
  dom.window.localStorage.setItem('app_theme', 'light');
  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  dom.window.localStorage.setItem('wardrobe_display_mode', 'list');
  dom.window.localStorage.setItem('temperature_unit', 'fahrenheit');
  dom.window.localStorage.setItem('ct_settings', JSON.stringify({
    version: 1,
    users: {
      'user-1': {
        language: 'en-US',
        'display-mode': 'dark',
        'wardrobe-layout': 'grid',
        'temperature-unit': 'celsius',
        'public-profile': true,
        'outfit-reminders': true
      }
    }
  }));

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsStore.js')).href}?settings-scope=1`;
  const { getSettingsState } = await import(modulePath);
  const state = getSettingsState();

  assert.strictEqual(state.language, 'en-US');
  assert.strictEqual(state['display-mode'], 'dark');
  assert.strictEqual(state['wardrobe-layout'], 'grid');
  assert.strictEqual(state['temperature-unit'], 'celsius');
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
