const fs = require('fs');
const path = require('path');
const assert = require('assert');
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
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href;
    let { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();

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

    const errorPanel = fallbackDom.window.document.querySelector('.ct-state-panel[data-state-kind="error"]');
    assert.ok(errorPanel, 'Missing post detail error panel');
    assert.ok(/post/i.test(errorPanel.textContent), 'Post detail error should explain missing post');
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
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?social=1`;
    const { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();

    const followButton = dom.window.document.querySelector('[data-ct-post-follow]');
    const likeButton = dom.window.document.querySelector('[data-ct-post-like]');
    const bookmarkButton = dom.window.document.querySelector('[data-ct-post-bookmark]');

    assert.ok(followButton, 'Missing follow button');
    assert.ok(likeButton, 'Missing like button');
    assert.strictEqual(followButton.getAttribute('aria-pressed'), 'true', 'Followed state should sync from social store');
    assert.strictEqual(likeButton.getAttribute('aria-pressed'), 'true', 'Liked state should sync from social store');
    assert.strictEqual(bookmarkButton.getAttribute('aria-pressed'), 'true', 'Saved state should sync from favorites store');
  });

  await runTest('New Post Detail 页面遇到不存在的 id 时应渲染错误态', async () => {
    const htmlPath = path.join(__dirname, '..', 'post-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/post-detail.html?id=missing-post' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?missing=1`;
    const { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();

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
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?comment=1`;
    let { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();

    const beforeText = dom.window.document.querySelector('.ct-post-detail__actions').textContent;
    const commentInput = dom.window.document.querySelector('[name="commentBody"]');
    assert.ok(commentInput, 'Missing comment input');
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
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?share=1`;
    const { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();

    const shareButton = dom.window.document.querySelector('[data-ct-post-share]');
    assert.ok(shareButton, 'Missing post detail share button');
    shareButton.click();

    const feedback = dom.window.document.querySelector('[data-ct-post-share-feedback]');
    assert.ok(feedback, 'Missing post detail share feedback');
    assert.ok(/link|链接/i.test(feedback.textContent), 'Post detail share feedback should mention copied link');
    assert.ok(/post-detail\.html\?id=brutalist-basics/.test(dom.window.__copiedText), 'Post detail should copy canonical post url');
  });
}

main();
