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
  await runTest('New Favorites 页面应包含关键区域', async () => {
    const htmlPath = path.join(__dirname, '..', 'favorites.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    [
      '#app',
      '[data-ct-topbar]',
      '[data-ct-favorites-summary]',
      '[data-ct-favorites-tabs]',
      '[data-ct-favorites-collection]',
      '[data-ct-bottom-nav]'
    ].forEach((selector) => {
      assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
    });
  });

  await runTest('New Favorites 页面应默认显示 Looks 收藏并支持切换到 Posts', async () => {
    const htmlPath = path.join(__dirname, '..', 'favorites.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/favorites.html' });

    dom.window.localStorage.setItem('ct_favorites', JSON.stringify({
      looks: [
        { id: 'urban-commute', title: 'Urban Commute', subtitle: 'Graphite layers for a precise city rhythm', image: '/uploads/shared/travel-look.jpg' }
      ],
      posts: [
        { id: 'brutalist-basics', title: 'The Modern Uniform: Brutalist Basics', subtitle: 'ELIAS.VAULT · 2H AGO', image: '/uploads/shared/travel-look.jpg' }
      ]
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'favoritesPage.js')).href;
    const { renderFavoritesPage } = await import(modulePath);
    renderFavoritesPage();

    assert.ok(/Urban Commute/.test(dom.window.document.body.textContent));

    dom.window.document.querySelector('[data-tab-key="posts"]').click();
    assert.ok(/The Modern Uniform: Brutalist Basics/.test(dom.window.document.body.textContent));
  });

  await runTest('New Favorites 页面应支持空状态与移除收藏', async () => {
    const htmlPath = path.join(__dirname, '..', 'favorites.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/favorites.html' });

    dom.window.localStorage.setItem('app_locale', 'zh-CN');
    dom.window.localStorage.setItem('ct_favorites', JSON.stringify({
      looks: [
        { id: 'urban-commute', title: 'Urban Commute', subtitle: 'Graphite layers for a precise city rhythm', image: '/uploads/shared/travel-look.jpg' }
      ],
      posts: []
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'favoritesPage.js')).href;
    const { renderFavoritesPage } = await import(modulePath);
    renderFavoritesPage();

    dom.window.document.querySelector('[data-ct-remove-favorite="urban-commute"]').click();
    assert.ok(/暂无收藏/.test(dom.window.document.body.textContent));

    dom.window.document.querySelector('[data-tab-key="posts"]').click();
    assert.ok(/暂无已存帖子/.test(dom.window.document.body.textContent));
  });
}

main();
