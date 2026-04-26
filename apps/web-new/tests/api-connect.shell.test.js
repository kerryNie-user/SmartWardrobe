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

function createFetchStub(config = {}) {
  const requests = [];
  const failureMap = config.failureMap || {};
  const db = {
    profile: {
      'user-1': {
        name: 'Remote Nova',
        bio: 'Remote bio',
        avatar: '/uploads/profile/elara-vance.jpg'
      }
    },
    settings: {
      'user-1': {
        language: 'zh-CN',
        'display-mode': 'light',
        'wardrobe-layout': 'list',
        'temperature-unit': 'fahrenheit',
        'public-profile': false,
        'outfit-reminders': true
      }
    },
    favorites: {
      'user-1': {
        looks: [{ id: 'remote-look', title: 'Remote Look', subtitle: '', image: '', href: 'favorites.html', savedAt: 1 }],
        posts: []
      }
    },
    wardrobe: {
      'user-1': [
        { id: 'coat-1', title: 'Remote Coat', category: 'Outerwear', size: 'M', color: 'Ink', material: 'Wool', image: '', filter: 'outerwear', favorite: false }
      ]
    },
    schedules: {
      'user-1': [
        { id: 'remote-schedule', tab: 'travel', day: '31', label: 'Oct / Thu', time: '09:30 AM — 11:00 AM', title: 'Remote Schedule', location: 'Le Marais', tags: ['Notebook'], reminderEnabled: true, version: 2, updatedAt: 222 }
      ]
    }
  };

  const fetch = async (url, options = {}) => {
    const rawUrl = typeof url === 'string' ? url : String(url);
    const resolvedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? new URL(rawUrl).pathname
      : rawUrl;
    const method = (options.method || 'GET').toUpperCase();
    const failureKey = `${method} ${resolvedUrl}`;
    const headers = options.headers || {};
    const userId = headers['X-User-Id'] || headers['x-user-id'] || 'guest';
    const body = options.body ? JSON.parse(options.body) : {};
    requests.push({ url: resolvedUrl, rawUrl, method, headers, body });

    if (failureMap[failureKey]) {
      const failure = failureMap[failureKey];
      if (failure.once) {
        delete failureMap[failureKey];
      }
      return createJsonResponse(failure.body || { error: failure.error || 'FAILED' }, failure.status || 500);
    }

    if (resolvedUrl === '/api/profile' && method === 'GET') {
      return createJsonResponse({ profile: db.profile[userId] || { name: 'Closet Twin', bio: '', avatar: '/uploads/profile/elara-vance.jpg' } });
    }
    if (resolvedUrl === '/api/profile' && method === 'POST') {
      db.profile[userId] = { ...body };
      return createJsonResponse({ profile: db.profile[userId] });
    }
    if (resolvedUrl === '/api/settings' && method === 'GET') {
      return createJsonResponse({ settings: db.settings[userId] || {} });
    }
    if (resolvedUrl === '/api/settings' && method === 'POST') {
      db.settings[userId] = { ...body };
      return createJsonResponse({ settings: db.settings[userId] });
    }
    if (resolvedUrl === '/api/favorites' && method === 'GET') {
      return createJsonResponse({ favorites: db.favorites[userId] || { looks: [], posts: [] } });
    }
    if (resolvedUrl === '/api/favorites' && method === 'POST') {
      const type = body.type === 'posts' ? 'posts' : 'looks';
      db.favorites[userId] = db.favorites[userId] || { looks: [], posts: [] };
      db.favorites[userId][type] = [body.item, ...db.favorites[userId][type].filter((item) => item.id !== body.item.id)];
      return createJsonResponse({ favorites: db.favorites[userId] });
    }
    if (resolvedUrl.startsWith('/api/favorites/') && method === 'DELETE') {
      const [, , , type, itemId] = resolvedUrl.split('/');
      db.favorites[userId][type] = db.favorites[userId][type].filter((item) => item.id !== itemId);
      return createJsonResponse({ favorites: db.favorites[userId] });
    }
    if (resolvedUrl === '/api/wardrobe' && method === 'GET') {
      return createJsonResponse({ items: db.wardrobe[userId] || [] });
    }
    if (resolvedUrl === '/api/wardrobe' && method === 'POST') {
      const item = { ...body.item };
      db.wardrobe[userId] = [item, ...(db.wardrobe[userId] || []).filter((entry) => entry.id !== item.id)];
      return createJsonResponse({ item });
    }
    if (resolvedUrl.startsWith('/api/wardrobe/') && method === 'PUT') {
      const itemId = resolvedUrl.split('/').pop();
      db.wardrobe[userId] = (db.wardrobe[userId] || []).map((item) => item.id === itemId ? { ...item, ...body.item } : item);
      return createJsonResponse({ item: db.wardrobe[userId].find((item) => item.id === itemId) });
    }
    if (resolvedUrl.startsWith('/api/wardrobe/') && method === 'DELETE') {
      const itemId = resolvedUrl.split('/').pop();
      db.wardrobe[userId] = (db.wardrobe[userId] || []).filter((item) => item.id !== itemId);
      return createJsonResponse({ deleted: true });
    }
    if (resolvedUrl === '/api/schedules' && method === 'GET') {
      return createJsonResponse({ items: db.schedules[userId] || [] });
    }
    if (resolvedUrl === '/api/schedules' && method === 'POST') {
      db.schedules[userId] = [body, ...(db.schedules[userId] || []).filter((item) => item.id !== body.id)];
      return createJsonResponse({ item: body }, 201);
    }
    if (resolvedUrl.startsWith('/api/schedules/') && method === 'PUT') {
      const itemId = resolvedUrl.split('/').pop();
      const current = (db.schedules[userId] || []).find((item) => item.id === itemId);
      if (current && body.version !== undefined && body.version !== current.version) {
        return createJsonResponse({ error: 'SCHEDULE_CONFLICT', item: current }, 409);
      }
      db.schedules[userId] = (db.schedules[userId] || []).map((item) => item.id === itemId ? { ...item, ...body } : item);
      return createJsonResponse({ item: db.schedules[userId].find((item) => item.id === itemId) });
    }
    if (resolvedUrl.startsWith('/api/schedules/') && method === 'DELETE') {
      const itemId = resolvedUrl.split('/').pop();
      db.schedules[userId] = (db.schedules[userId] || []).filter((item) => item.id !== itemId);
      return createJsonResponse({ deleted: true });
    }

    return createJsonResponse({ error: 'NOT_FOUND' }, 404);
  };

  return { fetch, requests };
}

async function main() {
  await runTest('New store 应从 lite backend hydrate 资料与设置', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/me.html' });
    const { fetch, requests } = createFetchStub();

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const profileModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'profileStore.js')).href}?api-profile=1`;
    const settingsModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsStore.js')).href}?api-settings=1`;
    const { getProfile, getProfileSyncState, hydrateProfile, saveProfile } = await import(profileModulePath);
    const { getSettingsState, getSettingsSyncState, hydrateSettings, setSetting } = await import(settingsModulePath);

    await hydrateProfile('en-US');
    await hydrateSettings();
    assert.strictEqual(getProfile('en-US').name, 'Remote Nova');
    assert.strictEqual(getSettingsState().language, 'zh-CN');
    assert.strictEqual(getProfileSyncState().status, 'synced');
    assert.strictEqual(getSettingsSyncState().status, 'synced');

    saveProfile({ name: 'Updated Nova', bio: 'Updated', avatar: '/uploads/profile/elara-vance.jpg' }, 'en-US');
    setSetting('display-mode', 'dark');
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(requests.some((entry) => entry.url === '/api/profile' && entry.method === 'POST' && entry.headers['X-User-Id'] === 'user-1'));
    assert.ok(requests.some((entry) => entry.url === '/api/settings' && entry.method === 'POST' && entry.headers['X-User-Id'] === 'user-1'));
  });

  await runTest('New store 应从 lite backend hydrate 收藏与衣橱', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/me.html' });
    const { fetch, requests } = createFetchStub();

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const favoritesModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'favoritesStore.js')).href}?api-favorites=1`;
    const wardrobeModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeStore.js')).href}?api-wardrobe=1`;
    const { getFavoritesByType, getFavoritesSyncState, hydrateFavorites, toggleFavorite } = await import(favoritesModulePath);
    const { getWardrobeItems, getWardrobeSyncState, hydrateWardrobe, saveWardrobeItem } = await import(wardrobeModulePath);

    await hydrateFavorites();
    await hydrateWardrobe('en-US');
    assert.strictEqual(getFavoritesByType('looks')[0].id, 'remote-look');
    assert.strictEqual(getWardrobeItems('en-US')[0].title, 'Remote Coat');
    assert.strictEqual(getFavoritesSyncState().status, 'synced');
    assert.strictEqual(getWardrobeSyncState().status, 'synced');

    toggleFavorite('looks', { id: 'new-look', title: 'New Look', href: 'favorites.html' });
    saveWardrobeItem({
      title: 'Saved Coat',
      category: 'Outerwear',
      size: 'M',
      color: 'Ink',
      material: 'Wool',
      filter: 'outerwear',
      favorite: false
    }, 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(requests.some((entry) => entry.url === '/api/favorites' && entry.method === 'POST'));
    assert.ok(requests.some((entry) => entry.url === '/api/wardrobe' && entry.method === 'POST'));
  });

  await runTest('New Schedule store 应从 lite backend hydrate 并写回日程', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/schedule.html' });
    const { fetch, requests } = createFetchStub();

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const scheduleModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleStore.js')).href}?api-schedule=1`;
    const { getScheduleSummary, getScheduleSyncState, hydrateSchedule, createScheduleEvent } = await import(scheduleModulePath);

    await hydrateSchedule('en-US');
    assert.strictEqual(getScheduleSummary('en-US').title, 'Remote Schedule');
    assert.strictEqual(getScheduleSyncState().status, 'synced');

    createScheduleEvent({
      tab: 'travel',
      day: '30',
      label: 'Oct / Wed',
      time: '03:00 PM — 05:00 PM',
      title: 'Backend Sync Event',
      location: 'Canal District',
      tags: ['Notebook'],
      reminderEnabled: true
    }, 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(requests.some((entry) => entry.url === '/api/schedules' && entry.method === 'POST' && entry.headers['X-User-Id'] === 'user-1'));
  });

  await runTest('Favorites 写回失败时应回滚并标记 failed', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/favorites.html' });
    const { fetch } = createFetchStub({
      failureMap: {
        'POST /api/favorites': { status: 500, error: 'FAVORITES_SAVE_FAILED' }
      }
    });

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const favoritesModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'favoritesStore.js')).href}?api-favorites-failed=1`;
    const { getFavoritesByType, getFavoritesSyncState, hydrateFavorites, toggleFavorite } = await import(favoritesModulePath);

    await hydrateFavorites();
    const beforeIds = getFavoritesByType('looks').map((item) => item.id);
    toggleFavorite('looks', { id: 'failed-look', title: 'Failed Look', href: 'favorites.html' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepStrictEqual(getFavoritesByType('looks').map((item) => item.id), beforeIds);
    assert.strictEqual(getFavoritesSyncState().status, 'failed');
  });

  await runTest('Favorites failed 后应支持 retry 再次写回', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/favorites.html' });
    const { fetch, requests } = createFetchStub({
      failureMap: {
        'POST /api/favorites': { status: 500, error: 'FAVORITES_SAVE_FAILED', once: true }
      }
    });

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const favoritesModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'favoritesStore.js')).href}?api-favorites-retry=1`;
    const { getFavoritesSyncState, hydrateFavorites, retryFavoritesSync, toggleFavorite } = await import(favoritesModulePath);

    await hydrateFavorites();
    toggleFavorite('looks', { id: 'retry-look', title: 'Retry Look', href: 'favorites.html' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.strictEqual(getFavoritesSyncState().status, 'failed');

    retryFavoritesSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.strictEqual(getFavoritesSyncState().status, 'synced');
    assert.strictEqual(requests.filter((entry) => entry.url === '/api/favorites' && entry.method === 'POST').length, 2);
  });

  await runTest('Schedule 版本冲突时应标记 conflict 并回退到远端', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/schedule.html' });
    const { fetch } = createFetchStub();

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const scheduleModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleStore.js')).href}?api-schedule-conflict=1`;
    const { getScheduleEventById, getScheduleSyncState, hydrateSchedule, updateScheduleEvent } = await import(scheduleModulePath);

    await hydrateSchedule('en-US');
    updateScheduleEvent('remote-schedule', {
      title: 'Local Changed Title',
      version: 1
    }, 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.strictEqual(getScheduleSyncState().status, 'conflict');
    assert.strictEqual(getScheduleEventById('remote-schedule', 'en-US').title, 'Remote Schedule');
  });

  await runTest('Schedule failed 后应支持 retry 再次写回', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/schedule.html' });
    const { fetch, requests } = createFetchStub({
      failureMap: {
        'POST /api/schedules': { status: 500, error: 'SCHEDULE_SAVE_FAILED', once: true }
      }
    });

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const scheduleModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleStore.js')).href}?api-schedule-retry=1`;
    const { createScheduleEvent, getScheduleSyncState, hydrateSchedule, retryScheduleSync } = await import(scheduleModulePath);

    await hydrateSchedule('en-US');
    createScheduleEvent({
      tab: 'travel',
      day: '30',
      label: 'Oct / Wed',
      time: '03:00 PM — 05:00 PM',
      title: 'Retry Schedule Event',
      location: 'Canal District',
      tags: ['Notebook'],
      reminderEnabled: true
    }, 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.strictEqual(getScheduleSyncState().status, 'failed');

    retryScheduleSync('en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.strictEqual(getScheduleSyncState().status, 'synced');
    assert.strictEqual(requests.filter((entry) => entry.url === '/api/schedules' && entry.method === 'POST').length, 2);
  });

  await runTest('Wardrobe delete failed 后应支持 retry 再次写回', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/wardrobe.html' });
    const { fetch, requests } = createFetchStub({
      failureMap: {
        'DELETE /api/wardrobe/coat-1': { status: 500, error: 'WARDROBE_DELETE_FAILED', once: true }
      }
    });

    dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
      user: { id: 'user-1', name: 'Nova Lane', emailOrMobile: 'nova@example.com' }
    }));

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.fetch = fetch;
    dom.window.fetch = fetch;

    const wardrobeModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'wardrobeStore.js')).href}?api-wardrobe-delete-retry=1`;
    const { deleteWardrobeItem, getWardrobeItems, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync } = await import(wardrobeModulePath);

    await hydrateWardrobe('en-US');
    deleteWardrobeItem('coat-1', 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.strictEqual(getWardrobeSyncState().status, 'failed');
    assert.strictEqual(getWardrobeItems('en-US')[0].id, 'coat-1');

    retryWardrobeSync('en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.strictEqual(getWardrobeSyncState().status, 'synced');
    assert.strictEqual(getWardrobeItems('en-US').some((item) => item.id === 'coat-1'), false);
    assert.strictEqual(requests.filter((entry) => entry.url === '/api/wardrobe/coat-1' && entry.method === 'DELETE').length, 2);
  });
}

main();
