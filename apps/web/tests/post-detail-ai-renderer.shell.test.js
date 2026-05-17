const assert = require('assert');
const { JSDOM } = require('jsdom');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('AI Post 渲染不应输出空 src 图片，且 img 必须有 alt', async () => {
  const dom = new JSDOM('<body></body>', { url: 'http://localhost/post-detail.html?id=test' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  dom.window.localStorage.setItem('app_locale', 'zh-CN');

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'components', 'aiPostRenderer.js')).href;
  const { renderAiPost } = await import(modulePath);

  const html = renderAiPost({
    id: 'test',
    author: 'Author',
    time: 'Now',
    title: 'Post title',
    heroImage: '',
    images: [],
    tags: ['editorial'],
    stats: { likes: '0', comments: '0' }
  }, {
    schema: 'ct_ai_post_v1',
    title: 'AI title',
    hero: { image_url: '', alt: '' },
    paragraphs: [
      {
        layout: 'text_dense',
        text: 'Body',
        image_urls: [''],
        image_alts: ['']
      },
      {
        layout: 'split_image_text',
        text: 'Split',
        image_urls: ['   '],
        image_alts: ['']
      },
      {
        layout: 'split_image_text',
        text: 'Split 2',
        image_urls: ['http://example.com/a.jpg'],
        image_alts: ['']
      }
    ],
    tags: ['editorial', 'ai-generated']
  }, {
    isFollowed: false,
    isLiked: false,
    isSaved: false,
    likesDisplay: '0',
    commentsDisplay: '0'
  });

  const view = new JSDOM(html);
  const images = Array.from(view.window.document.querySelectorAll('img'));
  for (const img of images) {
    const src = String(img.getAttribute('src') || '');
    assert.ok(src.trim().length > 0, 'img src should not be empty');

    const alt = String(img.getAttribute('alt') || '');
    assert.ok(alt.trim().length > 0, 'img alt should not be empty');
  }
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
