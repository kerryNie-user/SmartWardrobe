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

runTest('backend client 应在 8080 页面上解析到同 host 的 8140 服务', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://10.20.80.192:8080/index.html'
  });

  const requests = [];
  const fetch = async (url) => {
    requests.push(url);
    return createJsonResponse({ status: 'ok' });
  };

  global.window = dom.window;
  global.document = dom.window.document;
  dom.window.fetch = fetch;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'backendClient.js')).href}?base-url=1`;
  const { requestBackend } = await import(modulePath);

  const response = await requestBackend('/api/health');
  assert.strictEqual(response.ok, true);
  assert.strictEqual(requests[0], 'http://10.20.80.192:8140/api/health');
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
