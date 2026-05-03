const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const seedPath = path.join(__dirname, '..', '..', '..', 'services', 'backend_lite', 'data', 'schedule_content_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

function setupMockFetch(window) {
  window.fetch = async (url) => {
    if (url.includes('/api/schedules/content')) {
      const urlObj = new URL(url, 'http://localhost');
      const locale = urlObj.searchParams.get('locale') || 'en-US';
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null
        },
        json: async () => seedData[locale]
      };
    }
    return { ok: false };
  };
}

global.fetch = async (url) => {
  try {
    if (url.includes('/api/schedules/content')) {
      const urlObj = new URL(url, 'http://localhost');
      const locale = urlObj.searchParams.get('locale') || 'en-US';
      return {
        ok: true,
        status: 200,
        headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null },
        json: async () => seedData[locale]
      };
    }
    return { ok: false, status: 404, headers: { get: () => null }, json: async () => null };
  } catch (e) {
    throw e;
  }
};

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('New Schedule 页面应包含第一阶段关键区域', () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const selectors = [
    '#app',
    '[data-ct-topbar]'
  ];

  for (const selector of selectors) {
    assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
  }
});

runTest('New Schedule 页面应默认显示 Upcoming 并支持切换到 Travel', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  setupMockFetch(dom.window);
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);

  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 100));
});

runTest('New Schedule 页面应具备 tabs 语义、列表语义且不再渲染图片', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);

  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));

  const tablist = dom.window.document.querySelector('.ct-tab-list[role="tablist"]');

  assert.ok(tablist, 'Missing schedule tablist');
  const groups = dom.window.document.querySelectorAll('ol, ul');
  assert.ok(groups.length > 0, 'Missing schedule list');
  const images = dom.window.document.querySelectorAll('img');
  assert.strictEqual(images.length, 0, 'Schedule should not render images');
});

runTest('New Schedule 页面应把 Add Event 入口指向独立 schedule-event.html', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);

  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const addLink = dom.window.document.querySelector('a[href*="schedule-event"], [onclick*="scheduleEvent"]');
  assert.ok(addLink, 'Schedule add event should link to schedule-event.html');
  assert.ok(/schedule-event/i.test(addLink.getAttribute('onclick')));
});

runTest('New Schedule Event 页面应支持新增并在返回总览后持久化', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify(seedData['en-US']));

  let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?create=1`;
  const { renderSchedulePage: renderSchedulePageFirst } = await import(modulePath);

  renderSchedulePageFirst();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 100));

  const eventHtmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const eventHtml = fs.readFileSync(eventHtmlPath, 'utf8');
  const eventDom = new JSDOM(eventHtml, { url: 'http://localhost/schedule-event.html' });

  global.window = eventDom.window; global.window.fetch = global.fetch;
  global.document = eventDom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = eventDom.window.CustomEvent;
  global.HTMLElement = eventDom.window.HTMLElement;
  global.Node = eventDom.window.Node;
  global.FormData = eventDom.window.FormData;

  modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?create=1`;
  let { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  eventDom.window.document.querySelector('[name="tab"]').value = 'travel';
  eventDom.window.document.querySelector('[name="title"]').value = 'Studio Breakfast';
  eventDom.window.document.querySelector('[name="location"]').value = 'Cafe';
  const submitEvent = new eventDom.window.Event('submit', { bubbles: true, cancelable: true });
  eventDom.window.document.querySelector('[data-ct-schedule-event-form]').dispatchEvent(submitEvent);
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));

  const listHtmlPath = path.join(__dirname, '..', 'schedule.html');
  const listHtml = fs.readFileSync(listHtmlPath, 'utf8');
  const listDom = new JSDOM(listHtml, { url: 'http://localhost/schedule.html' });

  const storedStr = dom.window.localStorage.getItem('ct_schedule');
  if (storedStr) {
      listDom.window.localStorage.setItem('ct_schedule', storedStr);
  }
  global.window = listDom.window; global.window.fetch = global.fetch;
  global.document = listDom.window.document;
  global.localStorage = listDom.window.localStorage;
  global.CustomEvent = listDom.window.CustomEvent;
  global.HTMLElement = listDom.window.HTMLElement;
  global.Node = listDom.window.Node;

  modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?create=2`;
  const { renderSchedulePage: renderSchedulePageNext } = await import(modulePath);

  renderSchedulePageNext();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));
  listDom.window.document.querySelector('[data-tab-key="travel"]').click();
  await new Promise(resolve => setTimeout(resolve, 100));

  const titles = Array.from(listDom.window.document.querySelectorAll('.ct-schedule-card__title')).map((node) => node.textContent.trim());
  assert.ok(titles.includes('Studio Breakfast'), 'Created event should appear on schedule overview');
});

runTest('New Schedule Event 页面应通过统一 binding 暴露 sync feedback 与 teardown', async () => {
  const eventHtmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const eventHtml = fs.readFileSync(eventHtmlPath, 'utf8');
  const dom = new JSDOM(eventHtml, { url: 'http://localhost/schedule-event.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify(seedData['en-US']));

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href;
  const { renderScheduleEventPage } = await import(modulePath);
  const binding = await renderScheduleEventPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.ok(binding && typeof binding.teardown === 'function', 'Schedule event page should expose teardown');
  binding.teardown();
});

runTest('Schedule 页顶部应提供返回 Me 的入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);

  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const backLink = dom.window.document.querySelector('.ct-icon-button[href="me.html"]');
  assert.ok(backLink, 'Missing back link to me.html');
});

runTest('Home 与 Me 应提供进入 Schedule 页的入口', async () => {
  const homeHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const homeDom = new JSDOM(homeHtml, { url: 'http://localhost/index.html' });

  global.window = homeDom.window; global.window.fetch = global.fetch;
  global.document = homeDom.window.document;
  global.CustomEvent = homeDom.window.CustomEvent;
  global.HTMLElement = homeDom.window.HTMLElement;
  global.Node = homeDom.window.Node;

  const homeModulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href;
  const { renderHomePage } = await import(homeModulePath);
  renderHomePage();

  const homeLink = homeDom.window.document.querySelector('.ct-home-schedule__link');
  assert.ok(homeLink, 'Missing home schedule link');
  assert.strictEqual(homeLink.getAttribute('href'), 'schedule.html');

  const meHtml = fs.readFileSync(path.join(__dirname, '..', 'me.html'), 'utf8');
  const meDom = new JSDOM(meHtml, { url: 'http://localhost/me.html' });

  global.window = meDom.window; global.window.fetch = global.fetch;
  global.document = meDom.window.document;
  global.CustomEvent = meDom.window.CustomEvent;
  global.HTMLElement = meDom.window.HTMLElement;
  global.Node = meDom.window.Node;

  const meModulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  const { renderMePage } = await import(meModulePath);
  renderMePage();

  const meLink = meDom.window.document.querySelector('.ct-me-summary__action[href="schedule.html"]');
  assert.ok(meLink, 'Missing me schedule summary link');
  assert.strictEqual(meLink.getAttribute('href'), 'schedule.html');
});

runTest('New Schedule 页面应跟随 app_locale 切换主要文案', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify(seedData['en-US']));

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  assert.strictEqual(dom.window.document.documentElement.lang, 'zh-CN');
  assert.ok(/Schedule|日程/.test(dom.window.document.body.textContent), 'Missing translated text');
  assert.ok(/Upcoming|即将到来/.test(dom.window.document.body.textContent));
});

runTest('New Schedule Event 页面表单控件应补齐双语占位与 aria 文案并移除图片字段', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule-event.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href;
  const { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();

  assert.ok(dom.window.document.querySelector('[name="day"]'));
  assert.ok(dom.window.document.querySelector('[name="title"]'));
  assert.ok(dom.window.document.querySelector('[name="location"]'));
  assert.ok(dom.window.document.querySelector('[name="tab"]'));
  assert.ok(!dom.window.document.querySelector('[name="image"]'), 'Schedule event form should not expose image field');
});

runTest('New Schedule 空日程时应渲染统一空状态面板', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    tabs: [
      { key: 'upcoming', label: 'Upcoming', active: true },
      { key: 'travel', label: 'Travel', active: false },
      { key: 'archive', label: 'Archive', active: false }
    ],
    views: {
      upcoming: { groups: [] },
      travel: { groups: [] },
      archive: { groups: [] }
    }
  }));

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?empty=1`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));

  const emptyPanel = dom.window.document.querySelector('.ct-empty-state');
  assert.ok(emptyPanel, 'Missing shared empty state panel');
});

runTest('New Schedule 应容忍旧存储中缺失 tags 的事件', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    users: {
      guest: {
        upcoming: {
          groups: [
            {
              day: '02',
              label: 'Apr / Wed',
              events: [
                {
                  id: 'legacy-event',
                  time: '09:00 AM — 10:00 AM',
                  title: 'Legacy Event',
                  location: 'Archive Room',
                  image: '/uploads/shared/editorial-look-01.jpg'
                }
              ]
            }
          ]
        },
        travel: { groups: [] },
        archive: { groups: [] }
      }
    }
  }));

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?legacy-tags=1`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));

  assert.ok(dom.window.document.querySelector('.ct-schedule-card__title'));
});

runTest('New Schedule Event 页面应支持编辑已有事件并在刷新后保留', async () => {
  const eventHtmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const eventHtml = fs.readFileSync(eventHtmlPath, 'utf8');
  const listHtml = fs.readFileSync(path.join(__dirname, '..', 'schedule.html'), 'utf8');
  const dom = new JSDOM(eventHtml, { url: 'http://localhost/schedule-event.html?id=upcoming-product-review-1' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify(seedData['en-US']));

  let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?edit=1`;
  let { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(dom.window.document.querySelector('[name="title"]').value, 'Product Review', 'Edit form should prefill existing title');
  dom.window.document.querySelector('[name="eventId"]').value = 'upcoming-product-review-1';
  dom.window.document.querySelector('[name="tab"]').value = 'travel';
  dom.window.document.querySelector('[name="title"]').value = 'Product Review Updated';
  dom.window.document.querySelector('[name="location"]').value = 'Tribeca Studio';

  const editSubmitEvent = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  dom.window.document.querySelector('[data-ct-schedule-event-form]').dispatchEvent(editSubmitEvent);
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_schedule'));
  const reloadDom = new JSDOM(listHtml, { url: 'http://localhost/schedule.html' });
  if (stored) {
      reloadDom.window.localStorage.setItem('ct_schedule', JSON.stringify(stored));
  }
  global.window = reloadDom.window; global.window.fetch = global.fetch;
  global.document = reloadDom.window.document;
  global.localStorage = reloadDom.window.localStorage;
  global.CustomEvent = reloadDom.window.CustomEvent;
  global.HTMLElement = reloadDom.window.HTMLElement;
  global.Node = reloadDom.window.Node;

  modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?edit=2`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));

  let titles = Array.from(reloadDom.window.document.querySelectorAll('.ct-schedule-card__title')).map((node) => node.textContent.trim());
  if (!titles.includes('Product Review Updated')) {
      reloadDom.window.document.querySelector('[data-tab-key="travel"]').click();
      await new Promise(resolve => setTimeout(resolve, 100));
      titles = Array.from(reloadDom.window.document.querySelectorAll('.ct-schedule-card__title')).map((node) => node.textContent.trim());
  }
  assert.ok(titles.includes('Product Review Updated'), 'Edited event should survive page reload');
  assert.ok(/Tribeca Studio/.test(reloadDom.window.document.body.textContent), 'Edited location should survive page reload');
});

runTest('New Schedule Event 页面应读取来自 Outfit Detail 的日程草稿预填', async () => {
  const eventHtmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const eventHtml = fs.readFileSync(eventHtmlPath, 'utf8');
  const dom = new JSDOM(eventHtml, { url: 'http://localhost/schedule-event.html' });

  dom.window.localStorage.setItem('ct_schedule_draft', JSON.stringify({
    source: {
      type: 'outfit',
      id: 'midnight-formalism'
    },
    tab: 'upcoming',
    title: 'Midnight Formalism',
    location: 'ClosetTwin Styling Suite',
    tags: ['Monochrome', 'Tailoring', 'Evening'],
    reminderEnabled: true
  }));

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?draft-prefill=1`;
  const { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(dom.window.document.querySelector('[name="title"]').value, 'Midnight Formalism');
  assert.strictEqual(dom.window.document.querySelector('[name="location"]').value, 'ClosetTwin Styling Suite');
  assert.strictEqual(dom.window.document.querySelector('[name="tags"]').value, 'Monochrome, Tailoring, Evening');
  assert.strictEqual(dom.window.document.querySelector('[name="reminderEnabled"]').checked, true);
});

runTest('New Schedule 页面应支持提醒开关并持久化状态', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify(seedData['en-US']));

  let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?reminder=1`;
  let { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));

  const toggle = dom.window.document.querySelector('.js-toggle-reminder');
  assert.ok(toggle, 'Missing schedule reminder toggle');
  assert.ok(!toggle.classList.contains('is-active'));
  toggle.click();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));

  const nextToggle = dom.window.document.querySelector('.js-toggle-reminder');
  assert.ok(nextToggle && nextToggle.classList.contains('is-active'), 'Reminder toggle should update current page state');

  let stored = JSON.parse(dom.window.localStorage.getItem('ct_schedule'));
  let upcomingGroup = stored ? stored.views.upcoming.groups[0] : null;
  let toggledEvent = upcomingGroup ? upcomingGroup.events.find(e => e.id === 'upcoming-product-review-1') : null;
  if (!toggledEvent && stored) {
    upcomingGroup = stored.views.travel.groups[0];
    if (upcomingGroup) toggledEvent = upcomingGroup.events.find(e => e.id === 'upcoming-product-review-1');
  }
  if (!toggledEvent && stored) {
    upcomingGroup = stored.views.archive.groups[0];
    if (upcomingGroup) toggledEvent = upcomingGroup.events.find(e => e.id === 'upcoming-product-review-1');
  }
  assert.ok(toggledEvent && toggledEvent.reminderEnabled, 'Reminder toggle should persist to localStorage');

  const reloadDom = new JSDOM(html, { url: 'http://localhost/schedule.html' });
  if (stored) {
      reloadDom.window.localStorage.setItem('ct_schedule', JSON.stringify(stored));
  }
  global.window = reloadDom.window; global.window.fetch = global.fetch;
  global.document = reloadDom.window.document;
  global.localStorage = reloadDom.window.localStorage;
  global.CustomEvent = reloadDom.window.CustomEvent;
  global.HTMLElement = reloadDom.window.HTMLElement;
  global.Node = reloadDom.window.Node;

  const reloadModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?reminder=2`;
  const { renderSchedulePage: renderSchedulePageReload } = await import(reloadModulePath);
  renderSchedulePageReload();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));

  const persistedToggle = reloadDom.window.document.querySelector('.js-toggle-reminder');
  assert.ok(persistedToggle && persistedToggle.classList.contains('is-active'), 'Reminder toggle should survive page reload');
});

runTest('New Schedule 删除应先打开自定义确认弹层再执行删除', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window; global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify(seedData['en-US']));

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?delete-dialog=1`;
  let { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));

  const deleteButton = dom.window.document.querySelector('.js-request-delete');
  assert.ok(deleteButton, 'Missing schedule delete button');
  deleteButton.click();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));

  const dialog = dom.window.document.querySelector('.ct-dialog');
  assert.ok(dialog, 'Delete should open custom confirmation dialog');
  assert.ok(/Product Review/.test(dialog.textContent), 'Dialog should mention target event title');

  const confirmBtn = dialog.querySelector('[data-dialog-action="confirm"]');
  assert.ok(confirmBtn, 'Missing confirm button in dialog');
  confirmBtn.click();
  await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  await new Promise(resolve => setTimeout(resolve, 200));
  const titles = Array.from(dom.window.document.querySelectorAll('.ct-schedule-card__title')).map((node) => node.textContent.trim());
  assert.ok(!titles.includes('Product Review'), 'Event should be removed only after confirming delete');
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
// EOF
