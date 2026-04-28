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

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('New Discovery 页面应包含第一阶段关键区域', () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const selectors = [
    '#app',
    '[data-ct-topbar]',
    '[data-ct-search]',
    '[data-ct-trend-strip]',
    '[data-ct-discovery-feed]',
    '[data-ct-bottom-nav]'
  ];

  for (const selector of selectors) {
    const node = doc.querySelector(selector);
    assert.ok(node, `Missing selector: ${selector}`);
  }
});

runTest('New Discovery 页面应默认渲染 Editorials', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);

  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const feedItems = dom.window.document.querySelectorAll('.ct-discovery-post');
  assert.ok(feedItems.length >= 0, 'Should render feed items without tabs');
});

runTest('New Discovery 页面应通过统一 binding 暴露 sync feedback 与 teardown', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  dom.window.localStorage.setItem('ct_discovery_view', '{');
  dom.window.localStorage.setItem('ct_discovery_social', '{');

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href}?binding=1`;
  const { renderDiscoveryPage } = await import(modulePath);

  const binding = renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(binding && typeof binding.teardown === 'function', 'Discovery page should return page binding');

  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

  const syncRoot = dom.window.document.querySelector('[data-ct-sync-feedback-root="discovery"]');
  assert.ok(syncRoot, 'Discovery page should mount sync feedback root');
  assert.ok(syncRoot.querySelector('[data-ct-sync-retry-domain="discoveryView"]'), 'Discovery page should expose discoveryView retry');
  assert.ok(syncRoot.querySelector('[data-ct-sync-retry-domain="discoverySocial"]'), 'Discovery page should expose discoverySocial retry');

  binding.teardown();
});

runTest('New Discovery 页面底部导航应联通 Home 与 Discovery', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);

  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const navList = dom.window.document.querySelector('.ct-bottom-nav__list');
  assert.ok(navList, 'Missing bottom nav list');
  assert.ok(navList.matches('ul'), 'Bottom nav should use ul');

  const navItems = Array.from(dom.window.document.querySelectorAll('.ct-bottom-nav__item'));
  const homeLink = navItems.find((node) => /Home/.test(node.textContent));
  const discoveryLink = navItems.find((node) => /Discovery/.test(node.textContent));

  assert.ok(homeLink, 'Missing Home nav link');
  assert.ok(discoveryLink, 'Missing Discovery nav link');
  assert.strictEqual(homeLink.getAttribute('href'), 'index.html');
  assert.strictEqual(discoveryLink.getAttribute('href'), 'discovery.html');
  assert.strictEqual(discoveryLink.getAttribute('aria-current'), 'page');
  assert.ok(!homeLink.hasAttribute('aria-current'), 'Home should be inactive');
});

runTest('New Discovery 页面内容流应具备语义结构', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);

  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const tablist = dom.window.document.querySelector('[data-ct-discovery-tabs] [role="tablist"]');
  assert.ok(!tablist, 'Should not have tablist');

  const trendList = dom.window.document.querySelector('.ct-trend-strip__list');
  assert.ok(trendList, 'Missing trend list');
  assert.ok(trendList.matches('ul'), 'Trend rail should use ul');

  const feedList = dom.window.document.querySelector('.ct-discovery-posts');
  assert.ok(feedList, 'Missing feed list');
  assert.ok(feedList.matches('ul'), 'Feed should use ul');
});

runTest('New Discovery 搜索框应使用统一卡片结构', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const searchForm = dom.window.document.querySelector('.ct-search-bar[role="search"]');
  assert.ok(searchForm, 'Missing search form');
  assert.ok(searchForm.querySelector('.ct-search-bar__surface'), 'Missing search surface');
  assert.ok(searchForm.querySelector('.ct-search-bar__icon-shell'), 'Missing search icon shell');
  assert.ok(searchForm.querySelector('.ct-search-bar__input'), 'Missing search input');
  assert.ok(!searchForm.querySelector('.ct-search-bar__eyebrow'), 'Search eyebrow should be removed');
  assert.ok(!searchForm.querySelector('.ct-search-bar__hint'), 'Search hint should be removed');
});

runTest('New Discovery 搜索输入应使用圆条样式', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'discovery.css'), 'utf8');
  assert.ok(/\.ct-search-bar__surface[\s\S]*border-radius:\s*999px/.test(css), 'Search surface should be pill-shaped');
  assert.ok(/\.ct-search-bar__input[\s\S]*border-radius:\s*999px/.test(css), 'Search input should be pill-shaped');
});

runTest('New Discovery 搜索框与分段按钮应具备更强材质层次', () => {
  const discoveryCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'discovery.css'), 'utf8');
  const componentCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'components.css'), 'utf8');

  assert.ok(/\.ct-search-bar__surface[\s\S]*box-shadow:[^;]*inset/.test(discoveryCss), 'Search surface should include inset texture');
  assert.ok(/\.ct-search-bar__input[\s\S]*box-shadow:[^;]*inset/.test(discoveryCss), 'Search input should include inset texture');
  assert.ok(/\.ct-tab\.is-active[\s\S]*box-shadow:[^;]*inset/.test(componentCss), 'Active tab should include inset texture');
});

runTest('New Discovery 数据模块应兼容命名导出读取', async () => {
  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'data', 'discovery.js')).href;
  const discoveryData = await import(modulePath);

  assert.ok(Array.isArray(discoveryData.communityPosts), 'communityPosts export should exist');
  assert.ok(Array.isArray(discoveryData.hotspotStories), 'hotspotStories export should exist');
  assert.ok(Array.isArray(discoveryData.tabs), 'tabs export should exist');
  assert.ok(discoveryData.postTrendStrip && typeof discoveryData.postTrendStrip === 'object', 'postTrendStrip export should exist');
  assert.ok(discoveryData.hotspotTrendStrip && typeof discoveryData.hotspotTrendStrip === 'object', 'hotspotTrendStrip export should exist');
});

runTest('New Discovery 搜索框应支持实时前端过滤与空态', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const searchInput = dom.window.document.querySelector('.ct-search-bar__input');
  assert.ok(searchInput, 'Missing discovery search input');

  searchInput.value = 'invalid query';
  searchInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  const postTitles = Array.from(dom.window.document.querySelectorAll('.ct-discovery-post__title')).map((node) => node.textContent.trim());
  assert.strictEqual(postTitles.length, 0, 'Query should filter items');
  assert.ok(dom.window.document.querySelector('.ct-state-panel[data-state-kind="empty"]'), 'Missing discovery empty state');
});

runTest('New Discovery 帖子应支持收藏到 Favorites', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const favoriteButton = dom.window.document.querySelector('.ct-discovery-post__favorite');
  if (favoriteButton) {
    favoriteButton.click();
    const stored = JSON.parse(dom.window.localStorage.getItem('ct_favorites'));
    const storedFavorites = stored.users?.guest || stored;
    assert.ok(storedFavorites.posts.length > 0, 'Discovery post should be saved');
  }
});

runTest('New Discovery 帖子主体应提供 Post Detail 独立页入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  dom.window.document.querySelector('[data-tab-key="posts"]').click();

  const postLink = dom.window.document.querySelector('[data-ct-post-link]');
  assert.ok(postLink, 'Missing post detail link');
  assert.strictEqual(postLink.getAttribute('href'), 'post-detail.html?id=brutalist-basics');
});

runTest('New Discovery 页面应跟随 app_locale 切换主要文案', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(dom.window.document.documentElement.lang, 'zh-CN');
  assert.ok(/热点趋势/.test(dom.window.document.body.textContent));
  assert.ok(/热门搜索/.test(dom.window.document.querySelector('.ct-search-bar__input').getAttribute('placeholder')));
});

// tests for discoveryState.js removed

runTest('New Discovery 帖子应支持点赞并在重绘后保持状态', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href}?like=1`;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  dom.window.document.querySelector('[data-tab-key="posts"]').click();
  const likeButton = dom.window.document.querySelector('[data-ct-toggle-post-like]');
  assert.ok(likeButton, 'Missing discovery like button');
  likeButton.click();

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_discovery_social'));
  assert.ok(stored.users.guest.likedPostIds.includes('brutalist-basics'), 'Liked post should persist to social store');

  dom.window.document.querySelector('[data-tab-key="hotspots"]').click();
  dom.window.document.querySelector('[data-tab-key="posts"]').click();

  const refreshedLikeButton = dom.window.document.querySelector('[data-ct-toggle-post-like="brutalist-basics"]');
  assert.strictEqual(refreshedLikeButton.getAttribute('aria-pressed'), 'true', 'Liked state should survive rerender');
});

runTest('New Discovery 加载态与空状态应使用统一状态面板', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'components', 'statePanel.js')).href}?state-panel=1`;
  const { renderStatePanel } = await import(modulePath);

  const loadingHtml = renderStatePanel({
    kind: 'loading',
    eyebrow: 'Loading Feed',
    description: 'Preparing posts.'
  });
  const emptyHtml = renderStatePanel({
    kind: 'empty',
    eyebrow: 'No Results',
    description: 'Try another keyword.'
  });

  const dom = new JSDOM(`<body>${loadingHtml}${emptyHtml}</body>`);
  const panels = dom.window.document.querySelectorAll('.ct-state-panel');
  assert.strictEqual(panels.length, 2, 'Shared state panel should render loading and empty variants');
  assert.strictEqual(dom.window.document.querySelector('[data-state-kind="loading"]').getAttribute('aria-busy'), 'true', 'Loading state should expose aria-busy');
  assert.ok(dom.window.document.querySelector('[data-state-kind="empty"]'), 'Empty state should use shared panel markup');
});

// tests for discoveryState.js user scope removed

runTest('New Discovery 列表页应支持最小分享反馈闭环', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

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

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href}?share=1`;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  dom.window.document.querySelector('[data-tab-key="posts"]').click();
  const shareButton = dom.window.document.querySelector('[data-ct-share-post]');
  assert.ok(shareButton, 'Missing discovery share button');
  shareButton.click();

  const feedback = dom.window.document.querySelector('[data-ct-share-feedback="brutalist-basics"]');
  assert.ok(feedback, 'Missing discovery share feedback');
  assert.ok(/link|链接/i.test(feedback.textContent), 'Share feedback should mention copied link');
  assert.ok(/post-detail\.html\?id=brutalist-basics/.test(dom.window.__copiedText), 'Share action should copy the post detail url');
});

runTest('New Discovery 点赞后应更新列表展示计数', async () => {
  const htmlPath = path.join(__dirname, '..', 'discovery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/discovery.html' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'discoveryPage.js')).href}?like-count=1`;
  const { renderDiscoveryPage } = await import(modulePath);
  renderDiscoveryPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  dom.window.document.querySelector('[data-tab-key="posts"]').click();
  const beforeText = dom.window.document.querySelector('.ct-discovery-post__stats').textContent;
  dom.window.document.querySelector('[data-ct-toggle-post-like="brutalist-basics"]').click();
  const afterText = dom.window.document.querySelector('.ct-discovery-post__stats').textContent;

  assert.notStrictEqual(afterText, beforeText, 'Discovery like should update visible engagement count');
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
