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
  await runTest('New Login 与 Register 页面应包含关键壳层', async () => {
    for (const page of ['login.html', 'register.html']) {
      const htmlPath = path.join(__dirname, '..', page);
      const html = fs.readFileSync(htmlPath, 'utf8');
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      ['#app', '[data-ct-auth-shell]', '[data-ct-auth-form]'].forEach((selector) => {
        assert.ok(doc.querySelector(selector), `Missing selector: ${selector} in ${page}`);
      });
    }
  });

  await runTest('New Register 页面应建立登录会话', async () => {
    const htmlPath = path.join(__dirname, '..', 'register.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/register.html?redirect=wardrobe.html' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;
    global.fetch = async () => ({
      ok: true,
      status: 201,
      headers: {
        get(name) {
          return name.toLowerCase() === 'content-type' ? 'application/json' : null;
        }
      },
      async json() {
        return {
          user: {
            id: 'user-1',
            name: 'Nova Lane',
            emailOrMobile: 'nova@example.com',
            avatar: './images/profile/elara-vance.jpg',
            bio: ''
          }
        };
      }
    });
    dom.window.fetch = global.fetch;

    const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'registerPage.js')).href;
    const { renderRegisterPage } = await import(modulePath);
    renderRegisterPage();

    dom.window.document.querySelector('[name="name"]').value = 'Nova Lane';
    dom.window.document.querySelector('[name="emailOrMobile"]').value = 'nova@example.com';
    dom.window.document.querySelector('[name="password"]').value = 'secret123';
    dom.window.document.querySelector('[data-ct-auth-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const session = JSON.parse(dom.window.localStorage.getItem('ct_auth_session'));
    assert.ok(session, 'Missing auth session');
    assert.strictEqual(session.user.name, 'Nova Lane');
  });

  await runTest('New 受保护页入口脚本应默认建立调试登录会话', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe.html' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'wardrobe.js')).href}?guard=1`;
    await import(modulePath);

    const session = JSON.parse(dom.window.localStorage.getItem('ct_auth_session'));
    assert.ok(session, 'Missing debug auth session');
    assert.strictEqual(session.user.emailOrMobile, 'api-nova@example.com');
    assert.strictEqual(dom.window.document.documentElement.getAttribute('data-ct-redirect'), null);
  });

  await runTest('New Settings 页面应支持退出并清理登录态', async () => {
    const htmlPath = path.join(__dirname, '..', 'settings.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/settings.html' });

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));
    dom.window.localStorage.setItem('currentUser', JSON.stringify({ name: 'Nova Lane' }));
    dom.window.localStorage.setItem('isLoggedIn', 'true');
    dom.window.localStorage.setItem('ct_profile', JSON.stringify({ name: 'Nova Lane', bio: 'Profile should persist' }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'settingsPage.js')).href;
    const { renderSettingsPage } = await import(modulePath);
    renderSettingsPage();

    dom.window.document.querySelector('[data-settings-action="logout"]').click();

    assert.strictEqual(dom.window.localStorage.getItem('ct_auth_session'), null);
    assert.strictEqual(dom.window.localStorage.getItem('currentUser'), null);
    assert.strictEqual(dom.window.localStorage.getItem('isLoggedIn'), null);
    assert.notStrictEqual(dom.window.localStorage.getItem('ct_profile'), null);
  });
}

main();
