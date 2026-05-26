const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
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

async function main() {
  await runTest('ClosetTwin client 应通过 backend facade 获取状态', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost:8140/index.html'
    });
    const requests = [];

    dom.window.fetch = async (url, options = {}) => {
      requests.push({ url, method: options.method || 'GET' });
      return createJsonResponse({
        status: {
          model1: 'ready',
          model2: 'unavailable'
        }
      });
    };

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'closetTwinClient.js')).href}?status=1`;
    const { getClosetTwinStatus } = await import(modulePath);

    const response = await getClosetTwinStatus();

    assert.strictEqual(response.ok, true);
    assert.deepStrictEqual(response.data.status, {
      model1: 'ready',
      model2: 'unavailable'
    });
    assert.deepStrictEqual(requests[0], {
      url: '/api/closettwin/status',
      method: 'GET'
    });
  });

  await runTest('ClosetTwin client 应把 model1 调用收口到统一 call endpoint', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost:8140/wardrobe-item.html'
    });
    const requests = [];

    dom.window.fetch = async (url, options = {}) => {
      requests.push({
        url,
        method: options.method || 'GET',
        body: JSON.parse(options.body)
      });
      return createJsonResponse({
        ok: true,
        status: 'ready',
        data: {
          item: {
            title: 'Recognized Coat',
            category: 'Outerwear'
          }
        },
        error: null
      });
    };

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'closetTwinClient.js')).href}?model1=1`;
    const { callClosetTwinModel1 } = await import(modulePath);

    const response = await callClosetTwinModel1('daily_context', {
      imageData: 'data:image/png;base64,cHJldmlldw==',
      fileName: 'coat.png'
    });

    assert.strictEqual(response.ok, true);
    assert.strictEqual(response.data.data.item.title, 'Recognized Coat');
    assert.strictEqual(requests[0].url, '/api/closettwin/model1/call');
    assert.strictEqual(requests[0].method, 'POST');
    assert.strictEqual(requests[0].body.function, 'daily_context');
    assert.strictEqual(requests[0].body.payload.fileName, 'coat.png');
  });

  await runTest('ClosetTwin client 应通过 daily recommendation pipeline 串联双模型', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost:8140/index.html'
    });
    const requests = [];

    dom.window.fetch = async (url, options = {}) => {
      requests.push({
        url,
        method: options.method || 'GET',
        body: JSON.parse(options.body)
      });
      return createJsonResponse({
        ok: true,
        status: 'ready',
        data: {
          pipeline: {
            model1: { source: 'wardrobe-ai-json' }
          },
          recommendations: [{ id: 'model2-look' }]
        },
        error: null
      });
    };

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'closetTwinClient.js')).href}?daily=1`;
    const { recommendClosetTwinDaily } = await import(modulePath);

    const response = await recommendClosetTwinDaily({
      scenario: { intent: 'travel' },
      model1: { source: 'wardrobe-ai-json' }
    });

    assert.strictEqual(response.ok, true);
    assert.strictEqual(response.data.data.pipeline.model1.source, 'wardrobe-ai-json');
    assert.strictEqual(requests[0].url, '/api/closettwin/recommendations/daily');
    assert.strictEqual(requests[0].method, 'POST');
    assert.strictEqual(requests[0].body.model1.source, 'wardrobe-ai-json');
  });
}

main();
