const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

function formatLocalDateISO(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createDom() {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  return dom;
}

async function renderPage(dom, suffix = 'default') {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href}?${suffix}`;
  const { renderMePage } = await import(modulePath);
  renderMePage();
  return dom.window.document;
}

runTest('Me 页面应使用个人中心首页结构，不再渲染 tab 摘要', () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const selectors = [
    '#app',
    '[data-ct-topbar]',
    '[data-ct-profile-hero]',
    '[data-ct-me-dashboard]',
    '[data-ct-bottom-nav]'
  ];

  for (const selector of selectors) {
    assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
  }

  assert.ok(!doc.querySelector('[data-ct-me-tabs]'), 'Me tabs mount should be removed');
  assert.ok(!doc.querySelector('[data-ct-me-summary]'), 'Me summary mount should be removed');
});

runTest('Me 页面默认渲染今日重点、快捷入口、最近动态和底部导航', async () => {
  const dom = createDom();
  const doc = await renderPage(dom, 'dashboard-default');

  assert.ok(doc.querySelector('.ct-me-focus'), 'Missing today focus');
  assert.ok(doc.querySelector('.ct-me-quick-grid'), 'Missing quick access grid');
  assert.ok(doc.querySelector('.ct-me-recent-list, .ct-me-recent-empty'), 'Missing recent activity');
  assert.ok(!doc.querySelector('[role="tablist"]'), 'Me page should not render tablist');

  const entries = Array.from(doc.querySelectorAll('[data-ct-me-entry]')).map((node) => node.getAttribute('data-ct-me-entry'));
  assert.ok(entries.includes('schedule'), 'Missing schedule entry');
  assert.ok(entries.includes('wardrobe'), 'Missing wardrobe entry');
  assert.ok(entries.includes('favorites'), 'Missing favorites entry');
  assert.ok(entries.includes('settings'), 'Missing settings entry');

  const navItems = Array.from(doc.querySelectorAll('.ct-bottom-nav__item'));
  const meLink = navItems.find((node) => /Me/.test(node.textContent));
  assert.ok(meLink, 'Missing Me nav link');
  assert.strictEqual(meLink.getAttribute('aria-current'), 'page');
});

runTest('Me 页面应跟随 app_locale 切换中文主文案', async () => {
  const dom = createDom();
  dom.window.localStorage.setItem('app_locale', 'zh-CN');

  const doc = await renderPage(dom, 'zh-dashboard');

  assert.strictEqual(doc.documentElement.lang, 'zh-CN');
  assert.ok(/今日/.test(doc.body.textContent), 'Missing Chinese focus label');
  assert.ok(/快捷入口/.test(doc.body.textContent), 'Missing Chinese quick access title');
  assert.ok(/最近动态/.test(doc.body.textContent), 'Missing Chinese recent title');
  assert.ok(/时尚档案成员/.test(doc.body.textContent), 'Missing Chinese profile label');
});

runTest('Me Dashboard 应读取真实日程、收藏、衣橱和设置状态', async () => {
  const dom = createDom();
  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    users: {
      guest: {
        views: {
          upcoming: {
            groups: [
              {
                dateISO: formatLocalDateISO(1),
                day: formatLocalDateISO(1).slice(8, 10),
                label: 'Date Window',
                events: [
                  {
                    id: 'atelier-review',
                    dateISO: formatLocalDateISO(1),
                    time: '08:30 AM — 09:30 AM',
                    title: 'Atelier Review',
                    location: 'Lower East Studio',
                    image: '/uploads/shared/editorial-look-02.jpg',
                    tags: ['Outerwear']
                  }
                ]
              }
            ]
          },
          travel: { groups: [] },
          archive: { groups: [] }
        }
      }
    }
  }));
  dom.window.localStorage.setItem('ct_favorites', JSON.stringify({
    looks: [{ id: 'urban-commute', title: 'Urban Commute', subtitle: 'Saved Look' }],
    posts: [{ id: 'brutalist-basics', title: 'Brutalist Basics', subtitle: 'Saved Post' }]
  }));
  dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify([
    {
      id: 'atelier-coat',
      category: 'Outerwear',
      title: 'Atelier Coat',
      size: 'M',
      color: 'Ink',
      material: 'Wool',
      image: '/uploads/wardrobe/wool-trench.jpg',
      filter: 'outerwear',
      favorite: true
    }
  ]));
  dom.window.localStorage.setItem('ct_settings', JSON.stringify({
    language: 'en-US',
    'display-mode': 'dark',
    'wardrobe-layout': 'list',
    'temperature-unit': 'fahrenheit',
    'public-profile': true,
    'outfit-reminders': true
  }));

  const doc = await renderPage(dom, 'real-state');
  const bodyText = doc.body.textContent;

  assert.ok(/Atelier Review/.test(bodyText), 'Dashboard should show next schedule event');
  assert.ok(/Lower East Studio/.test(bodyText), 'Dashboard should show schedule location');
  assert.ok(/Atelier Coat/.test(bodyText), 'Dashboard should show recent wardrobe item');
  assert.ok(/02 looks|02 looks \/ 01 posts|01 looks \/ 01 posts/.test(bodyText), 'Dashboard should show favorites detail');
  assert.ok(/List · °F/.test(bodyText), 'Dashboard should show settings detail');

  assert.strictEqual(doc.querySelector('[data-ct-me-entry="wardrobe"]').getAttribute('href'), 'wardrobe.html');
  assert.strictEqual(doc.querySelector('[data-ct-me-entry="favorites"]').getAttribute('href'), 'favorites.html');
  assert.strictEqual(doc.querySelector('[data-ct-me-entry="settings"]').getAttribute('href'), 'settings.html');
});

runTest('Me 页面应在相关 store 写入后同步更新 Dashboard', async () => {
  const dom = createDom();
  const doc = await renderPage(dom, 'store-backflow');

  const profileModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'profileStore.js')).href}`;
  const favoritesModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'favoritesStore.js')).href}`;
  const wardrobeModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeStore.js')).href}`;
  const settingsModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsStore.js')).href}`;

  const { saveProfile } = await import(profileModulePath);
  const { toggleFavorite } = await import(favoritesModulePath);
  const { saveWardrobeItem } = await import(wardrobeModulePath);
  const { setSetting } = await import(settingsModulePath);

  saveProfile({ name: 'Nova Updated', bio: 'Updated bio', avatar: '/uploads/profile/elara-vance.jpg' });
  assert.ok(/Nova Updated/.test(doc.querySelector('[data-ct-profile-hero]').textContent), 'Me hero should update after profile write');

  toggleFavorite('posts', { id: 'post-sync', title: 'Synced Post', subtitle: 'Backflow', href: 'favorites.html' });
  assert.ok(/Synced Post|01 posts/.test(doc.querySelector('[data-ct-me-dashboard]').textContent), 'Me dashboard should update after favorites write');

  saveWardrobeItem({
    category: 'Outerwear',
    title: 'Backflow Coat',
    size: 'M',
    color: 'Ink',
    material: 'Wool',
    image: '/uploads/wardrobe/wool-trench.jpg',
    filter: 'outerwear',
    favorite: false
  });
  assert.ok(/Backflow Coat/.test(doc.querySelector('[data-ct-me-dashboard]').textContent), 'Me dashboard should update after wardrobe write');

  setSetting('display-mode', 'light');
  assert.ok(/Light|浅色/.test(doc.querySelector('[data-ct-me-dashboard]').textContent), 'Me dashboard should update after settings write');
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
