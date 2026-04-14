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
  await runTest('New Wardrobe Item 页面应包含独立 Add/Edit 壳层', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    ['#app', '[data-ct-topbar]', '[data-ct-wardrobe-item-shell]'].forEach((selector) => {
      assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
    });
  });

  await runTest('New Wardrobe Item 页面应支持新增模式保存到 store', async () => {
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

    let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href;
    let { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    dom.window.document.querySelector('[name="title"]').value = 'Archive Coat';
    dom.window.document.querySelector('[name="category"]').value = 'Outerwear';
    dom.window.document.querySelector('[name="filter"]').value = 'outerwear';
    dom.window.document.querySelector('[name="size"]').value = 'L';
    dom.window.document.querySelector('[name="color"]').value = 'Ink';
    dom.window.document.querySelector('[name="material"]').value = 'Wool';
    dom.window.document.querySelector('[name="image"]').value = './images/wardrobe/wool-trench.jpg';
    dom.window.document.querySelector('form[data-ct-wardrobe-item-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
    const storedItems = stored.users?.guest || stored;
    assert.ok(storedItems.some((item) => item.title === 'Archive Coat'), 'New wardrobe item should be saved');
  });

  await runTest('New Wardrobe Item 页面应支持编辑模式回填并覆盖原数据', async () => {
    const htmlPath = path.join(__dirname, '..', 'wardrobe-item.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/wardrobe-item.html?id=trench-001' });

    dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify([
      {
        id: 'trench-001',
        category: 'Outerwear',
        title: 'Wool Trench',
        size: 'M',
        color: 'Camel',
        material: 'Wool',
        image: './images/wardrobe/wool-trench.jpg',
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

    let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'wardrobeItemPage.js')).href;
    let { renderWardrobeItemPage } = await import(modulePath);
    renderWardrobeItemPage();

    assert.strictEqual(dom.window.document.querySelector('[name="title"]').value, 'Wool Trench');

    dom.window.document.querySelector('[name="title"]').value = 'Wool Trench Updated';
    dom.window.document.querySelector('form[data-ct-wardrobe-item-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
    const storedItems = stored.users?.guest || stored;
    assert.strictEqual(storedItems[0].title, 'Wool Trench Updated');
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

    const preview = dom.window.document.querySelector('[data-ct-wardrobe-image-preview]');
    assert.ok(preview, 'Missing wardrobe upload preview');
    assert.strictEqual(preview.getAttribute('src'), 'data:image/png;base64,preview-image');

    dom.window.document.querySelector('[name="title"]').value = 'Upload Look';
    dom.window.document.querySelector('form[data-ct-wardrobe-item-form]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_wardrobe'));
    const storedItems = stored.users?.guest || stored;
    assert.strictEqual(storedItems[0].image, 'data:image/png;base64,preview-image');
  });
}

main();
