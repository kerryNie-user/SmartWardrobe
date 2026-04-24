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

runTest('settings repositories 应归一 remote 结果并读写 local snapshot 与兼容 key', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8140/' });
  dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
    user: { id: 'user-1', name: 'Nova' }
  }));

  const fetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    if (url === '/api/settings' && method === 'GET') {
      return createJsonResponse({ settings: { language: 'zh-CN', 'display-mode': 'light' } });
    }
    if (url === '/api/settings' && method === 'POST') {
      return createJsonResponse({ settings: body });
    }
    return createJsonResponse({ error: 'NOT_FOUND' }, 404);
  };

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.fetch = fetch;
  dom.window.fetch = fetch;

  const localModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsLocalRepository.js')).href}?local=1`;
  const remoteModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsRemoteRepository.js')).href}?remote=1`;
  const { createSettingsLocalRepository } = await import(localModulePath);
  const { createSettingsRemoteRepository } = await import(remoteModulePath);

  const localRepository = createSettingsLocalRepository();
  const remoteRepository = createSettingsRemoteRepository();

  localRepository.write({
    language: 'zh-CN',
    'display-mode': 'light',
    'wardrobe-layout': 'list',
    'temperature-unit': 'fahrenheit',
    'public-profile': false,
    'outfit-reminders': true
  });

  const localState = localRepository.read();
  assert.strictEqual(localState.language, 'zh-CN');
  assert.strictEqual(dom.window.localStorage.getItem('app_locale'), 'zh-CN');
  assert.strictEqual(dom.window.localStorage.getItem('app_theme'), 'light');

  const fetched = await remoteRepository.fetch();
  const saved = await remoteRepository.save({
    language: 'en-US',
    'display-mode': 'dark'
  });

  assert.strictEqual(fetched.ok, true);
  assert.strictEqual(fetched.data.settings.language, 'zh-CN');
  assert.strictEqual(saved.ok, true);
  assert.strictEqual(saved.data.settings['display-mode'], 'dark');
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
