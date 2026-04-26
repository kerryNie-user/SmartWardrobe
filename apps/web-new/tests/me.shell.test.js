const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('New Me 页面应包含第一阶段关键区域', () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const selectors = [
    '#app',
    '[data-ct-topbar]',
    '[data-ct-profile-hero]',
    '[data-ct-me-tabs]',
    '[data-ct-me-summary]',
    '[data-ct-bottom-nav]'
  ];

  for (const selector of selectors) {
    assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
  }

  assert.ok(!doc.querySelector('[data-ct-me-overview]'), 'Me overview rail should be removed');
  assert.ok(!doc.querySelector('[data-ct-me-feed]'), 'Me feed section should be removed');
});

runTest('New Me 页面应默认显示 Schedule 摘要并支持切换到 Favorites', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  const { renderMePage } = await import(modulePath);

  renderMePage();

  const initialTitle = dom.window.document.querySelector('.ct-me-summary__title');
  assert.ok(initialTitle, 'Missing summary title');
  assert.ok(/Next Schedule/i.test(initialTitle.textContent));

  const favoritesTab = dom.window.document.querySelector('[data-tab-key="favorites"]');
  assert.ok(favoritesTab, 'Missing favorites tab');
  favoritesTab.click();

  const nextTitle = dom.window.document.querySelector('.ct-me-summary__title');
  assert.ok(/Saved Looks/i.test(nextTitle.textContent));
  assert.ok(!dom.window.document.querySelector('.ct-me-feed'), 'Me feed block should be removed');
});

runTest('New Me 页面应支持切换 Wardrobe 和 Settings 摘要', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  const { renderMePage } = await import(modulePath);

  renderMePage();

  const wardrobeTab = dom.window.document.querySelector('[data-tab-key="wardrobe"]');
  assert.ok(wardrobeTab, 'Missing wardrobe tab');

  wardrobeTab.click();
  assert.ok(/Wardrobe Volume/i.test(dom.window.document.querySelector('.ct-me-summary__title').textContent));

  const settingsTab = dom.window.document.querySelector('[data-tab-key="settings"]');
  assert.ok(settingsTab, 'Missing settings tab');
  settingsTab.click();
  assert.ok(/Preference Profile/i.test(dom.window.document.querySelector('.ct-me-summary__title').textContent));
  assert.ok(!dom.window.document.querySelector('.ct-me-feed'), 'Me feed block should be removed');
});

runTest('New Me 页面底部导航应联通 Home 与 Discovery', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  const { renderMePage } = await import(modulePath);

  renderMePage();

  const tablist = dom.window.document.querySelector('[data-ct-me-tabs] [role="tablist"]');
  assert.ok(tablist, 'Missing me tablist');

  const track = dom.window.document.querySelector('.ct-tab-list__track');
  assert.ok(track, 'Missing me segmented track');

  const activeTab = dom.window.document.querySelector('[data-ct-me-tabs] [role="tab"][aria-selected="true"]');
  assert.ok(activeTab, 'Missing active me tab');
  assert.ok(/Schedule/i.test(activeTab.textContent));

  const stats = dom.window.document.querySelector('.ct-me-summary__stats');
  assert.ok(stats, 'Missing me stats');
  assert.ok(stats.matches('dl'), 'Me stats should use dl');

  assert.ok(!dom.window.document.querySelector('.ct-me-feed'), 'Me feed block should be removed');

  const navList = dom.window.document.querySelector('.ct-bottom-nav__list');
  assert.ok(navList, 'Missing bottom nav list');
  assert.ok(navList.matches('ul'), 'Bottom nav should use ul');

  const navItems = Array.from(dom.window.document.querySelectorAll('.ct-bottom-nav__item'));
  const homeLink = navItems.find((node) => /Home/.test(node.textContent));
  const discoveryLink = navItems.find((node) => /Discovery/.test(node.textContent));
  const meLink = navItems.find((node) => /Me/.test(node.textContent));

  assert.ok(homeLink, 'Missing Home nav link');
  assert.ok(discoveryLink, 'Missing Discovery nav link');
  assert.ok(meLink, 'Missing Me nav link');
  assert.strictEqual(homeLink.getAttribute('href'), 'index.html');
  assert.strictEqual(discoveryLink.getAttribute('href'), 'discovery.html');
  assert.strictEqual(meLink.getAttribute('href'), 'me.html');
  assert.strictEqual(meLink.getAttribute('aria-current'), 'page');
});

runTest('New Me 页面应跟随 app_locale 切换主要文案', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  const { renderMePage } = await import(modulePath);
  renderMePage();

  assert.strictEqual(dom.window.document.documentElement.lang, 'zh-CN');
  assert.ok(/日程/.test(dom.window.document.body.textContent));
  assert.ok(/Vogue 社群成员/.test(dom.window.document.body.textContent));
});

runTest('New Me Favorites 摘要应读取真实收藏统计并提供独立页入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  dom.window.localStorage.setItem('ct_favorites', JSON.stringify({
    looks: [
      { id: 'urban-commute', title: 'Urban Commute' },
      { id: 'runway-analysis', title: 'Runway Analysis' }
    ],
    posts: [
      { id: 'brutalist-basics', title: 'The Modern Uniform: Brutalist Basics' }
    ]
  }));

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  const { renderMePage } = await import(modulePath);
  renderMePage();

  dom.window.document.querySelector('[data-tab-key="favorites"]').click();

  assert.ok(/Saved Looks/i.test(dom.window.document.querySelector('.ct-me-summary__title').textContent));
  assert.strictEqual(dom.window.document.querySelector('.ct-me-summary__value').textContent.trim(), '03');
  assert.strictEqual(dom.window.document.querySelector('.ct-me-summary__action').getAttribute('href'), 'favorites.html');
});

runTest('New Me Settings 摘要应读取真实设置偏好', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  dom.window.localStorage.setItem('app_theme', 'light');
  dom.window.localStorage.setItem('temperature_unit', 'fahrenheit');
  dom.window.localStorage.setItem('app_locale', 'en-US');
  dom.window.localStorage.setItem('ct_settings', JSON.stringify({
    'public-profile': false,
    'outfit-reminders': false,
    'wardrobe-layout': 'list'
  }));

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href}?settings-summary=1`;
  const { renderMePage } = await import(modulePath);
  renderMePage();

  dom.window.document.querySelector('[data-tab-key="settings"]').click();

  const statsText = dom.window.document.querySelector('.ct-me-summary__stats').textContent;
  assert.ok(/Light/i.test(statsText), 'Settings stats should show persisted theme');
  assert.ok(/°F/i.test(statsText), 'Settings stats should show persisted temperature unit');
  assert.ok(!dom.window.document.querySelector('.ct-me-feed'), 'Settings tab should no longer render feed block');
});

runTest('New Me Schedule 摘要应读取持久化日程统计与下一条事件', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    users: {
      guest: {
        upcoming: {
          groups: [
            {
              day: '04',
              label: 'Apr / Fri',
              events: [
                {
                  id: 'atelier-review',
                  time: '08:30 AM — 09:30 AM',
                  title: 'Atelier Review',
                  location: 'Lower East Studio',
                  image: '/uploads/shared/editorial-look-02.jpg',
                  tags: ['Outerwear']
                },
                {
                  id: 'fabric-pull',
                  time: '02:00 PM — 03:00 PM',
                  title: 'Fabric Pull',
                  location: 'Canal Archive',
                  image: '/uploads/shared/leather-craft-fabric.jpg',
                  tags: ['Material']
                }
              ]
            }
          ]
        },
        travel: {
          groups: [
            {
              day: '09',
              label: 'Apr / Wed',
              events: [
                {
                  id: 'buyer-trip',
                  time: '09:00 AM — 01:00 PM',
                  title: 'Buyer Trip',
                  location: 'CDG Terminal 2',
                  image: '/uploads/shared/travel-look.jpg',
                  tags: ['Travel']
                }
              ]
            }
          ]
        },
        archive: { groups: [] }
      }
    }
  }));

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href}?schedule-summary=1`;
  const { renderMePage } = await import(modulePath);
  renderMePage();

  const summaryText = dom.window.document.querySelector('.ct-me-summary').textContent;
  assert.ok(/Atelier Review/.test(summaryText), 'Me schedule summary should read persisted next event title');
  assert.ok(/Lower East Studio/.test(summaryText), 'Me schedule summary should read persisted location');
  assert.ok(/02/.test(summaryText), 'Me schedule stats should show persisted upcoming count');
  assert.ok(/01/.test(summaryText), 'Me schedule stats should show persisted travel count');
});

runTest('New Me Wardrobe 模块应读取真实衣橱数据并进入完整模块页', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

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
    },
    {
      id: 'travel-shirt',
      category: 'Essentials',
      title: 'Travel Shirt',
      size: 'S',
      color: 'Bone',
      material: 'Cotton',
      image: '/uploads/wardrobe/studio-shirt.jpg',
      filter: 'essentials',
      favorite: false
    }
  ]));

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href}?wardrobe-module=1`;
  const { renderMePage } = await import(modulePath);
  renderMePage();

  dom.window.document.querySelector('[data-tab-key="wardrobe"]').click();

  const summaryText = dom.window.document.querySelector('.ct-me-summary').textContent;
  const actionLink = dom.window.document.querySelector('.ct-me-summary__action');

  assert.ok(/Atelier Coat/.test(summaryText), 'Me wardrobe module should read the newest real wardrobe item');
  assert.ok(/02/.test(summaryText), 'Me wardrobe module should show real wardrobe count');
  assert.strictEqual(actionLink.getAttribute('href'), 'wardrobe.html');
});

runTest('New Me Wardrobe 模块应统计全量收藏单品而不是仅最近条目', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify([
    { id: 'item-1', category: 'Outerwear', title: 'Item 1', size: 'M', color: 'Ink', material: 'Wool', image: '/uploads/wardrobe/wool-trench.jpg', filter: 'outerwear', favorite: false },
    { id: 'item-2', category: 'Evening', title: 'Item 2', size: 'S', color: 'Bone', material: 'Silk', image: '/uploads/wardrobe/silk-slip.jpg', filter: 'evening', favorite: false },
    { id: 'item-3', category: 'Essentials', title: 'Item 3', size: 'L', color: 'Stone', material: 'Cotton', image: '/uploads/wardrobe/studio-shirt.jpg', filter: 'essentials', favorite: false },
    { id: 'item-4', category: 'Outerwear', title: 'Item 4', size: 'M', color: 'Black', material: 'Leather', image: '/uploads/wardrobe/wool-trench.jpg', filter: 'outerwear', favorite: true }
  ]));

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href}?wardrobe-favorite-count=1`;
  const { renderMePage } = await import(modulePath);
  renderMePage();

  dom.window.document.querySelector('[data-tab-key="wardrobe"]').click();
  const summaryText = dom.window.document.querySelector('.ct-me-summary').textContent;
  assert.ok(/01/.test(summaryText), 'Wardrobe module should expose all favorite items, even outside recent feed');
});

runTest('New Me 页面不应再渲染四个概览摘要区', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href}?overview-removed=1`;
  const { renderMePage } = await import(modulePath);
  renderMePage();

  assert.ok(!dom.window.document.querySelector('[data-ct-me-overview]'), 'Overview mount should be removed');
  assert.ok(!/Account Info|账号信息|Behavior Summary|行为摘要|Preference Summary|偏好摘要|Entry Orchestration|入口编排/.test(dom.window.document.body.textContent), 'Overview summary copy should be removed');
});

runTest('New Me 页面应在相关 store 写入后同步更新模块内容', async () => {
  const htmlPath = path.join(__dirname, '..', 'me.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/me.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const pageModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href}?backflow=1`;
  const profileModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'profileStore.js')).href}`;
  const favoritesModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'favoritesStore.js')).href}`;
  const wardrobeModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeStore.js')).href}`;
  const settingsModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsStore.js')).href}`;

  const { renderMePage } = await import(pageModulePath);
  const { saveProfile } = await import(profileModulePath);
  const { toggleFavorite } = await import(favoritesModulePath);
  const { saveWardrobeItem } = await import(wardrobeModulePath);
  const { setSetting } = await import(settingsModulePath);

  renderMePage();
  saveProfile({ name: 'Nova Updated', bio: 'Updated bio', avatar: '/uploads/profile/elara-vance.jpg' });
  assert.ok(/Nova Updated/.test(dom.window.document.querySelector('[data-ct-profile-hero]').textContent), 'Me hero should update after profile store write');

  dom.window.document.querySelector('[data-tab-key="favorites"]').click();
  toggleFavorite('posts', { id: 'post-sync', title: 'Synced Post', subtitle: 'Backflow', href: 'favorites.html' });
  assert.ok(/01/.test(dom.window.document.querySelector('.ct-me-summary').textContent), 'Me favorites summary should update after favorites store write');

  dom.window.document.querySelector('[data-tab-key="wardrobe"]').click();
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
  assert.ok(/Backflow Coat/.test(dom.window.document.querySelector('.ct-me-summary').textContent), 'Me wardrobe summary should update after wardrobe store write');

  dom.window.document.querySelector('[data-tab-key="settings"]').click();
  setSetting('display-mode', 'light');
  assert.ok(/Light|浅色/.test(dom.window.document.querySelector('.ct-me-summary').textContent), 'Me settings summary should update after settings store write');
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
