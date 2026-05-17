const assert = require('assert');
const { JSDOM } = require('jsdom');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('Discovery Feed 不应渲染空白图片 url', async () => {
  const dom = new JSDOM('<body></body>', { url: 'http://localhost/discovery.html' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  dom.window.localStorage.setItem('app_locale', 'zh-CN');

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'components', 'discoveryFeed.js')).href;
  const { renderDiscoveryFeed } = await import(modulePath);

  const html = renderDiscoveryFeed([{
    id: 'p1',
    author: 'Author',
    time: 'Now',
    title: 'Title',
    description: 'Desc',
    images: ['   ', '', 'http://example.com/ok.jpg'],
    social: { isLiked: false }
  }], { status: 'synced' });

  const view = new JSDOM(html);
  const images = Array.from(view.window.document.querySelectorAll('img'));
  assert.strictEqual(images.length, 1);
  assert.strictEqual(images[0].getAttribute('src'), 'http://example.com/ok.jpg');
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
