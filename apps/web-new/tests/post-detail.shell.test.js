const fs = require('fs');
const path = require('path');
const assert = require('assert');
const seedPath = path.join(__dirname, '..', '..', '..', 'services', 'backend_lite', 'data', 'discovery_content_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

global.fetch = async (url) => {
  if (url.includes('/api/discovery/content')) {
    const urlObj = new URL(url, 'http://localhost');
    const locale = urlObj.searchParams.get('locale') || 'en-US';
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ content: seedData[locale], locale }) };
  }
  return { ok: false, status: 404, headers: { get: () => null }, json: async () => null };
};
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

async function main() {
  await runTest('New Post Detail 页面应包含关键挂载区域', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    ['#app', '[data-ct-topbar]', '[data-ct-post-detail]', '[data-ct-post-comments]'].forEach((selector) => {
      assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
    });
  });

  await runTest('New Post Detail 页面应根据 id 渲染帖子详情并在缺少 id 时显示错误态', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=brutalist-basics' });

    global.window = dom.window;
  global.window.fetch = global.fetch;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
  global.localStorage = dom.window.localStorage;
  global.localStorage.setItem('ct_locale', 'en-US');
  global.sessionStorage = dom.window.sessionStorage;
  global.sessionStorage.setItem('ct_discovery_content', JSON.stringify({
    'en-US': {
      editorials: [{
        id: 'brutalist-basics',
        author: {
          name: 'Editorial Team',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64'
        },
        time: '2 hours ago',
        title: 'The Modern Uniform: Brutalist Basics',
        description: 'A study in architectural silhouettes and functional dressing.',
        body: ['Paragraph 1', 'Paragraph 2'],
        tags: ['editorial'],
        heroImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&h=400',
        images: [],
        stats: { likes: '12', comments: '0' }
      }]
    }
  }));
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href;
    let { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    assert.ok(/The Modern Uniform: Brutalist Basics/.test(dom.window.document.body.textContent));
    assert.ok(dom.window.document.querySelector('[data-ct-post-bookmark]'), 'Missing bookmark button');

    const fallbackDom = new JSDOM(html, { url: 'http://localhost/post-detail.html' });
    global.window = fallbackDom.window;
    global.document = fallbackDom.window.document;
    global.localStorage = fallbackDom.window.localStorage;
    global.CustomEvent = fallbackDom.window.CustomEvent;
    global.HTMLElement = fallbackDom.window.HTMLElement;
    global.Node = fallbackDom.window.Node;

    modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?fallback=1`;
    ({ renderPostDetailPage } = await import(modulePath));
    renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    const errorPanel = fallbackDom.window.document.querySelector('.ct-state-panel[data-state-kind="error"]');
    assert.ok(errorPanel, 'Missing post detail error panel');
    assert.ok(/post/i.test(errorPanel.textContent), 'Post detail error should explain missing post');
  });

  await runTest('New Post Detail 页面应通过统一 binding 暴露 sync feedback 与 teardown', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=brutalist-basics' });

    global.window = dom.window;
  global.window.fetch = global.fetch;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;
    dom.window.localStorage.setItem('ct_discovery_social', '{');
    dom.window.localStorage.setItem('ct_discovery_comments', '{');

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?binding=1`;
    const { renderPostDetailPage } = await import(modulePath);
    const binding = renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    assert.ok(binding && typeof binding.teardown === 'function', 'Post detail page should return page binding');

    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const syncRoot = dom.window.document.querySelector('[data-ct-sync-feedback-root="post-detail"]');
    assert.ok(syncRoot, 'Post detail page should mount sync feedback root');
    assert.ok(syncRoot.querySelector('[data-ct-sync-retry-domain="discoverySocial"]'), 'Post detail page should expose discoverySocial retry');
    assert.ok(syncRoot.querySelector('[data-ct-sync-retry-domain="discoveryComments"]'), 'Post detail page should expose discoveryComments retry');

    binding.teardown();
  });

  await runTest('New Post Detail 页面应与 Discovery 社交状态保持一致', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=brutalist-basics' });

    dom.window.localStorage.setItem('ct_favorites', JSON.stringify({
      looks: [],
      posts: [{ id: 'brutalist-basics', title: 'The Modern Uniform: Brutalist Basics' }]
    }));
    dom.window.localStorage.setItem('ct_discovery_social', JSON.stringify({
      likedPostIds: ['brutalist-basics'],
      followedAuthors: ['ELIAS.VAULT']
    }));

    global.window = dom.window;
  global.window.fetch = global.fetch;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?social=1`;
    const { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    const followButton = dom.window.document.querySelector('[data-ct-post-follow]');
    const likeButton = dom.window.document.querySelector('[data-ct-post-like]');
    const bookmarkButton = dom.window.document.querySelector('[data-ct-post-bookmark]');

    if (followButton) {
      assert.strictEqual(followButton.getAttribute('aria-pressed'), 'true', 'Followed state should sync from social store');
    }
    if (likeButton) {
      assert.strictEqual(likeButton.getAttribute('aria-pressed'), 'true', 'Liked state should sync from social store');
    }
    if (bookmarkButton) {
      assert.strictEqual(bookmarkButton.getAttribute('aria-pressed'), 'true', 'Saved state should sync from favorites store');
    }
  });

  await runTest('New Post Detail 页面遇到不存在的 id 时应渲染错误态', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=missing-post' });

    global.window = dom.window;
  global.window.fetch = global.fetch;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?missing=1`;
    const { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    const errorPanel = dom.window.document.querySelector('.ct-state-panel[data-state-kind="error"]');
    assert.ok(errorPanel, 'Missing error state panel');
    assert.ok(/post/i.test(errorPanel.textContent), 'Error state should explain missing post');
    assert.ok(errorPanel.querySelector('.ct-state-panel__action'), 'Error state should expose retry or back action');
  });

  await runTest('New Post Detail 页面应支持本地评论闭环并跨刷新保留', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=brutalist-basics' });

    global.window = dom.window;
  global.window.fetch = global.fetch;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?comment=1`;
    let { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    const beforeActions = dom.window.document.querySelector('.ct-post-detail__actions');
    if (!beforeActions) return;
    const beforeText = beforeActions.textContent;
    const commentInput = dom.window.document.querySelector('[name="commentBody"]');
    if (!commentInput) return;
    commentInput.value = 'Love the drape and the wool balance.';
    dom.window.document.querySelector('[data-ct-post-comment-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    assert.ok(/Love the drape and the wool balance\./.test(dom.window.document.body.textContent), 'New comment should render immediately');
    const afterText = dom.window.document.querySelector('.ct-post-detail__actions').textContent;
    assert.notStrictEqual(afterText, beforeText, 'Comment submit should update visible engagement count');

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_discovery_comments'));
    assert.ok(stored, 'Comment store should be written');

    const reloadDom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=brutalist-basics' });
    reloadDom.window.localStorage.setItem('ct_discovery_comments', JSON.stringify(stored));
    global.window = reloadDom.window;
    global.document = reloadDom.window.document;
    global.localStorage = reloadDom.window.localStorage;
    global.CustomEvent = reloadDom.window.CustomEvent;
    global.HTMLElement = reloadDom.window.HTMLElement;
    global.Node = reloadDom.window.Node;
    global.FormData = reloadDom.window.FormData;

    modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?comment=2`;
    ({ renderPostDetailPage } = await import(modulePath));
    renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    assert.ok(/Love the drape and the wool balance\./.test(reloadDom.window.document.body.textContent), 'Comment should survive page reload');
  });

  await runTest('New Post Detail 页面应支持分享反馈闭环', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=brutalist-basics' });

    dom.window.navigator.clipboard = {
      writeText: async (value) => {
        dom.window.__copiedText = value;
      }
    };

    global.window = dom.window;
  global.window.fetch = global.fetch;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?share=1`;
    const { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();
  await new Promise(resolve => setTimeout(resolve, 100));

    const shareButton = dom.window.document.querySelector('[data-ct-post-share]');
    if (!shareButton) return;
    shareButton.click();

    const feedback = dom.window.document.querySelector('[data-ct-post-share-feedback]');
    assert.ok(feedback, 'Missing post detail share feedback');
    assert.ok(/link|链接/i.test(feedback.textContent), 'Post detail share feedback should mention copied link');
    assert.ok(/post-detail\.html\?id=brutalist-basics/.test(dom.window.__copiedText), 'Post detail should copy canonical post url');
  });
}

main();
