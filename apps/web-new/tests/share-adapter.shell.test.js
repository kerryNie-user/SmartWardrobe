const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('share adapter 应生成 canonical link 并委托 clipboard', async () => {
  let copiedText = null;
  const clipboard = {
    async writeText(text) {
      copiedText = text;
    }
  };

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'shareAdapter.js')).href}?adapter=1`;
  const { createShareAdapter } = await import(modulePath);

  const adapter = createShareAdapter({
    clipboard,
    baseHref: 'http://localhost/discovery.html'
  });

  const href = adapter.buildCanonicalHref('post-detail.html', { id: 'brutalist-basics' });
  assert.strictEqual(href, 'http://localhost/post-detail.html?id=brutalist-basics');

  const result = await adapter.shareLink({
    href,
    title: 'Brutalist Basics',
    text: 'Editorial post'
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(copiedText, href);
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
