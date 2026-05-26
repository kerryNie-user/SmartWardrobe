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

class FakeFileReader {
  readAsDataURL() {
    this.result = 'data:image/png;base64,cHJldmlldw==';
    if (typeof this.onload === 'function') {
      this.onload({ target: { result: this.result } });
    }
  }
}

function createDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:8140/wardrobe-item.html'
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.FileReader = FakeFileReader;
  dom.window.FileReader = FakeFileReader;
  return dom;
}

async function main() {
  await runTest('wardrobe scanner 默认应调用 ClosetTwin model1 daily_context', async () => {
    createDom();
    const calls = [];
    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeItemScanner.js')).href}?closettwin=1`;
    const { scanWardrobePhoto } = await import(modulePath);

    const result = await scanWardrobePhoto(
      { name: 'coat.png', type: 'image/png', size: 18 },
      {
        callModel1: async (functionName, payload) => {
          calls.push({ functionName, payload });
          return {
            ok: true,
            data: {
              ok: true,
              status: 'ready',
              data: {
                item: {
                  title: 'Recognized Coat',
                  category: 'Outerwear',
                  tags: ['outerwear']
                }
              },
              error: null
            }
          };
        }
      }
    );

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.status, 'ready');
    assert.strictEqual(result.source, 'closettwin-model1');
    assert.strictEqual(result.item.title, 'Recognized Coat');
    assert.strictEqual(calls[0].functionName, 'daily_context');
    assert.strictEqual(calls[0].payload.fileName, 'coat.png');
    assert.ok(calls[0].payload.imageData.startsWith('data:image/png;base64,'));
  });

  await runTest('wardrobe scanner 配置旧 endpoint 时仍走兼容上传路径', async () => {
    createDom();
    const requests = [];
    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeItemScanner.js')).href}?endpoint=1`;
    const { scanWardrobePhoto } = await import(modulePath);

    const file = new window.File(['preview'], 'shirt.png', { type: 'image/png' });
    const result = await scanWardrobePhoto(
      file,
      {
        endpoint: '/legacy-scan',
        fetchImpl: async (url, options = {}) => {
          requests.push({ url, method: options.method });
          return {
            ok: true,
            status: 200,
            async json() {
              return {
                item: {
                  title: 'Legacy Shirt',
                  category: 'Tops'
                }
              };
            }
          };
        }
      }
    );

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.source, 'wardrobe-item-scanner');
    assert.strictEqual(result.item.title, 'Legacy Shirt');
    assert.deepStrictEqual(requests[0], {
      url: '/legacy-scan',
      method: 'POST'
    });
  });
}

main();
