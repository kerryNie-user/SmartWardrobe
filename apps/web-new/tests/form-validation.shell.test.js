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

function createDom(htmlFile, url) {
  const html = fs.readFileSync(path.join(__dirname, '..', htmlFile), 'utf8');
  return new JSDOM(html, { url });
}

async function main() {
  await runTest('Schedule Event 空标题提交应展示校验提示', async () => {
    const dom = createDom('schedule-event.html', 'http://localhost/schedule-event.html');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'scheduleEventPage.js')).href}?validation=1`;
    const { renderScheduleEventPage } = await import(modulePath);
    renderScheduleEventPage();

    dom.window.document.querySelector('[name="title"]').value = '';
    dom.window.document.querySelector('[data-ct-schedule-event-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const notice = dom.window.document.querySelector('[data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/title/i.test(notice.textContent), 'Expected title validation message');
  });

  await runTest('Wardrobe Item 空标题提交应展示校验提示', async () => {
    const dom = createDom('wardrobe-item.html', 'http://localhost/wardrobe-item.html');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href}?validation=2`;
    const { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    dom.window.document.querySelector('[name="title"]').value = '';
    dom.window.document.querySelector('[data-ct-wardrobe-item-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const notice = dom.window.document.querySelector('[data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/title/i.test(notice.textContent), 'Expected title validation message');
  });

  await runTest('Wardrobe Item 带未知 id 时应提示并阻止提交', async () => {
    const dom = createDom('wardrobe-item.html', 'http://localhost/wardrobe-item.html?id=missing-item');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href}?validation=3`;
    const { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    const notice = dom.window.document.querySelector('[data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/not found|missing|不存在/i.test(notice.textContent), 'Expected missing item message');

    const submit = dom.window.document.querySelector('.ct-wardrobe-form__submit');
    assert.ok(submit, 'Missing submit button');
    assert.strictEqual(submit.disabled, true, 'Submit should be disabled when item id is invalid');
  });

  await runTest('Wardrobe Quick Add 空标题提交应展示校验提示', async () => {
    const dom = createDom('wardrobe.html', 'http://localhost/wardrobe.html');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobePage.js')).href}?validation=4`;
    const { renderWardrobePage } = await import(modulePath);
    renderWardrobePage();

    dom.window.document.querySelector('[data-ct-add-wardrobe]').click();
    dom.window.document.querySelector('[data-ct-wardrobe-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const notice = dom.window.document.querySelector('[data-ct-wardrobe-form] [data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/title/i.test(notice.textContent), 'Expected title validation message');
  });

  await runTest('Login 空账号提交应展示校验提示', async () => {
    const dom = createDom('login.html', 'http://localhost/login.html');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'loginPage.js')).href}?validation=5`;
    const { renderLoginPage } = await import(modulePath);
    renderLoginPage();

    dom.window.document.querySelector('[data-ct-auth-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const notice = dom.window.document.querySelector('[data-ct-auth-form] [data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/email|mobile/i.test(notice.textContent), 'Expected required account message');
  });

  await runTest('Register 空账号提交应展示校验提示', async () => {
    const dom = createDom('register.html', 'http://localhost/register.html');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'registerPage.js')).href}?validation=6`;
    const { renderRegisterPage } = await import(modulePath);
    renderRegisterPage();

    dom.window.document.querySelector('[data-ct-auth-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const notice = dom.window.document.querySelector('[data-ct-auth-form] [data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/name|email|mobile/i.test(notice.textContent), 'Expected required fields message');
  });

  await runTest('Profile Edit 空名称提交应展示校验提示', async () => {
    const dom = createDom('profile-edit.html', 'http://localhost/profile-edit.html');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'profileEditPage.js')).href}?validation=7`;
    const { renderProfileEditPage } = await import(modulePath);
    renderProfileEditPage();

    dom.window.document.querySelector('[name="name"]').value = '';
    dom.window.document.querySelector('[data-ct-profile-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const notice = dom.window.document.querySelector('[data-ct-profile-form] [data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/name/i.test(notice.textContent), 'Expected name validation message');
  });

  await runTest('Post Comment 空内容提交应展示校验提示', async () => {
    const dom = createDom('post-detail.html', 'http://localhost/post-detail.html?id=brutalist-basics');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'postDetailPage.js')).href}?validation=8`;
    const { renderPostDetailPage } = await import(modulePath);
    renderPostDetailPage();

    dom.window.document.querySelector('[data-ct-post-comment-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const notice = dom.window.document.querySelector('[data-ct-post-comment-form] [data-ct-form-notice]');
    assert.ok(notice, 'Missing form notice root');
    assert.ok(/comment/i.test(notice.textContent), 'Expected comment validation message');
  });
}

main();
