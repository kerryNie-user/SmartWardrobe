const assert = require('assert');
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
  await runTest('ClosetTwin recommendations 应把 model2 返回结果规范化成首页 feed look', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost:8140/index.html'
    });
    const requests = [];

    dom.window.fetch = async (url, options = {}) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return createJsonResponse({
        ok: true,
        status: 'ready',
        data: {
          recommendations: [
            {
              outfitId: 'model2-look',
              outfitName: 'Model2 Look',
              reason: 'Ranked by table model',
              imageUrl: '/uploads/shared/editorial-look-02.jpg',
              items: [
                { name: 'Wool Coat', category: 'Outerwear', color: 'Ink', material: 'Wool' }
              ]
            }
          ]
        },
        error: null
      });
    };

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'closetTwinRecommendations.js')).href}?ready=1`;
    const { getClosetTwinRecommendationLookById, getClosetTwinRecommendationLooks, hydrateClosetTwinRecommendations } = await import(modulePath);

    const looks = await hydrateClosetTwinRecommendations({
      wardrobe: {
        totalCount: 1,
        items: [
          {
            id: 'coat-1',
            ai: {
              source: 'closettwin-model1',
              tags: ['outerwear']
            }
          }
        ]
      }
    });

    assert.strictEqual(looks[0].id, 'model2-look');
    assert.strictEqual(looks[0].title, 'Model2 Look');
    assert.strictEqual(looks[0].source, 'closettwin-model2');
    assert.strictEqual(looks[0].breakdown[0].meta, 'Outerwear • Ink • Wool');
    assert.strictEqual(getClosetTwinRecommendationLookById('model2-look').title, 'Model2 Look');
    assert.deepStrictEqual(getClosetTwinRecommendationLooks().map((look) => look.id), ['model2-look']);
    assert.strictEqual(requests[0].url, '/api/closettwin/recommendations/daily');
    assert.strictEqual(requests[0].body.model1.source, 'wardrobe-ai-json');
    assert.deepStrictEqual(requests[0].body.model1.items[0].tags, ['outerwear']);
  });

  await runTest('ClosetTwin recommendations 应把真实天气、日程、衣橱和反馈压成 model2 场景 payload', async () => {
    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'closetTwinRecommendations.js')).href}?payload=1`;
    const { buildClosetTwinDailyRecommendationPayload } = await import(modulePath);

    const payload = buildClosetTwinDailyRecommendationPayload({
      locale: 'zh-CN',
      activeTab: 'recommend',
      favorites: {
        lookIds: ['saved-look']
      },
      weather: {
        condition: 'Rain',
        temperature: { current: '18°C', low: '14°C', high: '20°C' },
        location: { label: '上海徐汇', precision: 'district' }
      },
      schedule: {
        nextEvent: {
          id: 'flight-brief',
          dateISO: '2026-05-27',
          title: '机场出发',
          time: '07:30',
          location: 'Terminal 1',
          tags: ['Travel']
        },
        scenario: {
          intent: 'travel',
          label: '机场出发'
        }
      },
      wardrobe: {
        totalCount: 1,
        items: [
          {
            id: 'coat-1',
            title: 'Rain Trench',
            category: 'Outerwear',
            material: 'Wool Blend',
            color: 'Onyx',
            image: '/uploads/wardrobe/coat.jpg',
            favorite: true,
            ai: {
              tags: ['waterproof', 'commute'],
              raw: { scenario_scores: { commute: 0.92 } }
            }
          }
        ]
      },
      settings: {
        temperatureUnit: 'celsius',
        outfitReminders: true
      }
    });

    assert.strictEqual(payload.context.locale, 'zh-CN');
    assert.strictEqual(payload.scenario.intent, 'travel');
    assert.strictEqual(payload.scenario.event.title, '机场出发');
    assert.strictEqual(payload.weather.condition, 'Rain');
    assert.strictEqual(payload.model1.source, 'wardrobe-ai-json');
    assert.strictEqual(payload.model1.items[0].itemId, 'coat-1');
    assert.deepStrictEqual(payload.model1.items[0].raw, { scenario_scores: { commute: 0.92 } });
    assert.deepStrictEqual(payload.feedback.savedLookIds, ['saved-look']);
    assert.strictEqual(payload.wardrobe.totalCount, 1);
    assert.strictEqual(payload.wardrobe.items[0].title, 'Rain Trench');
    assert.deepStrictEqual(payload.wardrobe.items[0].ai.tags, ['waterproof', 'commute']);
  });

  await runTest('ClosetTwin recommendations 在 model2 不可用时返回空结果供页面 fallback', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost:8140/index.html'
    });
    dom.window.fetch = async () => createJsonResponse({
      ok: false,
      status: 'unavailable',
      data: {},
      error: { code: 'MODEL_UNAVAILABLE' }
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;

    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'closetTwinRecommendations.js')).href}?unavailable=1`;
    const { getClosetTwinRecommendationLooks, hydrateClosetTwinRecommendations } = await import(modulePath);

    const looks = await hydrateClosetTwinRecommendations({ wardrobe: { totalCount: 1 } });

    assert.deepStrictEqual(looks, []);
    assert.deepStrictEqual(getClosetTwinRecommendationLooks(), []);
  });
}

main();
