const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('Discovery HTML 应提供 zh-CN 静态语义', () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  assert.strictEqual(doc.documentElement.getAttribute('lang'), 'zh-CN');
  assert.strictEqual(doc.title, 'CLOSETTWIN — 发现');
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
