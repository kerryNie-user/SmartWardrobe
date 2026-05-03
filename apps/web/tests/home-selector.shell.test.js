const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('Home selector 在无用户信号时应保持默认 Recommend 顺序', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'homeSelectors.js')).href}?default=1`;
  const { selectHomeLooksByTab } = await import(modulePath);

  const looks = selectHomeLooksByTab({
    locale: 'en-US',
    activeTab: 'recommend',
    favoriteIds: [],
    settings: { 'display-mode': 'light' },
    scheduleSummary: null
  });

  assert.deepStrictEqual(looks.map((item) => item.id), [
    'urban-commute',
    'midnight-formalism',
    'weekend-minimal'
  ]);
});

runTest('Home selector 应根据 favorites、theme 与 schedule 信号做规则重排', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'homeSelectors.js')).href}?rules=1`;
  const { buildHomeRecommendationInput, selectHomeLooksByTab } = await import(modulePath);

  const looks = selectHomeLooksByTab(buildHomeRecommendationInput({
    locale: 'en-US',
    activeTab: 'recommend',
    favorites: {
      lookIds: ['urban-commute']
    },
    settings: {
      themeMode: 'dark',
      language: 'en-US',
      wardrobeLayout: 'list',
      outfitReminders: true
    },
    schedule: {
      nextEvent: {
        title: 'Product Review',
        time: '08:30 AM — 09:30 AM',
        location: 'SoHo Studio'
      }
    },
    wardrobe: {
      totalCount: 4,
      recentItems: [
        {
          id: 'wardrobe-1',
          category: 'Outerwear',
          material: 'Virgin Wool',
          color: 'Black',
          filter: 'essentials',
          favorite: true
        }
      ]
    }
  }));

  assert.strictEqual(looks[0].id, 'midnight-formalism');
  assert.strictEqual(looks[looks.length - 1].id, 'urban-commute');
});

runTest('Home recommendation input 应统一归一 favorites、wardrobe、schedule、settings 四域', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'homeSelectors.js')).href}?input=1`;
  const { buildHomeRecommendationInput } = await import(modulePath);

  const input = buildHomeRecommendationInput({
    locale: 'zh-CN',
    activeTab: 'featured',
    favorites: {
      lookIds: new Set(['runway-analysis'])
    },
    wardrobe: {
      totalCount: 3,
      recentItems: [
        {
          id: 'coat-1',
          category: 'Outerwear',
          material: 'Wool Blend',
          color: 'Onyx',
          filter: 'essentials',
          favorite: true
        }
      ]
    },
    schedule: {
      nextEvent: {
        title: '机场出发',
        time: '07:30',
        location: 'Terminal 1'
      }
    },
    settings: {
      themeMode: 'dark',
      language: 'zh-CN',
      temperatureUnit: 'celsius',
      wardrobeLayout: 'grid',
      outfitReminders: true
    }
  });

  assert.deepStrictEqual(input.favorites.lookIds, ['runway-analysis']);
  assert.strictEqual(input.wardrobe.totalCount, 3);
  assert.strictEqual(input.wardrobe.signals.hasOuterwear, true);
  assert.strictEqual(input.schedule.signals.travel, true);
  assert.strictEqual(input.settings.themeMode, 'dark');
});

runTest('Home selector 应提供统一的 lookById 与 scheduleCard 输出', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'homeSelectors.js')).href}?detail=1`;
  const { selectHomeLookById, selectHomeScheduleCard } = await import(modulePath);

  const look = selectHomeLookById('zh-CN', 'atelier-notes');
  const scheduleCard = selectHomeScheduleCard('zh-CN', {
    title: '面料复盘',
    time: '09:00',
    location: '中庭工作室'
  });

  assert.strictEqual(look.title, '工坊笔记');
  assert.strictEqual(scheduleCard.title, '面料复盘');
  assert.strictEqual(scheduleCard.label, '即将到来的日程');
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
