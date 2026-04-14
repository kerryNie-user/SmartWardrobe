const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

function assertContractShape(contract) {
  assert.ok(contract, 'Contract should exist');
  assert.ok(contract.state, 'Contract should expose state');
  assert.ok(contract.derivedView, 'Contract should expose derivedView');
  assert.ok(contract.actions, 'Contract should expose actions');
  assert.ok(contract.loading, 'Contract should expose loading');
  assert.ok(contract.empty, 'Contract should expose empty');
  assert.ok(contract.error, 'Contract should expose error');
  assert.ok(contract.sync, 'Contract should expose sync');
}

runTest('pageContracts 应为 7 个页面输出统一 contract shape', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageContracts.js')).href}?shape=1`;
  const {
    createHomePageContract,
    createMePageContract,
    createProfilePageContract,
    createSettingsPageContract,
    createFavoritesPageContract,
    createWardrobePageContract,
    createSchedulePageContract
  } = await import(modulePath);

  const syncStates = {
    favorites: { status: 'synced' },
    wardrobe: { status: 'stale' },
    schedule: { status: 'syncing' },
    profile: { status: 'failed' },
    settings: { status: 'synced' }
  };

  const home = createHomePageContract({
    locale: 'en-US',
    activeTab: 'recommend',
    content: { tabs: [{ key: 'recommend' }, { key: 'featured' }] },
    recommendationInput: { favorites: { lookIds: ['urban-commute'] } },
    homeView: {
      weather: { location: 'SoHo', temperature: 18 },
      scheduleCard: { title: 'Product Review' },
      looks: [{ id: 'midnight-formalism', title: 'Midnight Formalism' }]
    },
    syncStates
  });

  const me = createMePageContract({
    locale: 'zh-CN',
    activeTab: 'schedule',
    profile: { name: 'Nova', avatar: './avatar.jpg' },
    content: {
      tabs: [{ key: 'schedule' }, { key: 'favorites' }],
      views: {
        schedule: {
          summary: { title: '日程', value: '00', meta: '', note: '' },
          stats: [],
          items: []
        }
      }
    },
    favorites: { stats: { total: 0, looks: 0, posts: 0 }, looks: [], posts: [] },
    settings: { language: 'zh-CN', 'display-mode': 'dark', 'temperature-unit': 'celsius', 'outfit-reminders': true, 'public-profile': true },
    schedule: { summary: null, stats: { upcoming: 0, travel: 0 }, feed: [] },
    wardrobe: { count: 0, allItems: [], recentItems: [] },
    syncStates
  });

  const profile = createProfilePageContract({
    locale: 'en-US',
    content: { summary: { action: 'Edit', heading: 'Preview', preview: { heading: 'Saved', empty: 'Nothing yet' } } },
    profile: { name: 'Nova', bio: 'Bio', avatar: './avatar.jpg' },
    favorites: { stats: { total: 2 }, items: [{ title: 'Look', subtitle: 'Saved', image: './look.jpg' }] },
    wardrobe: { count: 3 },
    syncStates
  });

  const settings = createSettingsPageContract({
    locale: 'en-US',
    content: { heading: 'Settings', items: [{ key: 'language' }], profile: { eyebrow: 'Profile' } },
    settingsState: { language: 'en-US', 'display-mode': 'dark', 'temperature-unit': 'fahrenheit', 'outfit-reminders': false, 'public-profile': false },
    profile: { name: 'Nova', avatar: './avatar.jpg', bio: 'Bio' },
    syncStates
  });

  const favorites = createFavoritesPageContract({
    locale: 'en-US',
    activeTab: 'looks',
    content: { tabs: [{ key: 'looks' }, { key: 'posts' }], summary: { heading: 'Saved' }, metrics: { total: 'Total', current: 'Current' }, empty: { looks: 'No looks', posts: 'No posts' } },
    stats: { total: 1 },
    items: [{ id: 'urban-commute', title: 'Urban Commute' }],
    syncStates
  });

  const wardrobe = createWardrobePageContract({
    locale: 'en-US',
    activeTab: 'all',
    query: '',
    isFormOpen: false,
    content: { tabs: [{ key: 'all' }, { key: 'essentials' }], hero: { title: 'Wardrobe' } },
    items: [{ id: 'coat-1', title: 'Atelier Coat', category: 'Outerwear', material: 'Wool', filter: 'essentials' }],
    searchedItems: [{ id: 'coat-1', title: 'Atelier Coat', category: 'Outerwear', material: 'Wool', filter: 'essentials' }],
    syncStates
  });

  const schedule = createSchedulePageContract({
    locale: 'en-US',
    activeTab: 'upcoming',
    content: { tabs: [{ key: 'upcoming' }, { key: 'travel' }] },
    scheduleState: {
      upcoming: { overview: { label: 'Upcoming' }, groups: [{ events: [{ id: 'review-1', title: 'Review' }] }] },
      travel: { overview: { label: 'Travel' }, groups: [] }
    },
    deleteCandidate: null,
    syncStates
  });

  [home, me, profile, settings, favorites, wardrobe, schedule].forEach(assertContractShape);
});

runTest('Home / Wardrobe / Schedule contract 应显式暴露 loading、empty、error、sync 语义', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageContracts.js')).href}?semantics=1`;
  const {
    createHomePageContract,
    createWardrobePageContract,
    createSchedulePageContract
  } = await import(modulePath);

  const home = createHomePageContract({
    locale: 'en-US',
    activeTab: 'recommend',
    content: { tabs: [{ key: 'recommend' }, { key: 'featured' }] },
    recommendationInput: { favorites: { lookIds: [] } },
    homeView: {
      weather: { location: 'SoHo', temperature: 18 },
      scheduleCard: { title: 'No Event' },
      looks: []
    },
    syncStates: {
      favorites: { status: 'loading' },
      wardrobe: { status: 'synced' },
      schedule: { status: 'failed' }
    }
  });

  const wardrobe = createWardrobePageContract({
    locale: 'zh-CN',
    activeTab: 'all',
    query: 'coat',
    isFormOpen: false,
    content: { tabs: [{ key: 'all' }, { key: 'essentials' }], hero: { title: '衣橱' } },
    items: [],
    searchedItems: [],
    syncStates: {
      wardrobe: { status: 'stale' }
    }
  });

  const schedule = createSchedulePageContract({
    locale: 'en-US',
    activeTab: 'travel',
    content: { tabs: [{ key: 'upcoming' }, { key: 'travel' }] },
    scheduleState: {
      upcoming: { overview: { label: 'Upcoming' }, groups: [] },
      travel: { overview: { label: 'Travel' }, groups: [] }
    },
    deleteCandidate: { id: 'trip-1', title: 'Travel Fitting' },
    syncStates: {
      schedule: { status: 'conflict' }
    }
  });

  assert.strictEqual(home.loading.backgroundSyncing, true);
  assert.strictEqual(home.error.kind, 'failed');
  assert.strictEqual(wardrobe.empty.kind, 'filteredEmpty');
  assert.strictEqual(wardrobe.sync.domains[0].status, 'stale');
  assert.strictEqual(schedule.error.kind, 'conflict');
  assert.strictEqual(schedule.derivedView.deleteDialog.visible, true);
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
