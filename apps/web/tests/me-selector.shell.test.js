const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('meSelectors 应聚合五域输入并产出稳定的 Me page selector input', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'meSelectors.js')).href}?input=1`;
  const { buildMePageSelectorInput } = await import(modulePath);

  const selectorInput = buildMePageSelectorInput({
    locale: 'zh-CN',
    activeTab: 'schedule',
    content: {
      profile: { label: '个人资料' },
      tabs: [{ key: 'schedule' }],
      views: {
        schedule: {
          summary: { title: '日程', value: '00', meta: '', note: '' },
          stats: []
        }
      }
    },
    profile: { name: 'Nova' },
    favoritesStats: { total: 3, looks: 2, posts: 1 },
    favoriteLooks: [{ id: 'look-1', title: 'Look 1', subtitle: 'Saved' }],
    favoritePosts: [{ id: 'post-1', title: 'Post 1', subtitle: 'Saved' }],
    settingsState: { language: 'zh-CN', 'display-mode': 'dark' },
    scheduleSummary: { title: '评审', label: '10月 / 周五', time: '10:00 — 12:00', location: 'Studio A' },
    scheduleStats: { upcoming: 2, travel: 1 },
    scheduleFeed: [{ title: '评审', label: '10月 / 周五', time: '10:00 — 12:00', location: 'Studio A' }],
    wardrobeCount: 2,
    wardrobeItems: [{ id: 'coat-1', favorite: true }],
    recentWardrobeItems: [{ id: 'coat-1', title: 'Atelier Coat', category: 'Outerwear', material: 'Wool', size: 'M', color: 'Black' }],
    syncStates: { schedule: { status: 'synced' } }
  });

  assert.strictEqual(selectorInput.activeTab, 'schedule');
  assert.strictEqual(selectorInput.favorites.stats.total, 3);
  assert.strictEqual(selectorInput.schedule.feed.length, 1);
  assert.strictEqual(selectorInput.wardrobe.recentItems[0].title, 'Atelier Coat');
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
