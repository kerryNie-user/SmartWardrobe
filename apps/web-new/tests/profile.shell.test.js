const assert = require('assert');
const fs = require('fs');
const path = require('path');
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
  await runTest('New Profile Edit 页面应支持双语编辑、保存并回跳资料页', async () => {
  const htmlPath = path.join(__dirname, '..', 'profile-edit.html');
  assert.ok(fs.existsSync(htmlPath), 'Missing profile-edit.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/profile-edit.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'profileEditPage.js')).href;
  const { renderProfileEditPage } = await import(modulePath);
  renderProfileEditPage();

  assert.strictEqual(dom.window.document.documentElement.lang, 'zh-CN');
  assert.ok(/编辑资料/.test(dom.window.document.body.textContent));

  const avatarInput = dom.window.document.querySelector('#ct-profile-avatar');
  const nameInput = dom.window.document.querySelector('#ct-profile-name');
  const bioInput = dom.window.document.querySelector('#ct-profile-bio');

  avatarInput.value = './images/profile/elara-vance.jpg';
  nameInput.value = 'Astra Lin';
  bioInput.value = '偏好结构化轮廓与冷色面料。';

  dom.window.document.querySelector('[data-ct-profile-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_profile'));
  const storedProfile = stored.users?.guest || stored;
  assert.strictEqual(storedProfile.name, 'Astra Lin');
  assert.strictEqual(storedProfile.bio, '偏好结构化轮廓与冷色面料。');
  assert.strictEqual(dom.window.document.documentElement.getAttribute('data-ct-redirect'), 'profile.html');
  });

  await runTest('New Profile 页面应包含独立档案摘要与收藏预览模块', async () => {
  const htmlPath = path.join(__dirname, '..', 'profile.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/profile.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  dom.window.localStorage.setItem('ct_favorites', JSON.stringify({
    looks: [{ id: 'urban-commute', title: '都市通勤', subtitle: '结构化叠穿方案', image: './images/shared/copenhagen-minimalist.jpg' }],
    posts: [{ id: 'brutalist-basics', title: '现代制服：粗野主义基础款', subtitle: 'ELIAS.VAULT · 2小时前', image: './images/shared/travel-look.jpg' }]
  }));

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'profilePage.js')).href;
  const { renderProfilePage } = await import(modulePath);
  renderProfilePage();

  assert.ok(dom.window.document.querySelector('[data-ct-profile-summary]'), 'Missing profile summary region');
  assert.ok(dom.window.document.querySelector('[data-ct-profile-preview-collection]'), 'Missing profile preview collection');
  assert.ok(/总收藏/.test(dom.window.document.body.textContent), 'Missing favorites metric');
  assert.ok(/都市通勤/.test(dom.window.document.body.textContent), 'Missing saved look preview');
  });

  await runTest('Profile summary 应直接跳转到独立编辑页', async () => {
  const htmlPath = path.join(__dirname, '..', 'profile.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/profile.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'profilePage.js')).href}?edit-gate=1`;
  const { renderProfilePage } = await import(modulePath);
  renderProfilePage();

  const summaryButton = dom.window.document.querySelector('[data-ct-profile-start-edit]');
  assert.ok(summaryButton, 'Missing summary edit button');
  assert.strictEqual(summaryButton.getAttribute('href'), 'profile-edit.html');
  assert.strictEqual(dom.window.document.querySelector('[data-ct-profile-form]'), null, 'Profile page should not render edit form');
  });

  await runTest('Profile Edit 页面输入时应保留当前输入框', async () => {
  const htmlPath = path.join(__dirname, '..', 'profile-edit.html');
  assert.ok(fs.existsSync(htmlPath), 'Missing profile-edit.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/profile-edit.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'profileEditPage.js')).href;
  const { renderProfileEditPage } = await import(modulePath);
  renderProfileEditPage();

  const nameInput = dom.window.document.querySelector('#ct-profile-name');
  nameInput.value = 'Nova Rye';
  nameInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  assert.strictEqual(dom.window.document.querySelector('#ct-profile-name'), nameInput);
  assert.strictEqual(nameInput.value, 'Nova Rye');
  });

  await runTest('Profile 提交按钮应与其他表单主按钮统一为胶囊主操作样式', async () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'profile.css'), 'utf8');
  assert.ok(/\.ct-profile-form__restore,\s*[\r\n]+\s*\.ct-profile-form__submit[\s\S]*border-radius:\s*999px/.test(css), 'Profile actions should use pill radius');
  assert.ok(/\.ct-profile-form__restore,\s*[\r\n]+\s*\.ct-profile-form__submit[\s\S]*text-transform:\s*uppercase/.test(css), 'Profile actions should use uppercase button language');
  assert.ok(/\.ct-profile-form__submit[\s\S]*linear-gradient/.test(css), 'Profile submit should keep highlighted gradient');
  });

  await runTest('Profile 顶部当前页伪按钮应改为空占位壳', async () => {
  const htmlPath = path.join(__dirname, '..', 'profile.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/profile.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'profilePage.js')).href}?placeholder=1`;
  const { renderProfilePage } = await import(modulePath);
  renderProfilePage();

  const placeholder = dom.window.document.querySelector('.ct-topbar .ct-icon-button.is-placeholder');
  assert.ok(placeholder, 'Profile topbar should render placeholder shell');
  assert.strictEqual(placeholder.textContent.trim(), '');
  });

  await runTest('Profile Edit 顶部应提供返回资料页的真实入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'profile-edit.html');
  assert.ok(fs.existsSync(htmlPath), 'Missing profile-edit.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/profile-edit.html' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'profileEditPage.js')).href}?back-link=1`;
  const { renderProfileEditPage } = await import(modulePath);
  renderProfileEditPage();

  const backLink = dom.window.document.querySelector('.ct-icon-button[href="profile.html"]');
  assert.ok(backLink, 'Profile edit page should provide back link to profile.html');
  });

  await runTest('已保存资料应回显到 Me 与 Settings', async () => {
  const meHtmlPath = path.join(__dirname, '..', 'me.html');
  const meHtml = fs.readFileSync(meHtmlPath, 'utf8');
  const meDom = new JSDOM(meHtml, { url: 'http://localhost/me.html' });

  meDom.window.localStorage.setItem('app_locale', 'zh-CN');
  meDom.window.localStorage.setItem('ct_profile', JSON.stringify({
    name: 'Astra Lin',
    bio: '偏好结构化轮廓与冷色面料。',
    avatar: './images/profile/elara-vance.jpg'
  }));

  global.window = meDom.window;
  global.document = meDom.window.document;
  global.localStorage = meDom.window.localStorage;
  global.CustomEvent = meDom.window.CustomEvent;
  global.HTMLElement = meDom.window.HTMLElement;
  global.Node = meDom.window.Node;

  let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'mePage.js')).href;
  let { renderMePage } = await import(modulePath);
  renderMePage();

  assert.ok(/Astra Lin/.test(meDom.window.document.body.textContent));
  assert.ok(/偏好结构化轮廓与冷色面料。/.test(meDom.window.document.body.textContent));

  const settingsHtmlPath = path.join(__dirname, '..', 'settings.html');
  const settingsHtml = fs.readFileSync(settingsHtmlPath, 'utf8');
  const settingsDom = new JSDOM(settingsHtml, { url: 'http://localhost/settings.html' });

  settingsDom.window.localStorage.setItem('app_locale', 'zh-CN');
  settingsDom.window.localStorage.setItem('ct_profile', JSON.stringify({
    name: 'Astra Lin',
    bio: '偏好结构化轮廓与冷色面料。',
    avatar: './images/profile/elara-vance.jpg'
  }));

  global.window = settingsDom.window;
  global.document = settingsDom.window.document;
  global.localStorage = settingsDom.window.localStorage;
  global.CustomEvent = settingsDom.window.CustomEvent;
  global.HTMLElement = settingsDom.window.HTMLElement;
  global.Node = settingsDom.window.Node;

  modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href;
  const { renderSettingsPage } = await import(modulePath);
  renderSettingsPage();

  assert.ok(/Astra Lin/.test(settingsDom.window.document.body.textContent));
  assert.ok(/偏好结构化轮廓与冷色面料。/.test(settingsDom.window.document.body.textContent));
  });
}

main();
