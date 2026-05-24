const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('New Wardrobe 页面应包含第一阶段关键区域', () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const selectors = [
    '#app',
    '[data-ct-topbar]',
    '[data-ct-wardrobe-hero]',
    '[data-ct-wardrobe-tabs]',
    '[data-ct-wardrobe-archive]',
    '[data-ct-bottom-nav]'
  ];

  for (const selector of selectors) {
    assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
  }
});

runTest('New Wardrobe 页面应默认显示 All 并支持切换到 Outerwear', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);

  renderWardrobePage();

  const initialTitles = Array.from(dom.window.document.querySelectorAll('.ct-wardrobe-card__title')).map((node) => node.textContent.trim());
  assert.ok(initialTitles.includes('Wool Trench'));
  assert.ok(initialTitles.includes('Silk Slip'));

  const outerwearTab = dom.window.document.querySelector('[data-tab-key="outerwear"]');
  assert.ok(outerwearTab, 'Missing outerwear tab');
  outerwearTab.click();

  const nextTitles = Array.from(dom.window.document.querySelectorAll('.ct-wardrobe-card__title')).map((node) => node.textContent.trim());
  assert.ok(nextTitles.includes('Wool Trench'));
  assert.ok(!nextTitles.includes('Silk Slip'));
});

runTest('New Wardrobe 页面应具备 tabs 语义、列表语义并使用本地图片', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const tablist = dom.window.document.querySelector('[data-ct-wardrobe-tabs] [role="tablist"]');
  assert.ok(tablist, 'Missing wardrobe tablist');

  const tabpanel = dom.window.document.querySelector('[data-ct-wardrobe-archive][role="tabpanel"]');
  assert.ok(tabpanel, 'Missing wardrobe tabpanel');

  const archiveList = dom.window.document.querySelector('.ct-wardrobe-archive');
  assert.ok(archiveList, 'Missing wardrobe archive list');
  assert.ok(archiveList.matches('ul'), 'Wardrobe archive should use ul');

  const metaList = dom.window.document.querySelector('.ct-wardrobe-card__meta');
  assert.ok(metaList, 'Missing wardrobe meta list');
  assert.ok(metaList.matches('dl'), 'Wardrobe meta should use dl');

  const image = dom.window.document.querySelector('.ct-wardrobe-card__image');
  assert.ok(image, 'Missing wardrobe image');
  assert.ok(!/^https?:/i.test(image.getAttribute('src')), 'Wardrobe image should use local asset');
});

runTest('New Wardrobe 页面应按真实分类生成筛选数量', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
    version: 1,
    users: {
      guest: [
        { id: 'coat-1', category: '外套', filter: 'outerwear', title: 'Coat One', image: '/uploads/wardrobe/wool-trench.jpg' },
        { id: 'coat-2', category: '外套', filter: 'outerwear', title: 'Coat Two', image: '/uploads/shared/editorial-look-01.jpg' },
        { id: 'shoe-1', category: '鞋履', filter: 'footwear', title: 'Shoe One', image: '/uploads/wardrobe/wool-trench.jpg' }
      ]
    }
  }));

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const tabs = Array.from(dom.window.document.querySelectorAll('[data-ct-wardrobe-tabs] [role="tab"]'));
  assert.strictEqual(tabs.length, 3, 'Wardrobe tabs should include all plus unique categories');
  assert.strictEqual(dom.window.document.querySelector('[data-tab-key="all"] .ct-tab__count').textContent, '03');
  assert.strictEqual(dom.window.document.querySelector('[data-tab-key="outerwear"] .ct-tab__count').textContent, '02');
  assert.strictEqual(dom.window.document.querySelector('[data-tab-key="footwear"] .ct-tab__count').textContent, '01');
});

runTest('New Wardrobe 页面应只保留独立添加入口并支持删除衣物', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });
  dom.window.localStorage.setItem('app_locale', 'zh-CN');

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const addLink = dom.window.document.querySelector('[data-ct-add-wardrobe-link]');
  assert.ok(addLink, 'Missing add wardrobe link');
  assert.strictEqual(addLink.getAttribute('href'), 'wardrobe-item.html');
  assert.strictEqual(dom.window.document.querySelector('[data-ct-add-wardrobe]'), null, 'Quick add button should be removed');
  assert.strictEqual(dom.window.document.querySelector('[data-ct-wardrobe-form]'), null, 'Inline add form should be removed');
  assert.ok(!/Quick Add|快速新增|Instant AI Scan|即时 AI 扫描/i.test(dom.window.document.body.textContent), 'Removed add modes should not render');

  const firstTitle = dom.window.document.querySelector('.ct-wardrobe-card__title');
  assert.ok(firstTitle, 'Seed wardrobe item should appear');

  const deleteButton = firstTitle.closest('.ct-wardrobe-card').querySelector('[data-ct-delete-wardrobe]');
  assert.ok(deleteButton, 'Missing delete wardrobe button');
  deleteButton.click();

  const remainingTitles = Array.from(dom.window.document.querySelectorAll('.ct-wardrobe-card__title')).map((node) => node.textContent.trim());
  assert.ok(!remainingTitles.includes(firstTitle.textContent.trim()), 'Deleted wardrobe item should disappear');
});

runTest('New Wardrobe 页面应提供独立 Add 与 Edit 入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
    version: 1,
    users: {
      guest: [
        { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
        { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
      ]
    }
  }));

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const addLink = dom.window.document.querySelector('[data-ct-add-wardrobe-link]');
  const editLink = dom.window.document.querySelector('[data-ct-edit-wardrobe]');

  assert.ok(addLink, 'Missing wardrobe add page link');
  assert.strictEqual(addLink.getAttribute('href'), 'wardrobe-item.html');
  assert.ok(editLink, 'Missing wardrobe edit page link');
  assert.ok(/^wardrobe-item\.html\?id=/.test(editLink.getAttribute('href')));
});

runTest('Me 页面应提供进入 Wardrobe 页的入口', async () => {
  const meHtml = fs.readFileSync(path.join(__dirname, '..', 'me.html'), 'utf8');
  const meDom = new JSDOM(meHtml, { url: 'http://localhost/me.html' });

  global.window = meDom.window;
  global.document = meDom.window.document;
  global.CustomEvent = meDom.window.CustomEvent;
  global.HTMLElement = meDom.window.HTMLElement;
  global.Node = meDom.window.Node;

  const meModulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  const { renderMePage } = await import(meModulePath);
  renderMePage();

  const summaryLink = meDom.window.document.querySelector('[data-ct-me-entry="wardrobe"]');
  assert.ok(summaryLink, 'Missing wardrobe dashboard link');
  assert.strictEqual(summaryLink.getAttribute('href'), 'wardrobe.html');
});

runTest('Wardrobe 页顶部返回应指向 Me', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const backLink = dom.window.document.querySelector('.ct-icon-button[href="me.html"]');
  assert.ok(backLink, 'Missing back link to me.html');
});

runTest('New Wardrobe 页面应跟随 app_locale 切换主要文案', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: '外套', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: '晚间', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  assert.strictEqual(dom.window.document.documentElement.lang, 'zh-CN');
  assert.ok(/全部/.test(dom.window.document.querySelector('[data-tab-key="all"]').textContent));
  assert.ok(/晚间/.test(dom.window.document.querySelector('[data-tab-key="evening"]').textContent));
});

runTest('New Wardrobe 页面应只保留单一添加入口并移除内联新增表单', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const addLink = dom.window.document.querySelector('[data-ct-add-wardrobe-link]');
  assert.ok(addLink, 'Missing add wardrobe link');
  assert.strictEqual(addLink.textContent.trim(), '添加单品');
  assert.strictEqual(dom.window.document.querySelector('[data-ct-add-wardrobe]'), null, 'Quick add button should not render');
  assert.strictEqual(dom.window.document.querySelector('[data-ct-wardrobe-form]'), null, 'Inline add form should not render');
  assert.ok(!/快速新增|即时 AI 扫描/i.test(dom.window.document.body.textContent), 'Removed add modes should not render');
});

runTest('New Wardrobe 页面应读取 wardrobe_display_mode 并输出真实布局状态', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  dom.window.localStorage.setItem('wardrobe_display_mode', 'list');
  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?layout=1`;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const archive = dom.window.document.querySelector('.ct-wardrobe-archive');
  assert.ok(archive, 'Missing wardrobe archive');
  assert.strictEqual(archive.getAttribute('data-ct-layout'), 'list');
});

runTest('Wardrobe list 模式应使用横向条目布局与空占位顶栏按钮', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  dom.window.localStorage.setItem('wardrobe_display_mode', 'list');
  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?layout-shape=1`;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'wardrobe.css'), 'utf8');
  assert.ok(/data-ct-layout="list"[\s\S]*grid-template-columns:\s*96px minmax\(0,\s*1fr\)/.test(css), 'Wardrobe list should use horizontal row layout');

  const placeholder = dom.window.document.querySelector('.ct-topbar .ct-icon-button.is-placeholder');
  assert.ok(placeholder, 'Wardrobe topbar should render placeholder shell');
  assert.strictEqual(placeholder.textContent.trim(), '');
});

runTest('New Wardrobe 页面应支持搜索并在无结果时显示统一空状态', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?search=1`;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const searchInput = dom.window.document.querySelector('.ct-search-bar__input');
  assert.ok(searchInput, 'Missing wardrobe search input');

  searchInput.value = 'Silk';
  searchInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  let titles = Array.from(dom.window.document.querySelectorAll('.ct-wardrobe-card__title')).map((node) => node.textContent.trim());
  assert.deepStrictEqual(titles, ['Silk Slip'], 'Wardrobe search should filter by title/material/category');

  const refreshedInput = dom.window.document.querySelector('.ct-search-bar__input');
  assert.ok(refreshedInput, 'Missing refreshed wardrobe search input');
  refreshedInput.value = 'No Match Keyword';
  refreshedInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  assert.ok(dom.window.document.querySelector('.ct-state-panel[data-state-kind="empty"]'), 'Wardrobe search empty state should use shared panel');
});

runTest('New SearchBar 共享样式应提升到 components.css', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'components.css'), 'utf8');
  assert.ok(/\.ct-search-bar__surface/.test(css), 'Search bar surface style should live in shared components.css');
  assert.ok(/\.ct-search-bar__input/.test(css), 'Search bar input style should live in shared components.css');
});

runTest('New Wardrobe 页面卡片应进入独立详情页', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?detail-link=1`;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const detailLink = dom.window.document.querySelector('[data-ct-open-wardrobe-detail]');
  assert.ok(detailLink, 'Missing wardrobe detail link');
  assert.ok(/^wardrobe-detail\.html\?id=/.test(detailLink.getAttribute('href')), 'Wardrobe card should open detail page');
});

runTest('New Wardrobe Detail 页面应根据 id 渲染并提供编辑入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe-detail.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-detail.html?id=wool-trench' });

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeDetailPage.js')).href}?detail-page=1`;
  const { renderWardrobeDetailPage } = await import(modulePath);
  renderWardrobeDetailPage();

  assert.ok(/Wool Trench/.test(dom.window.document.body.textContent), 'Wardrobe detail should render item title');
  const editLink = dom.window.document.querySelector('[data-ct-edit-wardrobe-detail]');
  assert.ok(editLink, 'Missing detail edit link');
  assert.strictEqual(editLink.getAttribute('href'), 'wardrobe-item.html?id=wool-trench');
});

runTest('New Wardrobe 卡片应支持直接切换收藏状态', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?favorite=1`;
  const { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();

  const favoriteButton = dom.window.document.querySelector('[data-ct-toggle-wardrobe-favorite="wool-trench"]');
  assert.ok(favoriteButton, 'Missing wardrobe favorite toggle button');
  const before = favoriteButton.getAttribute('aria-pressed');
  favoriteButton.click();

  const nextButton = dom.window.document.querySelector('[data-ct-toggle-wardrobe-favorite="wool-trench"]');
  assert.notStrictEqual(nextButton.getAttribute('aria-pressed'), before, 'Wardrobe favorite button should toggle pressed state');

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
  const storedItems = stored.users?.guest || stored;
  const item = storedItems.find((entry) => entry.id === 'wool-trench');
  assert.strictEqual(item.favorite, false, 'Wardrobe favorite state should persist to local storage');
});

runTest('New Wardrobe 删除最后一件单品后刷新应保持空衣橱', async () => {
  const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

  dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify([
    {
      id: 'only-item',
      category: 'Outerwear',
      title: 'Only Item',
      size: 'M',
      color: 'Ink',
      material: 'Wool',
      image: '/uploads/wardrobe/wool-trench.jpg',
      filter: 'outerwear',
      favorite: false
    }
  ]));

  
  if (!dom.window.localStorage.getItem('ct_wardrobe')) {
    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
      version: 1,
      users: {
        guest: [
          { id: 'wool-trench', category: 'Outerwear', filter: 'outerwear', title: 'Wool Trench', size: 'M', color: 'Oatmeal', material: 'Wool Blend', image: '/uploads/wardrobe/wool-trench.jpg', favorite: true },
          { id: 'silk-slip', category: 'Evening', filter: 'evening', title: 'Silk Slip', size: 'S', color: 'Onyx', material: '100% Silk', image: '/uploads/shared/editorial-look-01.jpg' }
        ]
      }
    }));
  }
  global.window = dom.window;

  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?empty-persist=1`;
  let { renderWardrobePage } = await import(modulePath);
  renderWardrobePage();
  dom.window.document.querySelector('[data-ct-delete-wardrobe="only-item"]').click();

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
  assert.deepStrictEqual(stored, {
    version: 1,
    users: {
      guest: []
    }
  }, 'Wardrobe store should persist a scoped empty array');

  const reloadDom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });
  reloadDom.window.localStorage.setItem('ct_wardrobe', JSON.stringify(stored));
  global.window = reloadDom.window;
  global.document = reloadDom.window.document;
  global.localStorage = reloadDom.window.localStorage;
  global.CustomEvent = reloadDom.window.CustomEvent;
  global.HTMLElement = reloadDom.window.HTMLElement;
  global.Node = reloadDom.window.Node;

  modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?empty-persist=2`;
  ({ renderWardrobePage } = await import(modulePath));
  renderWardrobePage();

  assert.ok(reloadDom.window.document.querySelector('.ct-state-panel[data-state-kind="empty"]'), 'Wardrobe should stay empty after reload');
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
