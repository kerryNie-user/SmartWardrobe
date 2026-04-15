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

runTest('pageContracts 应为核心页面输出统一 contract shape', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageContracts.js')).href}?shape=1`;
  const {
    createHomePageContract,
    createMePageContract,
    createDiscoveryPageContract,
    createProfilePageContract,
    createProfileEditPageContract,
    createSettingsPageContract,
    createFavoritesPageContract,
    createWardrobePageContract,
    createWardrobeItemPageContract,
    createWardrobeDetailPageContract,
    createSchedulePageContract,
    createScheduleEventPageContract,
    createPostDetailPageContract
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

  const discovery = createDiscoveryPageContract({
    locale: 'en-US',
    content: {
      tabs: [{ key: 'hotspots', label: 'Hotspots' }, { key: 'posts', label: 'Posts' }],
      searchPlaceholder: { hotspots: 'TOKYO', posts: 'ARCHIVES' }
    },
    activeTab: 'posts',
    query: 'Brutalist',
    trendStrip: { eyebrow: 'Signals', title: 'Runway Analysis', action: 'Refresh', items: [] },
    feed: {
      kind: 'ready',
      items: [{ id: 'brutalist-basics', title: 'The Modern Uniform: Brutalist Basics', social: { isLiked: false } }]
    },
    shareFeedbackPostId: 'brutalist-basics',
    syncStates: {
      discoveryView: { status: 'synced' },
      discoverySocial: { status: 'failed' }
    }
  });

  const profileEdit = createProfileEditPageContract({
    locale: 'zh-CN',
    content: {
      topbar: { rightLabel: '保存' },
      form: {
        fallback: { name: 'Nova', bio: 'Bio', avatar: './avatar.jpg' },
        status: { saved: '已保存' }
      }
    },
    profile: { name: 'Nova', bio: 'Bio', avatar: './avatar.jpg' },
    status: '已保存',
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

  const wardrobeItem = createWardrobeItemPageContract({
    locale: 'en-US',
    itemId: '',
    imagePreview: '',
    content: {
      tabs: [{ key: 'all', label: 'All' }],
      form: {
        placeholders: { title: 'Title', image: './image.jpg' },
        fallback: { category: 'Outerwear', size: 'M', color: 'Black', material: 'Wool' }
      }
    },
    item: { category: '', title: '', size: '', color: '', material: '', image: '', filter: 'essentials', favorite: false },
    pageCopy: { eyebrow: 'Add Item', title: 'Create', note: 'Note' },
    submitLabel: 'Add',
    syncStates
  });

  const wardrobeDetail = createWardrobeDetailPageContract({
    locale: 'en-US',
    itemId: 'missing-item',
    item: null,
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

  const scheduleEvent = createScheduleEventPageContract({
    locale: 'en-US',
    eventId: 'review-1',
    content: {
      tabs: [{ key: 'upcoming', label: 'Upcoming' }],
      form: {
        labels: {
          tab: 'Category',
          day: 'Day',
          dateLabel: 'Date',
          time: 'Time',
          title: 'Title',
          location: 'Location',
          tags: 'Tags',
          reminder: 'Reminder'
        },
        placeholders: {
          day: '31',
          dateLabel: 'Oct / Thu',
          time: '09:30',
          title: 'Review',
          location: 'Studio',
          tags: 'Tailoring'
        },
        fallback: {
          day: '31',
          dateLabel: 'Oct / Thu',
          time: '09:30',
          location: 'Studio'
        },
        actions: { save: 'Save', update: 'Update' }
      }
    },
    event: {
      id: 'review-1',
      tab: 'upcoming',
      day: '31',
      label: 'Oct / Thu',
      time: '09:30',
      title: 'Review',
      location: 'Studio',
      tags: ['Tailoring'],
      reminderEnabled: true
    },
    scheduleDraft: null,
    syncStates
  });

  const postDetail = createPostDetailPageContract({
    locale: 'en-US',
    postId: 'brutalist-basics',
    post: {
      id: 'brutalist-basics',
      title: 'The Modern Uniform: Brutalist Basics',
      author: 'ELIAS.VAULT',
      description: 'Heavy wool and technical silk.',
      body: ['Paragraph'],
      comments: []
    },
    social: {
      isSaved: true,
      isLiked: true,
      isFollowed: true,
      likesDisplay: '1,201',
      commentsDisplay: '85'
    },
    comments: [{ author: 'You', time: 'Just now', body: 'Love the drape.' }],
    shareFeedback: 'Link copied',
    syncStates: {
      discoverySocial: { status: 'syncing' },
      discoveryComments: { status: 'stale' }
    }
  });

  [home, me, discovery, profile, profileEdit, settings, favorites, wardrobe, wardrobeItem, wardrobeDetail, schedule, scheduleEvent, postDetail].forEach(assertContractShape);
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

runTest('Profile Edit / Schedule Event / Wardrobe Item / Wardrobe Detail contract 应暴露详情页协议语义', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageContracts.js')).href}?detail-pages=1`;
  const {
    createProfileEditPageContract,
    createScheduleEventPageContract,
    createWardrobeItemPageContract,
    createWardrobeDetailPageContract
  } = await import(modulePath);

  const profileEdit = createProfileEditPageContract({
    locale: 'zh-CN',
    content: {
      topbar: { rightLabel: '保存' },
      form: {
        fallback: { name: 'Nova', bio: 'Bio', avatar: './avatar.jpg' },
        status: { saved: '已保存' }
      }
    },
    profile: { name: 'Nova', bio: 'Bio', avatar: './avatar.jpg' },
    status: '已保存',
    syncStates: {
      profile: { status: 'failed' }
    }
  });

  const scheduleEvent = createScheduleEventPageContract({
    locale: 'en-US',
    eventId: 'review-1',
    content: {
      tabs: [{ key: 'upcoming', label: 'Upcoming' }],
      form: {
        labels: {
          tab: 'Category',
          day: 'Day',
          dateLabel: 'Date',
          time: 'Time',
          title: 'Title',
          location: 'Location',
          tags: 'Tags',
          reminder: 'Reminder'
        },
        placeholders: {
          day: '31',
          dateLabel: 'Oct / Thu',
          time: '09:30',
          title: 'Review',
          location: 'Studio',
          tags: 'Tailoring'
        },
        fallback: {
          day: '31',
          dateLabel: 'Oct / Thu',
          time: '09:30',
          location: 'Studio'
        },
        actions: { save: 'Save', update: 'Update' }
      }
    },
    event: {
      id: 'review-1',
      tab: 'upcoming',
      day: '31',
      label: 'Oct / Thu',
      time: '09:30',
      title: 'Review',
      location: 'Studio',
      tags: ['Tailoring'],
      reminderEnabled: true
    },
    scheduleDraft: null,
    syncStates: {
      schedule: { status: 'stale' }
    }
  });

  const wardrobeItem = createWardrobeItemPageContract({
    locale: 'en-US',
    itemId: '',
    imagePreview: 'data:image/png;base64,preview',
    content: {
      tabs: [{ key: 'all', label: 'All' }],
      form: {
        placeholders: { title: 'Title', image: './image.jpg' },
        fallback: { category: 'Outerwear', size: 'M', color: 'Black', material: 'Wool' }
      }
    },
    item: { category: '', title: '', size: '', color: '', material: '', image: '', filter: 'essentials', favorite: false },
    pageCopy: { eyebrow: 'Add Item', title: 'Create', note: 'Note' },
    submitLabel: 'Add',
    syncStates: {
      wardrobe: { status: 'syncing' }
    }
  });

  const wardrobeDetail = createWardrobeDetailPageContract({
    locale: 'en-US',
    itemId: 'missing-item',
    item: null,
    syncStates: {
      wardrobe: { status: 'stale' }
    }
  });

  assert.strictEqual(profileEdit.error.kind, 'failed');
  assert.strictEqual(profileEdit.sync.domains[0].key, 'profile');
  assert.strictEqual(scheduleEvent.state.isEditing, true);
  assert.strictEqual(scheduleEvent.sync.domains[0].status, 'stale');
  assert.strictEqual(wardrobeItem.state.isEditing, false);
  assert.strictEqual(wardrobeItem.loading.backgroundSyncing, true);
  assert.strictEqual(wardrobeDetail.empty.kind, 'noData');
  assert.strictEqual(wardrobeDetail.empty.active, true);
});

runTest('Discovery / Post Detail contract 应暴露 feed、详情与 sync 语义', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'pageContracts.js')).href}?discovery-pages=1`;
  const {
    createDiscoveryPageContract,
    createPostDetailPageContract
  } = await import(modulePath);

  const discovery = createDiscoveryPageContract({
    locale: 'en-US',
    content: {
      tabs: [{ key: 'hotspots', label: 'Hotspots' }, { key: 'posts', label: 'Posts' }],
      searchPlaceholder: { hotspots: 'TOKYO', posts: 'ARCHIVES' }
    },
    activeTab: 'posts',
    query: 'No Match',
    trendStrip: { eyebrow: 'Signals', title: 'Runway Analysis', action: 'Refresh', items: [] },
    feed: {
      kind: 'empty',
      items: []
    },
    shareFeedbackPostId: '',
    syncStates: {
      discoveryView: { status: 'loading' },
      discoverySocial: { status: 'failed' }
    }
  });

  const postDetail = createPostDetailPageContract({
    locale: 'zh-CN',
    postId: 'missing-post',
    post: null,
    social: null,
    comments: [],
    shareFeedback: '',
    syncStates: {
      discoverySocial: { status: 'stale' },
      discoveryComments: { status: 'failed' }
    }
  });

  assert.strictEqual(discovery.loading.backgroundSyncing, true);
  assert.strictEqual(discovery.empty.kind, 'filteredEmpty');
  assert.strictEqual(discovery.error.kind, 'failed');
  assert.deepStrictEqual(discovery.sync.domains.map((entry) => entry.key), ['discoveryView', 'discoverySocial']);
  assert.strictEqual(postDetail.empty.kind, 'noData');
  assert.strictEqual(postDetail.empty.active, true);
  assert.strictEqual(postDetail.error.kind, 'failed');
  assert.deepStrictEqual(postDetail.sync.domains.map((entry) => entry.key), ['discoverySocial', 'discoveryComments']);
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
