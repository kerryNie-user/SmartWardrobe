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
  await runTest('New Wardrobe Item 页面应通过统一 binding 暴露 sync feedback 与 teardown', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-item.html' });
    dom.window.localStorage.setItem('app_locale', 'zh-CN');

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href}?binding=1`;
    const { renderWardrobeItemPage } = await import(modulePath);
    const binding = renderWardrobeItemPage();

    assert.ok(binding && typeof binding.teardown === 'function', 'Wardrobe item page should return page binding');

    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const syncRoot = dom.window.document.querySelector('[data-ct-sync-feedback-root="wardrobe-item"]');
    assert.ok(syncRoot, 'Wardrobe item page should mount sync feedback root');
    assert.ok(syncRoot.querySelector('[data-ct-sync-retry-domain="wardrobe"]'), 'Wardrobe item page should expose wardrobe retry action');

    binding.teardown();
  });

  await runTest('New Wardrobe Detail 页面应通过统一 binding 暴露 sync feedback 与 teardown', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-detail.html?id=missing-item' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeDetailPage.js')).href}?binding=1`;
    const { renderWardrobeDetailPage } = await import(modulePath);
    const binding = renderWardrobeDetailPage();

    assert.ok(binding && typeof binding.teardown === 'function', 'Wardrobe detail page should return page binding');

    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const syncRoot = dom.window.document.querySelector('[data-ct-sync-feedback-root="wardrobe-detail"]');
    assert.ok(syncRoot, 'Wardrobe detail page should mount sync feedback root');
    assert.ok(syncRoot.querySelector('[data-ct-sync-retry-domain="wardrobe"]'), 'Wardrobe detail page should expose wardrobe retry action');

    binding.teardown();
  });

  await runTest('New Wardrobe Item 页面应包含独立 Add/Edit 壳层', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    ['#app', '[data-ct-topbar]', '[data-ct-wardrobe-item-shell]'].forEach((selector) => {
      assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
    });
  });

  await runTest('New Wardrobe Item 页面初始状态不应渲染空 src 预览图', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-item.html' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href}?initial-preview=1`;
    const { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    assert.strictEqual(dom.window.document.querySelector('[data-ct-wardrobe-image-preview]'), null);
  });

  await runTest('New Wardrobe Item 页面应支持上传照片并保存识别结果', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-item.html' });
    dom.window.localStorage.setItem('app_locale', 'zh-CN');

    class FakeFileReader {
      readAsDataURL() {
        this.result = 'data:image/png;base64,preview-image';
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: this.result } });
        }
      }
    }

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;
    global.FileReader = FakeFileReader;
    dom.window.FileReader = FakeFileReader;

    let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href;
    let { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    const fileInput = dom.window.document.querySelector('[name="imageFile"]');
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'archive-coat.png', type: 'image/png', size: 18 }]
    });
    fileInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    dom.window.document.querySelector('form[data-ct-wardrobe-item-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
    const storedItems = stored.users?.guest || stored;
    assert.strictEqual(storedItems[0].title, '待识别单品');
    assert.strictEqual(storedItems[0].category, '未分类');
    assert.strictEqual(storedItems[0].aiJson.status, 'unavailable');
  });

  await runTest('New Wardrobe Item 页面应支持编辑模式替换照片并保留识别字段', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-item.html?id=trench-001' });

    class FakeFileReader {
      readAsDataURL() {
        this.result = 'data:image/png;base64,preview-image';
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: this.result } });
        }
      }
    }

    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify([
      {
        id: 'trench-001',
        category: 'Outerwear',
        title: 'Wool Trench',
        size: 'M',
        color: 'Camel',
        material: 'Wool',
        image: '/uploads/wardrobe/wool-trench.jpg',
        filter: 'outerwear',
        favorite: true
      }
    ]));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;
    global.FileReader = FakeFileReader;
    dom.window.FileReader = FakeFileReader;

    let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href;
    let { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    const fileInput = dom.window.document.querySelector('[name="imageFile"]');
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'wool-trench-updated.png', type: 'image/png', size: 21 }]
    });
    fileInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    dom.window.document.querySelector('form[data-ct-wardrobe-item-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
    const storedItems = stored.users?.guest || stored;
    assert.strictEqual(storedItems[0].id, 'trench-001');
    assert.strictEqual(storedItems[0].title, 'Wool Trench');
    assert.ok(storedItems[0].image.includes('preview-image') || storedItems[0].image.includes('data:image/png;base64'), 'Updated image should be saved');
  });

  await runTest('New Wardrobe Item 页面应支持本地上传预览并保存', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-item.html' });

    class FakeFileReader {
      readAsDataURL() {
        this.result = 'data:image/png;base64,preview-image';
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: this.result } });
        }
      }
    }

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.FormData = dom.window.FormData;
    global.FileReader = FakeFileReader;
    dom.window.FileReader = FakeFileReader;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href}?upload=1`;
    const { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    const fileInput = dom.window.document.querySelector('[name="imageFile"]');
    assert.ok(fileInput, 'Missing wardrobe upload input');
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'preview.png', type: 'image/png' }]
    });
    fileInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const preview = dom.window.document.querySelector('[data-ct-wardrobe-image-preview]');
    assert.ok(preview, 'Missing wardrobe upload preview');
    assert.strictEqual(preview.getAttribute('src'), 'data:image/png;base64,preview-image');

    dom.window.document.querySelector('form[data-ct-wardrobe-item-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
    const storedItems = stored.users?.guest || stored;
    assert.strictEqual(storedItems[0].image, 'data:image/png;base64,preview-image');
  });
}

main();
