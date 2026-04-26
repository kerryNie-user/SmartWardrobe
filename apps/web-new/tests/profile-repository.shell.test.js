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

runTest('profile repositories 应归一 remote 结果并读写 local snapshot', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8140/' });
  dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
    user: { id: 'user-1', name: 'Nova', bio: 'Session bio', avatar: './session.jpg' }
  }));

  const fetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    if (url === '/api/profile' && method === 'GET') {
      return createJsonResponse({ profile: { name: 'Remote Nova', bio: 'Remote bio', avatar: './remote.jpg' } });
    }
    if (url === '/api/profile' && method === 'POST') {
      return createJsonResponse({ profile: body });
    }
    return createJsonResponse({ error: 'NOT_FOUND' }, 404);
  };

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.fetch = fetch;
  dom.window.fetch = fetch;

  const localModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'profileLocalRepository.js')).href}?local=1`;
  const remoteModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'profileRemoteRepository.js')).href}?remote=1`;
  const { createProfileLocalRepository, getFallbackProfile } = await import(localModulePath);
  const { createProfileRemoteRepository } = await import(remoteModulePath);

  const localRepository = createProfileLocalRepository({ locale: 'en-US' });
  const remoteRepository = createProfileRemoteRepository();

  const persisted = localRepository.write({
    name: 'Stored Nova',
    bio: 'Stored bio',
    avatar: './stored.jpg'
  });

  assert.strictEqual(persisted.name, 'Stored Nova');
  assert.strictEqual(localRepository.read().bio, 'Stored bio');
  assert.strictEqual(JSON.parse(dom.window.localStorage.getItem('ct_auth_session')).user.name, 'Stored Nova');
  assert.strictEqual(getFallbackProfile('zh-CN').avatar, '/uploads/profile/elara-vance.jpg');

  const fetched = await remoteRepository.fetch();
  const saved = await remoteRepository.save({
    name: 'Next Nova',
    bio: 'Next bio',
    avatar: './next.jpg'
  });

  assert.strictEqual(fetched.ok, true);
  assert.strictEqual(fetched.data.profile.name, 'Remote Nova');
  assert.strictEqual(saved.ok, true);
  assert.strictEqual(saved.data.profile.avatar, './next.jpg');
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
