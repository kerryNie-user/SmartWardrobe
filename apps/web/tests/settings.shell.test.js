const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('New Settings 页面应包含第一阶段关键区域', () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const selectors = [
    '#app',
    '[data-ct-topbar]',
    '[data-ct-settings-profile]',
    '[data-ct-settings-panel]',
    '[data-ct-bottom-nav]'
  ];

  for (const selector of selectors) {
    assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
  }
});

runTest('New Settings 页面应改为单面板控制台并移除 tabs', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href;
  const { renderSettingsPage } = await import(modulePath);

  renderSettingsPage();

  const initialHeading = dom.window.document.querySelector('.ct-settings-panel__heading');
  assert.ok(initialHeading, 'Missing settings heading');
  assert.ok(/Settings|设置|Preferences|偏好/.test(initialHeading.textContent));
  assert.strictEqual(dom.window.document.querySelector('[data-ct-settings-tabs]'), null, 'Settings page should not render tabs');

  const panelList = dom.window.document.querySelector('.ct-settings-panel__content');
  assert.ok(panelList, 'Missing settings content list');
  assert.ok(panelList.matches('ul'), 'Settings content should use ul');
});

runTest('Me 页面应提供进入 Settings 页的入口', async () => {
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

  const topbarLink = meDom.window.document.querySelector('.ct-icon-button[href="settings.html"]');
  const summaryLink = meDom.window.document.querySelector('[data-ct-me-entry="settings"]');

  assert.ok(topbarLink, 'Missing topbar settings link');
  assert.ok(summaryLink, 'Missing settings dashboard link');
  assert.strictEqual(summaryLink.getAttribute('href'), 'settings.html');
});

runTest('Settings 页顶部返回应指向 Me', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  const backLink = dom.window.document.querySelector('.ct-icon-button[href="me.html"]');
  assert.ok(backLink, 'Missing back link to me.html');
});

runTest('Settings 页面按钮应支持纯前端点击反馈', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  const toggle = dom.window.document.querySelector('[data-settings-toggle]');
  assert.ok(toggle, 'Missing settings toggle');
  const initialPressed = toggle.getAttribute('aria-pressed');
  toggle.click();
  const updatedToggle = dom.window.document.querySelector('[data-settings-toggle]');
  assert.notStrictEqual(updatedToggle.getAttribute('aria-pressed'), initialPressed, 'Toggle should change visual state');

  const choice = Array.from(dom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /Light/i.test(node.textContent));
  assert.ok(choice, 'Missing choice option');
  choice.click();
  const updatedChoice = Array.from(dom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /Light/i.test(node.textContent));
  assert.ok(updatedChoice.classList.contains('is-active'), 'Clicked choice should become active');
});

runTest('Settings 页面应支持语言切换并持久化 locale', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  const cnChoice = Array.from(dom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /CN|中文/i.test(node.textContent));
  assert.ok(cnChoice, 'Missing CN language choice');
  cnChoice.click();

  assert.strictEqual(dom.window.localStorage.getItem('app_locale'), 'zh-CN');
  assert.ok(/个人信息/.test(dom.window.document.querySelector('.ct-settings-profile .ct-eyebrow').textContent));
  assert.ok(/偏好控制台|个人信息|当前设置/.test(dom.window.document.body.textContent), 'Settings page should switch visible copy');
});

runTest('Settings 页面切换语言后应立即刷新底部托盘', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?bottom-nav-locale=1`;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  assert.ok(/Home/.test(dom.window.document.querySelector('.ct-bottom-nav').textContent));

  Array.from(dom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /CN|中文/.test(node.textContent)).click();

  assert.ok(/首页/.test(dom.window.document.querySelector('.ct-bottom-nav').textContent), 'Bottom nav should update immediately after locale switch');
});

runTest('Settings 顶部假按钮应改为空占位壳', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?placeholder=1`;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  const placeholder = dom.window.document.querySelector('.ct-topbar .ct-icon-button.is-placeholder');
  assert.ok(placeholder, 'Settings topbar should render placeholder shell');
  assert.strictEqual(placeholder.textContent.trim(), '');
});

runTest('Settings 页面应持久化主题、衣橱布局与温度单位并在刷新后回显', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?settings-persist=1`;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  Array.from(dom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /Light|浅色/.test(node.textContent)).click();
  Array.from(dom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /List|列表/.test(node.textContent)).click();
  Array.from(dom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /°F|华氏/.test(node.textContent)).click();

  assert.strictEqual(dom.window.localStorage.getItem('app_theme'), 'light');
  assert.strictEqual(dom.window.localStorage.getItem('wardrobe_display_mode'), 'list');
  assert.strictEqual(dom.window.localStorage.getItem('temperature_unit'), 'fahrenheit');
  assert.strictEqual(dom.window.document.documentElement.getAttribute('data-ct-theme'), 'light');

  const reloadedDom = new JSDOM(html, { url: 'http://localhost/settings.html' });
  reloadedDom.window.localStorage.setItem('app_theme', 'light');
  reloadedDom.window.localStorage.setItem('wardrobe_display_mode', 'list');
  reloadedDom.window.localStorage.setItem('temperature_unit', 'fahrenheit');

  global.window = reloadedDom.window;
  global.document = reloadedDom.window.document;
  global.localStorage = reloadedDom.window.localStorage;
  global.CustomEvent = reloadedDom.window.CustomEvent;
  global.HTMLElement = reloadedDom.window.HTMLElement;
  global.Node = reloadedDom.window.Node;

  const reloadModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?settings-persist=2`;
  const { renderSettingsPage: renderReloadedSettingsPage } = await import(reloadModulePath);
  renderReloadedSettingsPage();

  assert.ok(Array.from(reloadedDom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /Light|浅色/.test(node.textContent)).classList.contains('is-active'));
  assert.ok(Array.from(reloadedDom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /List|列表/.test(node.textContent)).classList.contains('is-active'));
  assert.ok(Array.from(reloadedDom.window.document.querySelectorAll('[data-settings-choice]')).find((node) => /°F|华氏/.test(node.textContent)).classList.contains('is-active'));
  assert.strictEqual(reloadedDom.window.document.documentElement.getAttribute('data-ct-theme'), 'light');
});

runTest('Settings 页面应持久化隐私与通知开关并在刷新后回显', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?settings-toggle=1`;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  dom.window.document.querySelector('[data-settings-toggle="public-profile"]').click();
  dom.window.document.querySelector('[data-settings-toggle="outfit-reminders"]').click();

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_settings'));
  const storedSettings = stored.users?.guest || stored;
  assert.strictEqual(storedSettings['public-profile'], false);
  assert.strictEqual(storedSettings['outfit-reminders'], false);

  const reloadedDom = new JSDOM(html, { url: 'http://localhost/settings.html' });
  reloadedDom.window.localStorage.setItem('ct_settings', JSON.stringify({
    version: 1,
    users: {
      guest: {
        'public-profile': false,
        'outfit-reminders': false
      }
    }
  }));

  global.window = reloadedDom.window;
  global.document = reloadedDom.window.document;
  global.localStorage = reloadedDom.window.localStorage;
  global.CustomEvent = reloadedDom.window.CustomEvent;
  global.HTMLElement = reloadedDom.window.HTMLElement;
  global.Node = reloadedDom.window.Node;

  const reloadModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?settings-toggle=2`;
  const { renderSettingsPage: renderReloadedSettingsPage } = await import(reloadModulePath);
  renderReloadedSettingsPage();

  assert.strictEqual(reloadedDom.window.document.querySelector('[data-settings-toggle="public-profile"]').getAttribute('aria-pressed'), 'false');
  assert.strictEqual(reloadedDom.window.document.querySelector('[data-settings-toggle="outfit-reminders"]').getAttribute('aria-pressed'), 'false');
});

runTest('Settings 页面应移除 analytics-sharing 与 style-alerts 并统一左右布局', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?settings-single-panel=1`;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  assert.strictEqual(dom.window.document.querySelector('[data-settings-toggle="analytics-sharing"]'), null);
  assert.strictEqual(dom.window.document.querySelector('[data-settings-toggle="style-alerts"]'), null);

  const firstItem = dom.window.document.querySelector('.ct-settings-item');
  assert.ok(firstItem, 'Missing settings item');
  assert.ok(firstItem.querySelector('.ct-settings-item__label'), 'Settings item should keep left label');
  assert.ok(firstItem.querySelector('.ct-settings-item__control'), 'Settings item should keep right control');
});

runTest('Settings 退出登录应移除左侧标题并显示居中红色按钮', async () => {
  const htmlPath = path.join(__dirname, '..', 'settings.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href}?settings-logout=1`;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  const logoutRow = dom.window.document.querySelector('.ct-settings-action');
  assert.ok(logoutRow, 'Missing logout action row');
  assert.strictEqual(logoutRow.querySelector('.ct-settings-choice__label'), null, 'Logout row should not render left label');
  const logoutButton = logoutRow.querySelector('[data-settings-action="logout"]');
  assert.ok(logoutButton, 'Missing logout button');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'settings.css'), 'utf8');
  assert.ok(/\.ct-settings-action__button[\s\S]*color:\s*#/.test(css), 'Logout button should define explicit text color');
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
