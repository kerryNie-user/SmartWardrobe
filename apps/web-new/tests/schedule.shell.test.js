const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

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
    '[data-ct-topbar]',
    '[data-ct-schedule-overview]',
    '[data-ct-schedule-tabs]',
    '[data-ct-schedule-timeline]',
    '[data-ct-bottom-nav]'
  ];

  for (const selector of selectors) {
    assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
  }
});

runTest('New Schedule 页面应默认显示 Upcoming 并支持切换到 Travel', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);

  renderSchedulePage();

  const initialTitle = dom.window.document.querySelector('.ct-schedule-event__title');
  assert.ok(initialTitle, 'Missing event title');
  assert.ok(/Product Review/i.test(initialTitle.textContent));

  const travelTab = dom.window.document.querySelector('[data-tab-key="travel"]');
  assert.ok(travelTab, 'Missing travel tab');
  travelTab.click();

  const nextTitle = dom.window.document.querySelector('.ct-schedule-event__title');
  assert.ok(/Paris Fashion Week Departure/i.test(nextTitle.textContent));
});

runTest('New Schedule 页面应具备 tabs 语义、列表语义且不再渲染图片', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  const tablist = dom.window.document.querySelector('[data-ct-schedule-tabs] [role="tablist"]');
  assert.ok(tablist, 'Missing schedule tablist');

  const track = dom.window.document.querySelector('.ct-tab-list__track');
  assert.ok(track, 'Missing schedule segmented track');

  const tabpanel = dom.window.document.querySelector('[data-ct-schedule-timeline][role="tabpanel"]');
  assert.ok(tabpanel, 'Missing schedule tabpanel');

  const groupList = dom.window.document.querySelector('.ct-schedule-timeline');
  assert.ok(groupList, 'Missing schedule timeline list');
  assert.ok(groupList.matches('ol'), 'Schedule timeline should use ol');

  const eventList = dom.window.document.querySelector('.ct-schedule-group__events');
  assert.ok(eventList, 'Missing schedule event list');
  assert.ok(eventList.matches('ul'), 'Schedule group events should use ul');

  assert.ok(!dom.window.document.querySelector('.ct-schedule-event__image'), 'Schedule should not render event images');
});

runTest('New Schedule 页面应把 Add Event 入口指向独立 schedule-event.html', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  const addLink = dom.window.document.querySelector('.ct-schedule-overview__action[href="schedule-event.html"]');
  assert.ok(addLink, 'Schedule add event should link to schedule-event.html');
});

runTest('New Schedule Event 页面应支持新增并在返回总览后持久化', async () => {
  const eventHtmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const eventHtml = fs.readFileSync(eventHtmlPath, 'utf8');
  const listHtml = fs.readFileSync(path.join(__dirname, '..', 'schedule.html'), 'utf8');
  const eventDom = new JSDOM(eventHtml, { url: 'http://localhost/schedule-event.html' });

  global.window = eventDom.window;
  global.document = eventDom.window.document;
  global.localStorage = eventDom.window.localStorage;
  global.CustomEvent = eventDom.window.CustomEvent;
  global.HTMLElement = eventDom.window.HTMLElement;
  global.Node = eventDom.window.Node;
  global.FormData = eventDom.window.FormData;

  let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?create=1`;
  let { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();

  eventDom.window.document.querySelector('[name="tab"]').value = 'travel';
  eventDom.window.document.querySelector('[name="day"]').value = '31';
  eventDom.window.document.querySelector('[name="label"]').value = 'Oct / Thu';
  eventDom.window.document.querySelector('[name="time"]').value = '09:30 AM — 11:00 AM';
  eventDom.window.document.querySelector('[name="title"]').value = 'Studio Breakfast';
  eventDom.window.document.querySelector('[name="location"]').value = 'Le Marais';
  eventDom.window.document.querySelector('[name="tags"]').value = 'Wool Coat, Notebook';
  eventDom.window.document.querySelector('[data-ct-schedule-event-form]').dispatchEvent(new eventDom.window.Event('submit', { bubbles: true, cancelable: true }));

  const stored = JSON.parse(eventDom.window.localStorage.getItem('ct_schedule'));
  assert.ok(stored, 'Schedule store should be written after create');

  const listDom = new JSDOM(listHtml, { url: 'http://localhost/schedule.html' });
  listDom.window.localStorage.setItem('ct_schedule', JSON.stringify(stored));
  global.window = listDom.window;
  global.document = listDom.window.document;
  global.localStorage = listDom.window.localStorage;
  global.CustomEvent = listDom.window.CustomEvent;
  global.HTMLElement = listDom.window.HTMLElement;
  global.Node = listDom.window.Node;

  modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?create=2`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();
  listDom.window.document.querySelector('[data-tab-key="travel"]').click();

  const titles = Array.from(listDom.window.document.querySelectorAll('.ct-schedule-event__title')).map((node) => node.textContent.trim());
  assert.ok(titles.includes('Studio Breakfast'), 'Created event should appear on schedule overview');
});

runTest('New Schedule Event 页面应通过统一 binding 暴露 sync feedback 与 teardown', async () => {
  const eventHtmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const eventHtml = fs.readFileSync(eventHtmlPath, 'utf8');
  const dom = new JSDOM(eventHtml, { url: 'http://localhost/schedule-event.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.FormData = dom.window.FormData;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?binding=1`;
  const { renderScheduleEventPage } = await import(modulePath);
  const binding = renderScheduleEventPage();

  assert.ok(binding && typeof binding.teardown === 'function', 'Schedule event page should return page binding');

  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

  const syncRoot = dom.window.document.querySelector('[data-ct-sync-feedback-root="schedule-event"]');
  assert.ok(syncRoot, 'Schedule event page should mount sync feedback root');
  assert.ok(syncRoot.querySelector('[data-ct-sync-retry-domain="schedule"]'), 'Schedule event page should expose schedule retry action');

  binding.teardown();
});

runTest('Schedule 页顶部应提供返回 Me 的入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  const backLink = dom.window.document.querySelector('.ct-icon-button[href="me.html"]');
  assert.ok(backLink, 'Missing back link to me.html');
});

runTest('Home 与 Me 应提供进入 Schedule 页的入口', async () => {
  const homeHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const homeDom = new JSDOM(homeHtml, { url: 'http://localhost/index.html' });

  global.window = homeDom.window;
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

  global.window = meDom.window;
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
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  assert.strictEqual(dom.window.document.documentElement.lang, 'zh-CN');
  assert.ok(/本周安排/.test(dom.window.document.body.textContent));
  assert.ok(/即将到来/.test(dom.window.document.body.textContent));
});

runTest('New Schedule Event 页面表单控件应补齐双语占位与 aria 文案并移除图片字段', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule-event.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href;
  const { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();

  assert.strictEqual(dom.window.document.querySelector('[name="day"]').getAttribute('placeholder'), '31');
  assert.strictEqual(dom.window.document.querySelector('[name="title"]').getAttribute('placeholder'), '工作室早餐');
  assert.strictEqual(dom.window.document.querySelector('[name="location"]').getAttribute('aria-label'), '地点');
  assert.strictEqual(dom.window.document.querySelector('[name="tab"]').getAttribute('aria-label'), '分类');
  assert.ok(!dom.window.document.querySelector('[name="image"]'), 'Schedule event form should not expose image field');
});

runTest('New Schedule 空日程时应渲染统一空状态面板', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    users: {
      guest: {
        upcoming: { groups: [] },
        travel: { groups: [] },
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

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?empty=1`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  const emptyPanel = dom.window.document.querySelector('.ct-state-panel[data-state-kind="empty"]');
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
                  image: './images/shared/editorial-look-01.jpg'
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

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?legacy-tags=1`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  assert.ok(/Legacy Event/.test(dom.window.document.body.textContent), 'Schedule should still render legacy event');
});

runTest('New Schedule Event 页面应支持编辑已有事件并在刷新后保留', async () => {
  const eventHtmlPath = path.join(__dirname, '..', 'schedule-event.html');
  const eventHtml = fs.readFileSync(eventHtmlPath, 'utf8');
  const listHtml = fs.readFileSync(path.join(__dirname, '..', 'schedule.html'), 'utf8');
  const dom = new JSDOM(eventHtml, { url: 'http://localhost/schedule-event.html?id=product-review' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?edit=1`;
  let { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();

  assert.strictEqual(dom.window.document.querySelector('[name="title"]').value, 'Product Review', 'Edit form should prefill existing title');
  dom.window.document.querySelector('[name="title"]').value = 'Product Review Updated';
  dom.window.document.querySelector('[name="location"]').value = 'Tribeca Studio';
  dom.window.document.querySelector('[data-ct-schedule-event-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_schedule'));
  const reloadDom = new JSDOM(listHtml, { url: 'http://localhost/schedule.html' });
  reloadDom.window.localStorage.setItem('ct_schedule', JSON.stringify(stored));
  global.window = reloadDom.window;
  global.document = reloadDom.window.document;
  global.localStorage = reloadDom.window.localStorage;
  global.CustomEvent = reloadDom.window.CustomEvent;
  global.HTMLElement = reloadDom.window.HTMLElement;
  global.Node = reloadDom.window.Node;

  modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?edit=2`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  titles = Array.from(reloadDom.window.document.querySelectorAll('.ct-schedule-event__title')).map((node) => node.textContent.trim());
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

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?draft-prefill=1`;
  const { renderScheduleEventPage } = await import(modulePath);
  renderScheduleEventPage();

  assert.strictEqual(dom.window.document.querySelector('[name="title"]').value, 'Midnight Formalism');
  assert.strictEqual(dom.window.document.querySelector('[name="location"]').value, 'ClosetTwin Styling Suite');
  assert.strictEqual(dom.window.document.querySelector('[name="tags"]').value, 'Monochrome, Tailoring, Evening');
  assert.strictEqual(dom.window.document.querySelector('[name="reminderEnabled"]').checked, true);
});

runTest('New Schedule 页面应支持提醒开关并持久化状态', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  let modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?reminder=1`;
  let { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  const toggle = dom.window.document.querySelector('[data-ct-toggle-schedule-reminder="product-review"]');
  assert.ok(toggle, 'Missing schedule reminder toggle');
  assert.strictEqual(toggle.getAttribute('aria-pressed'), 'false');
  toggle.click();

  const nextToggle = dom.window.document.querySelector('[data-ct-toggle-schedule-reminder="product-review"]');
  assert.strictEqual(nextToggle.getAttribute('aria-pressed'), 'true', 'Reminder toggle should update current page state');

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_schedule'));
  const reloadDom = new JSDOM(html, { url: 'http://localhost/schedule.html' });
  reloadDom.window.localStorage.setItem('ct_schedule', JSON.stringify(stored));
  global.window = reloadDom.window;
  global.document = reloadDom.window.document;
  global.localStorage = reloadDom.window.localStorage;
  global.CustomEvent = reloadDom.window.CustomEvent;
  global.HTMLElement = reloadDom.window.HTMLElement;
  global.Node = reloadDom.window.Node;

  modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?reminder=2`;
  ({ renderSchedulePage } = await import(modulePath));
  renderSchedulePage();

  const persistedToggle = reloadDom.window.document.querySelector('[data-ct-toggle-schedule-reminder="product-review"]');
  assert.strictEqual(persistedToggle.getAttribute('aria-pressed'), 'true', 'Reminder toggle should survive page reload');
});

runTest('New Schedule 删除应先打开自定义确认弹层再执行删除', async () => {
  const htmlPath = path.join(__dirname, '..', 'schedule.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/schedule.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'schedulePage.js')).href}?delete-dialog=1`;
  const { renderSchedulePage } = await import(modulePath);
  renderSchedulePage();

  const deleteButton = dom.window.document.querySelector('[data-ct-delete-schedule="product-review"]');
  assert.ok(deleteButton, 'Missing schedule delete button');
  deleteButton.click();

  const dialog = dom.window.document.querySelector('[data-ct-schedule-delete-dialog]');
  assert.ok(dialog, 'Delete should open custom confirmation dialog');
  assert.ok(/Product Review/.test(dialog.textContent), 'Dialog should mention target event title');

  dialog.querySelector('[data-ct-confirm-schedule-delete]').click();
  const titles = Array.from(dom.window.document.querySelectorAll('.ct-schedule-event__title')).map((node) => node.textContent.trim());
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
