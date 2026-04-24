const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

function createMemoryLocalRepository(initialState) {
  let snapshot = initialState;
  return {
    read() {
      return snapshot;
    },
    write(nextValue) {
      snapshot = nextValue;
      return snapshot;
    },
    clear() {
      snapshot = null;
    }
  };
}

runTest('settingsService 应处理 hydrate、save 与 retry 语义', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsService.js')).href}?service=1`;
  const { createSettingsService, DEFAULT_SETTINGS_STATE } = await import(modulePath);

  const localRepository = createMemoryLocalRepository({
    ...DEFAULT_SETTINGS_STATE,
    language: 'en-US',
    'display-mode': 'dark'
  });

  let failSaveOnce = true;
  const remoteRepository = {
    async fetch() {
      return {
        ok: true,
        data: {
          settings: {
            language: 'zh-CN',
            'display-mode': 'light',
            'wardrobe-layout': 'list',
            'temperature-unit': 'fahrenheit',
            'public-profile': false,
            'outfit-reminders': true
          }
        }
      };
    },
    async save(payload) {
      if (failSaveOnce) {
        failSaveOnce = false;
        return {
          ok: false,
          status: 500,
          kind: 'http',
          error: 'SETTINGS_SAVE_FAILED'
        };
      }
      return {
        ok: true,
        data: {
          settings: payload
        }
      };
    }
  };

  let syncState = 'idle';
  const syncController = {
    markLoading() { syncState = 'loading'; },
    markSyncing() { syncState = 'syncing'; },
    markSynced() { syncState = 'synced'; },
    markFailed() { syncState = 'failed'; },
    markStale() { syncState = 'stale'; },
    getState() { return { status: syncState }; }
  };

  const service = createSettingsService({
    localRepository,
    remoteRepository,
    syncController
  });

  const hydrated = await service.hydrate();
  assert.strictEqual(hydrated.language, 'zh-CN');
  assert.strictEqual(syncController.getState().status, 'synced');

  const failedSave = await service.save({
    ...hydrated,
    language: 'en-US'
  });
  assert.strictEqual(failedSave.language, 'en-US');
  assert.strictEqual(syncController.getState().status, 'failed');

  const retryResult = await service.retry();
  assert.strictEqual(retryResult.language, 'en-US');
  assert.strictEqual(syncController.getState().status, 'synced');
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
