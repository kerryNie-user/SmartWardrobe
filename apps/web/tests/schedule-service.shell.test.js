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

runTest('scheduleService 应处理 hydrate、conflict 与 retry 语义', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleService.js')).href}?service=1`;
  const { createScheduleService } = await import(modulePath);

  const localRepository = createMemoryLocalRepository({
    tabs: [
      { key: 'upcoming', label: 'Upcoming', active: true },
      { key: 'travel', label: 'Travel', active: false },
      { key: 'archive', label: 'Archive', active: false }
    ],
    form: { labels: {}, placeholders: {}, actions: {}, fallback: {} },
    views: {
      upcoming: { groups: [{ day: '09', label: 'Apr / Wed', events: [{ id: 'event-1', title: 'Local Event', time: '09:00', location: 'Local', tags: [], reminderEnabled: true, version: 1, updatedAt: 1 }] }] },
      travel: { groups: [] },
      archive: { groups: [] }
    }
  });

  let failUpdateOnce = true;
  const remoteRepository = {
    async fetch() {
      return {
        ok: true,
        data: {
          items: [{ id: 'remote-1', tab: 'upcoming', day: '10', label: 'Apr / Thu', time: '10:00', title: 'Remote Event', location: 'Studio', tags: [], reminderEnabled: true, version: 2, updatedAt: 2 }]
        }
      };
    },
    async create(payload) {
      return {
        ok: true,
        data: { item: payload }
      };
    },
    async update(id, payload) {
      if (failUpdateOnce) {
        failUpdateOnce = false;
        return {
          ok: false,
          status: 409,
          kind: 'conflict',
          error: 'SCHEDULE_CONFLICT',
          data: { item: { id, tab: 'upcoming', day: '10', label: 'Apr / Thu', time: '10:00', title: 'Remote Event', location: 'Studio', tags: [], reminderEnabled: true, version: 3, updatedAt: 3 } }
        };
      }
      return {
        ok: true,
        data: { item: payload }
      };
    },
    async remove() {
      return {
        ok: true,
        data: { deleted: true }
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
    markConflict() { syncState = 'conflict'; },
    getState() { return { status: syncState }; }
  };

  const service = createScheduleService({
    locale: 'en-US',
    localRepository,
    remoteRepository,
    syncController
  });

  const hydrated = await service.hydrate();
  assert.strictEqual(hydrated.views.upcoming.groups[0].events[0].id, 'remote-1');
  assert.strictEqual(hydrated.upcoming, undefined);
  assert.strictEqual(syncController.getState().status, 'synced');

  const conflictResult = await service.update('remote-1', {
    id: 'remote-1',
    tab: 'upcoming',
    day: '10',
    label: 'Apr / Thu',
    time: '11:00',
    title: 'Edited Event',
    location: 'Updated Studio',
    tags: [],
    reminderEnabled: true,
    version: 2,
    updatedAt: 4
  });
  assert.strictEqual(conflictResult, null);
  assert.strictEqual(syncController.getState().status, 'conflict');

  const retryResult = await service.retry();
  assert.ok(retryResult);
  assert.strictEqual(syncController.getState().status, 'synced');
});

runTest('scheduleService 应兼容 legacy 存储结构并迁移为 views', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleService.js')).href}?service=legacy=1`;
  const { createScheduleService } = await import(modulePath);

  const localRepository = createMemoryLocalRepository({
    upcoming: { groups: [{ day: '09', label: 'Apr / Wed', events: [{ id: 'event-1', title: 'Legacy Event', time: '09:00', location: 'Local', tags: [], reminderEnabled: true, version: 1, updatedAt: 1 }] }] },
    travel: { groups: [] },
    archive: { groups: [] }
  });

  const remoteRepository = {
    async fetch() { return { ok: false }; },
    async create() { return { ok: false }; },
    async update() { return { ok: false }; },
    async remove() { return { ok: false }; }
  };

  const syncController = {
    markLoading() {},
    markSyncing() {},
    markSynced() {},
    markFailed() {},
    markStale() {},
    markConflict() {},
    getState() { return { status: 'idle' }; }
  };

  const service = createScheduleService({
    locale: 'en-US',
    localRepository,
    remoteRepository,
    syncController
  });

  const state = service.getState();
  assert.ok(state);
  assert.ok(state.views.upcoming);
  assert.strictEqual(state.views.upcoming.groups[0].events[0].id, 'event-1');
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
