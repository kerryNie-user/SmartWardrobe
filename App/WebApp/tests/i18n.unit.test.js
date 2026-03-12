const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

function runTest(name, fn) {
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.then(
        () => process.stdout.write(`PASS ${name}\n`),
        (err) => {
          process.stderr.write(`FAIL ${name}\n`);
          process.stderr.write(`${err && err.stack ? err.stack : String(err)}\n`);
          process.exitCode = 1;
        }
      );
    }
    process.stdout.write(`PASS ${name}\n`);
  } catch (err) {
    process.stderr.write(`FAIL ${name}\n`);
    process.stderr.write(`${err && err.stack ? err.stack : String(err)}\n`);
    process.exitCode = 1;
  }
}

function hasLatinLetters(value) {
  return /[A-Za-z]/.test(value);
}

function collectTextNodes(root) {
  const out = [];
  const walker = root.ownerDocument.createTreeWalker(root, root.ownerDocument.defaultView.NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parentTag = node.parentElement ? node.parentElement.tagName : '';
    if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'NOSCRIPT') {
      out.push(node);
    }
    node = walker.nextNode();
  }
  return out;
}

runTest('HTML 模板不应包含裸露英文可见文本', () => {
  const webRoot = path.join(__dirname, '..');
  const pages = ['index.html', 'wardrobe.html', 'profile.html', 'login.html', 'register.html'];

  for (const page of pages) {
    const html = fs.readFileSync(path.join(webRoot, page), 'utf8');
    const dom = new JSDOM(html);

    const doc = dom.window.document;
    const textNodes = collectTextNodes(doc.documentElement);
    for (const n of textNodes) {
      const text = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (hasLatinLetters(text)) {
        throw new Error(`Found visible English text in ${page}: "${text}"`);
      }
    }

    const attrNames = ['placeholder', 'aria-label', 'title', 'alt'];
    const elements = Array.from(doc.querySelectorAll('*'));
    for (const el of elements) {
      for (const attr of attrNames) {
        const v = el.getAttribute(attr);
        if (!v) continue;
        const val = String(v).trim();
        if (!val) continue;
        if (hasLatinLetters(val)) {
          throw new Error(`Found English in attribute ${attr} in ${page}: <${el.tagName.toLowerCase()}> ${attr}="${val}"`);
        }
      }
    }
  }
});

runTest('en-US.json 与 zh-CN.json 的 key 集合必须完全一致', () => {
  const webRoot = path.join(__dirname, '..');
  const en = JSON.parse(fs.readFileSync(path.join(webRoot, 'en-US.json'), 'utf8'));
  const zh = JSON.parse(fs.readFileSync(path.join(webRoot, 'zh-CN.json'), 'utf8'));

  const enKeys = Object.keys(en).sort();
  const zhKeys = Object.keys(zh).sort();

  assert.deepStrictEqual(zhKeys, enKeys);
});

runTest('i18n 接口 500 时应回退到静态 JSON', async () => {
  const webRoot = path.join(__dirname, '..');
  const en = JSON.parse(fs.readFileSync(path.join(webRoot, 'en-US.json'), 'utf8'));
  const i18nSource = fs.readFileSync(path.join(webRoot, 'js', 'i18n.js'), 'utf8');

  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'dangerously'
  });

  dom.window.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith('/api/i18n')) {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    if (u.endsWith('en-US.json')) {
      return { ok: true, status: 200, json: async () => en };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  dom.window.eval(i18nSource);
  await dom.window.i18n.load('en-US');
  assert.strictEqual(dom.window.t('nav.home'), en['nav.home']);
});

runTest('i18n 接口 404/500 时应回退到缓存', async () => {
  const webRoot = path.join(__dirname, '..');
  const en = JSON.parse(fs.readFileSync(path.join(webRoot, 'en-US.json'), 'utf8'));
  const i18nSource = fs.readFileSync(path.join(webRoot, 'js', 'i18n.js'), 'utf8');

  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'dangerously'
  });

  dom.window.localStorage.setItem('i18n_pack_en-US', JSON.stringify(en));
  dom.window.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith('/api/i18n')) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return { ok: false, status: 500, json: async () => ({}) };
  };

  dom.window.eval(i18nSource);
  await dom.window.i18n.load('en-US');
  assert.strictEqual(dom.window.t('nav.home'), en['nav.home']);
});
