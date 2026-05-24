const assert = require('assert');
const fs = require('fs');
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
    hero: { image_url: 'http://example.com/hero.jpg', alt: 'Hero alt', caption: '主图中文图注' },
    paragraphs: [
      {
        layout: 'text_dense',
        text: 'Body',
        image_urls: ['http://example.com/a.jpg'],
        image_alts: ['English alt'],
        image_captions: ['中文图注']
      },
      {
        layout: 'split_image_text',
        text: 'Split',
        image_urls: ['http://example.com/b.jpg'],
        image_alts: ['English alt 2'],
        image_captions: ['第二张中文图注']
      },
      {
        layout: 'split_image_text',
        text: 'This longer split paragraph has enough editorial copy to stay in the regular two-column reading rhythm. It should not be treated as a compact caption-style aside because the text can visually balance the paired image without leaving an oversized empty rail beside it.',
        image_urls: ['http://example.com/long.jpg'],
        image_alts: ['Long split alt'],
        image_captions: ['长文图注']
      },
      {
        layout: 'split_image_text',
        text: 'Split 2',
        image_urls: ['   '],
        image_alts: ['English alt 3'],
        image_captions: ['第三张中文图注']
      },
      {
        layout: 'tip_box_rules',
        text: 'Tip',
        image_urls: ['http://example.com/tip.jpg'],
        image_alts: ['Tip alt'],
        image_captions: ['提示图注']
      },
      {
        layout: 'list_bullets',
        text: '- One\n- Two',
        image_urls: ['http://example.com/list.jpg'],
        image_alts: ['List alt'],
        image_captions: ['清单图注']
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
  assert.ok(/onerror=/.test(html), 'img should include a broken image fallback');
  const captions = Array.from(view.window.document.querySelectorAll('.ct-ai-media__caption')).map((node) => node.textContent.trim());
  assert.ok(captions.includes('主图中文图注'));
  assert.ok(captions.includes('中文图注'));
  assert.ok(captions.includes('第二张中文图注'));
  assert.ok(captions.includes('长文图注'));
  assert.ok(captions.includes('提示图注'));
  assert.ok(captions.includes('清单图注'));
  assert.strictEqual(view.window.document.querySelectorAll('.ct-ai-media--hero').length, 1);
  assert.ok(view.window.document.querySelectorAll('.ct-ai-media--content').length >= 3);
  assert.ok(view.window.document.querySelectorAll('.ct-ai-media--split').length >= 1);
  assert.strictEqual(view.window.document.querySelectorAll('.ct-ai-block--split-compact').length, 1, 'Only short split copy with a real image should use compact magazine pairing');
});

runTest('Post Detail 移动阅读样式应降低标题压迫并避免粘性顶栏遮挡', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'post-detail.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'post-detail.css'), 'utf8');

  assert.match(html, /<body class="ct-body ct-post-detail-page">/, 'Post detail body should expose a page class for reading-specific shell rules');
  assert.match(css, /\.ct-post-detail-page \.ct-topbar-shell\s*\{[\s\S]*?position:\s*static;/, 'Post detail topbar should not stay sticky over long-form reading screenshots');
  assert.match(css, /\.ct-post-detail-page \.ct-shell\s*\{[\s\S]*?width:\s*min\(calc\(100% - 32px\),\s*1040px\);/, 'Post detail shell should widen for editorial reading layout');
  assert.match(css, /\.ct-post-detail,[\s\S]*?\.ct-post-comments\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/, 'Post detail and comments should read as open editorial sections rather than nested cards');
  assert.match(css, /\.ct-post-detail__title,[\s\S]*?\.ct-post-comments__heading\s*\{[\s\S]*?font-family:\s*"Cormorant Garamond",\s*"Noto Serif SC"/, 'Post titles and section headings should use the magazine serif stack');
  assert.match(css, /\.ct-post-detail__title,[\s\S]*?\.ct-post-comments__heading\s*\{[\s\S]*?font-size:\s*clamp\(30px,\s*3\.2vw,\s*46px\);[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;/, 'Long Chinese titles should use the full reading width instead of a narrow headline measure');
  assert.match(css, /\.ct-ai-media__frame\s*\{[\s\S]*?border-radius:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;/, 'AI media frames should be flat, not card-like');
  assert.match(css, /\.ct-ai-block--split-compact \.ct-ai-split\s*\{[\s\S]*?grid-template-columns:[\s\S]*?align-items:\s*center;/, 'Short split blocks should use a balanced compact pairing grid');
  assert.match(css, /\.ct-ai-block--split-compact \.ct-ai-media--split \.ct-ai-media__image,[\s\S]*?\.ct-ai-block--split-compact \.ct-ai-media--split \.ct-ai-media__fallback\s*\{[\s\S]*?aspect-ratio:\s*1 \/ 1;/, 'Compact split images should avoid overpowering short text');
  assert.match(css, /\.ct-ai-block--split-compact \.ct-ai-split__text\s*\{[\s\S]*?max-width:\s*34ch;[\s\S]*?border-left:\s*1px solid/, 'Compact split text should read as a tight magazine side note');
  assert.match(css, /\.ct-ai-quote\s*\{[\s\S]*?border-left:\s*2px solid[\s\S]*?background:\s*transparent;[\s\S]*?font-family:\s*"Cormorant Garamond",\s*"Noto Serif SC"/, 'Quotes should use an editorial left-rule treatment');
  assert.match(css, /\.ct-ai-tip\s*\{[\s\S]*?border-left:\s*2px solid[\s\S]*?background:\s*transparent;/, 'Tip blocks should use an editorial left-rule treatment');
  assert.match(css, /@media \(max-width:\s*720px\)\s*\{[\s\S]*?\.ct-post-detail__title\s*\{[\s\S]*?font-size:\s*clamp\(28px,\s*7vw,\s*34px\);[\s\S]*?line-height:\s*1\.16;/, 'Mobile post title should use a restrained editorial scale');
  assert.match(css, /@media \(max-width:\s*720px\)\s*\{[\s\S]*?\.ct-post-comments__heading\s*\{[\s\S]*?font-size:\s*clamp\(30px,\s*9vw,\s*38px\);[\s\S]*?line-height:\s*1\.05;/, 'Mobile comments heading should remain magazine-like without overflow');
  assert.match(css, /@media \(max-width:\s*720px\)\s*\{[\s\S]*?\.ct-ai-post__hero,[\s\S]*?\.ct-ai-hero\s*\{[\s\S]*?aspect-ratio:\s*4 \/ 5;[\s\S]*?object-position:\s*center 24%;/, 'Mobile AI hero should use a stable portrait crop and focal point');
  assert.match(css, /\.ct-ai-media--content \.ct-ai-media__image,[\s\S]*?\.ct-ai-media--split \.ct-ai-media__image\s*\{[\s\S]*?object-fit:\s*cover;[\s\S]*?object-position:\s*center 20%;/, 'Content and split images should use an editorial crop without letterboxing');
  assert.match(css, /\.ct-post-comments__input\s*\{[\s\S]*?border:\s*0;[\s\S]*?border-bottom:\s*1px solid[\s\S]*?background:\s*transparent;/, 'Comment input should flatten into an editorial writing line');
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
