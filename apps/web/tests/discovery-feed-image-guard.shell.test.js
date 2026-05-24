const assert = require('assert');
const fs = require('fs');
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
    ai: {
      paragraphs: [
        {
          image_urls: ['http://example.com/ok.jpg'],
          image_captions: ['发现卡片中文图注'],
          image_alts: ['English alt']
        }
      ],
      hero: { image_url: 'http://example.com/ok.jpg', caption: '封面中文图注' }
    },
    social: { isLiked: false }
  }], { status: 'synced' });

  const view = new JSDOM(html);
  const images = Array.from(view.window.document.querySelectorAll('img'));
  assert.strictEqual(images.length, 1);
  assert.strictEqual(images[0].getAttribute('src'), 'http://example.com/ok.jpg');
  assert.ok(/onerror=/.test(html), 'Discovery image should include broken image fallback');
  const captions = Array.from(view.window.document.querySelectorAll('.ct-discovery-post__caption')).map((node) => node.textContent.trim());
  assert.ok(captions.includes('发现卡片中文图注'));
});

runTest('Discovery Feed 图片区域应保留主图可视空间', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'discovery.css'), 'utf8');
  assert.match(css, /\.ct-discovery-post__frame\s*\{[\s\S]*?display:\s*grid;/, 'Media frame should layer image and fallback predictably');
  assert.match(css, /\.ct-discovery-post__figure--feature \.ct-discovery-post__frame\s*\{[\s\S]*?min-height:\s*clamp\(180px,\s*42vw,\s*360px\);/, 'Feature frame should keep desktop image space visible');
  assert.match(css, /@media \(max-width:\s*720px\)\s*\{[\s\S]*?\.ct-discovery-post__media\.is-thumb-feature3\s*\{[\s\S]*?grid-template-columns:\s*1fr;/, 'Mobile media should prioritize the feature image column');
  assert.match(css, /@media \(max-width:\s*720px\)\s*\{[\s\S]*?\.ct-discovery-post__figure--feature \.ct-discovery-post__frame\s*\{[\s\S]*?aspect-ratio:\s*4 \/ 5;[\s\S]*?min-height:\s*clamp\(240px,\s*76vw,\s*420px\);/, 'Mobile feature image should have a stable portrait crop');
  assert.match(css, /\.ct-discovery-post__image\[hidden\]\s*\{[\s\S]*?display:\s*none;/, 'Broken images should be explicitly hidden after fallback takes over');
  assert.match(css, /\.ct-discovery-post__caption\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/, 'Caption should not consume the image area');
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
