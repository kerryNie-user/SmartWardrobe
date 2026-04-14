const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('upload adapter 应读取图片文件并返回预览 data url', async () => {
  class FakeFileReader {
    constructor() {
      this.onload = null;
    }

    readAsDataURL(file) {
      if (this.onload) {
        this.onload({
          target: {
            result: `data:${file.type};base64,preview-data`
          }
        });
      }
    }
  }

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'uploadAdapter.js')).href}?adapter=1`;
  const { createUploadAdapter } = await import(modulePath);

  const adapter = createUploadAdapter({
    FileReaderClass: FakeFileReader
  });

  const result = await adapter.readImagePreview({
    type: 'image/png',
    name: 'preview.png'
  });

  assert.strictEqual(result.ok, true);
  assert.ok(result.src.startsWith('data:image/png;base64,preview-data'));
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
