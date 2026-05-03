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

runTest('profileService 应处理 hydrate、save 与 retry 语义', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'profileService.js')).href}?service=1`;
  const { createProfileService, getDefaultProfile } = await import(modulePath);

  const localRepository = createMemoryLocalRepository(getDefaultProfile('en-US'));
  let failSaveOnce = true;
  const remoteRepository = {
    async fetch() {
      return {
        ok: true,
        data: {
          profile: {
            name: 'Remote Nova',
            bio: 'Remote bio',
            avatar: './remote.jpg'
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
          error: 'PROFILE_SAVE_FAILED'
        };
      }
      return {
        ok: true,
        data: {
          profile: payload
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

  const service = createProfileService({
    localRepository,
    remoteRepository,
    syncController,
    locale: 'en-US'
  });

  const hydrated = await service.hydrate();
  assert.strictEqual(hydrated.name, 'Remote Nova');
  assert.strictEqual(syncController.getState().status, 'synced');

  const failedSave = await service.save({
    name: 'Edited Nova',
    bio: 'Edited bio',
    avatar: './edited.jpg'
  });
  assert.strictEqual(failedSave.name, 'Edited Nova');
  assert.strictEqual(syncController.getState().status, 'failed');

  const retryResult = await service.retry();
  assert.strictEqual(retryResult.avatar, './edited.jpg');
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
