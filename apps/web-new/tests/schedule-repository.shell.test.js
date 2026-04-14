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

runTest('schedule repositories 应归一 remote 结果并读写 local snapshot', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
    user: { id: 'user-1', name: 'Nova' }
  }));

  const fetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    if (url === '/api/schedules' && method === 'GET') {
      return createJsonResponse({ items: [{ id: 'remote-1', title: 'Remote Review', tab: 'upcoming', day: '09', label: 'Apr / Wed', time: '10:00', location: 'Studio', tags: [], reminderEnabled: true, version: 1, updatedAt: 1 }] });
    }
    if (url === '/api/schedules' && method === 'POST') {
      return createJsonResponse({ item: body }, 201);
    }
    if (url === '/api/schedules/remote-1' && method === 'PUT') {
      return createJsonResponse({ item: { ...body } });
    }
    if (url === '/api/schedules/remote-1' && method === 'DELETE') {
      return createJsonResponse({ deleted: true });
    }
    return createJsonResponse({ error: 'NOT_FOUND' }, 404);
  };

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.fetch = fetch;
  dom.window.fetch = fetch;

  const localModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleLocalRepository.js')).href}?local=1`;
  const remoteModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleRemoteRepository.js')).href}?remote=1`;
  const { createScheduleLocalRepository } = await import(localModulePath);
  const { createScheduleRemoteRepository } = await import(remoteModulePath);

  const localRepository = createScheduleLocalRepository({ locale: 'en-US' });
  const remoteRepository = createScheduleRemoteRepository();

  const written = localRepository.write({
    upcoming: { groups: [{ day: '09', label: 'Apr / Wed', events: [{ id: 'local-1', title: 'Local Review' }] }] },
    travel: { groups: [] },
    archive: { groups: [] }
  });

  assert.strictEqual(written.users['user-1'].upcoming.groups[0].events[0].id, 'local-1');
  assert.strictEqual(localRepository.read().upcoming.groups[0].events[0].title, 'Local Review');

  const fetched = await remoteRepository.fetch();
  const created = await remoteRepository.create({ id: 'remote-2', title: 'Created Review' });
  const updated = await remoteRepository.update('remote-1', { id: 'remote-1', title: 'Updated Review' });
  const removed = await remoteRepository.remove('remote-1');

  assert.strictEqual(fetched.ok, true);
  assert.strictEqual(fetched.data.items[0].id, 'remote-1');
  assert.strictEqual(created.ok, true);
  assert.strictEqual(created.data.item.id, 'remote-2');
  assert.strictEqual(updated.data.item.title, 'Updated Review');
  assert.strictEqual(removed.data.deleted, true);
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
