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

function createJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'application/json' : null;
      }
    },
    async json() {
      return payload;
    }
  };
}

async function main() {
  await runTest('New Outfit Detail 页面应包含关键挂载区域', async () => {
    const htmlPath = path.join(__dirname, '..', 'outfit-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    ['#app', '[data-ct-topbar]', '[data-ct-outfit-detail]'].forEach((selector) => {
      assert.ok(doc.querySelector(selector), `Missing selector: ${selector}`);
    });
  });

  await runTest('New Outfit Detail 页面应根据 id 渲染穿搭详情并支持回退', async () => {
    const htmlPath = path.join(__dirname, '..', 'outfit-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/outfit-detail.html?id=midnight-formalism' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    let modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'outfitDetailPage.js')).href;
    let { renderOutfitDetailPage } = await import(modulePath);
    renderOutfitDetailPage();

    assert.ok(/Midnight Formalism/.test(dom.window.document.body.textContent));
    assert.ok(dom.window.document.querySelector('[data-ct-outfit-save]'), 'Missing outfit save button');

    const fallbackDom = new JSDOM(html, { url: 'http://localhost/outfit-detail.html' });
    global.window = fallbackDom.window;
    global.document = fallbackDom.window.document;
    global.localStorage = fallbackDom.window.localStorage;
    global.CustomEvent = fallbackDom.window.CustomEvent;
    global.HTMLElement = fallbackDom.window.HTMLElement;
    global.Node = fallbackDom.window.Node;

    modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'outfitDetailPage.js')).href}?fallback=1`;
    ({ renderOutfitDetailPage } = await import(modulePath));
    renderOutfitDetailPage();

    assert.ok(/Urban Commute/.test(fallbackDom.window.document.body.textContent));
  });

  await runTest('Outfit Detail 内容应复用 ClosetTwin model2 推荐 look', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost:8140/outfit-detail.html?id=model2-look'
    });
    dom.window.fetch = async () => createJsonResponse({
      ok: true,
      status: 'ready',
      data: {
        recommendations: [
          {
            outfitId: 'model2-look',
            outfitName: 'Model2 Look',
            reason: 'Picked for tomorrow flight',
            imageUrl: '/uploads/shared/travel-look.jpg',
            tags: ['Travel'],
            items: [
              { name: 'Rain Trench', category: 'Outerwear', color: 'Onyx', material: 'Wool Blend' }
            ]
          }
        ]
      },
      error: null
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;

    const recommendationsPath = pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'closetTwinRecommendations.js')).href;
    const { hydrateClosetTwinRecommendations } = await import(recommendationsPath);
    await hydrateClosetTwinRecommendations({ wardrobe: { totalCount: 1 } });

    const detailPath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'data', 'outfitDetail.js')).href}?model2=1`;
    const { getOutfitDetailContent } = await import(detailPath);
    const detail = getOutfitDetailContent('en-US', 'model2-look', {});

    assert.strictEqual(detail.activeLook.id, 'model2-look');
    assert.strictEqual(detail.activeLook.title, 'Model2 Look');
    assert.strictEqual(detail.activeLook.source, 'closettwin-model2');
    assert.strictEqual(detail.activeLook.breakdown[0].title, 'Rain Trench');
  });

  await runTest('New Outfit Detail 页面应支持继续收藏并更新保存状态', async () => {
    const htmlPath = path.join(__dirname, '..', 'outfit-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/outfit-detail.html?id=midnight-formalism' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'outfitDetailPage.js')).href}?favorite=1`;
    const { renderOutfitDetailPage } = await import(modulePath);
    renderOutfitDetailPage();

    const saveButton = dom.window.document.querySelector('[data-ct-outfit-save]');
    assert.ok(saveButton, 'Missing outfit save button');
    saveButton.click();

    const nextSaveButton = dom.window.document.querySelector('[data-ct-outfit-save]');
    assert.strictEqual(nextSaveButton.getAttribute('aria-pressed'), 'true', 'Save state should toggle after click');

    const stored = JSON.parse(dom.window.localStorage.getItem('ct_favorites'));
    assert.ok(JSON.stringify(stored).includes('midnight-formalism'), 'Outfit should be written to favorites store');
  });

  await runTest('New Outfit Detail 页面应支持加入日程并写入 outfit schedule draft', async () => {
    const htmlPath = path.join(__dirname, '..', 'outfit-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/outfit-detail.html?id=midnight-formalism' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'outfitDetailPage.js')).href}?draft=1`;
    const { renderOutfitDetailPage } = await import(modulePath);
    renderOutfitDetailPage();

    const addToScheduleButton = dom.window.document.querySelector('[data-ct-outfit-add-to-schedule]');
    assert.ok(addToScheduleButton, 'Missing add to schedule button');
    addToScheduleButton.click();

    const draft = JSON.parse(dom.window.localStorage.getItem('ct_schedule_draft'));
    assert.ok(draft, 'Outfit detail should persist a schedule draft');
    assert.strictEqual(draft.source.type, 'outfit');
    assert.strictEqual(draft.source.id, 'midnight-formalism');
    assert.ok(/schedule-event\.html/.test(dom.window.document.documentElement.getAttribute('data-ct-redirect') || ''), 'Add to schedule should navigate to schedule event page');
  });

  await runTest('New Outfit Detail 页面应支持查看替代搭配', async () => {
    const htmlPath = path.join(__dirname, '..', 'outfit-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/outfit-detail.html?id=midnight-formalism' });

    dom.window.localStorage.setItem('ct_settings', JSON.stringify({
      version: 1,
      users: {
        guest: {
          language: 'en-US',
          'display-mode': 'dark',
          'wardrobe-layout': 'list',
          'temperature-unit': 'celsius',
          'public-profile': true,
          'outfit-reminders': true
        }
      }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.CustomEvent = dom.window.CustomEvent;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'outfitDetailPage.js')).href}?alternatives=1`;
    const { renderOutfitDetailPage } = await import(modulePath);
    renderOutfitDetailPage();

    const alternativesButton = dom.window.document.querySelector('[data-ct-outfit-see-alternatives]');
    assert.ok(alternativesButton, 'Missing alternatives button');
    alternativesButton.click();

    const cards = Array.from(dom.window.document.querySelectorAll('[data-ct-outfit-alternative-card]'));
    assert.ok(cards.length > 0, 'Alternatives section should render cards');
    assert.ok(cards.every((card) => !/Midnight Formalism/.test(card.textContent)), 'Alternatives should exclude current look');
    assert.ok(cards.every((card) => /^outfit-detail\.html\?id=/.test(card.getAttribute('href') || '')), 'Alternative cards should use stable outfit detail href contract');
  });
}

main();
