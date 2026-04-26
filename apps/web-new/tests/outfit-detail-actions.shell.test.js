const assert = require('assert');
const path = require('path');
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
  await runTest('routes 应输出 Outfit Detail 与 Schedule Event 的稳定 href', async () => {
    const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'routes.js')).href}?routes=1`;
    const { buildOutfitDetailHref, buildScheduleEventHref } = await import(modulePath);

    assert.strictEqual(buildOutfitDetailHref('editorial-look'), 'outfit-detail.html?id=editorial-look');
    assert.strictEqual(buildScheduleEventHref(), 'schedule-event.html');
  });

  await runTest('outfitDetailActions 应输出稳定 action id 与 payload', async () => {
    const actionIdsPath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'actions', 'actionIds.js')).href}?ids=1`;
    const actionsPath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'actions', 'outfitDetailActions.js')).href}?actions=1`;
    const actionIds = await import(actionIdsPath);
    const actions = await import(actionsPath);

    const look = {
      id: 'midnight-formalism',
      title: 'Midnight Formalism',
      description: 'Structured tailoring with quiet sheen.',
      image: '/uploads/shared/travel-look.jpg'
    };

    const saveAction = actions.buildToggleSaveLookAction(look);
    const scheduleAction = actions.buildAddOutfitToScheduleAction(look, {
      locale: 'zh-CN',
      reminderEnabled: true
    });
    const alternativesAction = actions.buildShowAlternativesAction();
    const navigateAction = actions.buildNavigateToOutfitDetailAction('editorial-look');

    assert.strictEqual(saveAction.id, actionIds.OUTFIT_TOGGLE_SAVE);
    assert.strictEqual(saveAction.payload.favoriteItem.href, 'outfit-detail.html?id=midnight-formalism');

    assert.strictEqual(scheduleAction.id, actionIds.OUTFIT_ADD_TO_SCHEDULE);
    assert.strictEqual(scheduleAction.payload.href, 'schedule-event.html');
    assert.strictEqual(scheduleAction.payload.draft.source.id, 'midnight-formalism');
    assert.strictEqual(scheduleAction.payload.draft.reminderEnabled, true);

    assert.strictEqual(alternativesAction.id, actionIds.OUTFIT_SHOW_ALTERNATIVES);
    assert.strictEqual(alternativesAction.kind, 'ui');

    assert.strictEqual(navigateAction.id, actionIds.NAVIGATE_TO_OUTFIT_DETAIL);
    assert.strictEqual(navigateAction.payload.href, 'outfit-detail.html?id=editorial-look');
  });

  await runTest('dispatchAction 应按 action id 执行 web side effect', async () => {
    const actionsPath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'actions', 'outfitDetailActions.js')).href}?actions=2`;
    const dispatcherPath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'actions', 'dispatchAction.js')).href}?dispatcher=1`;
    const actions = await import(actionsPath);
    const { dispatchAction } = await import(dispatcherPath);

    const calls = [];
    const context = {
      toggleFavorite(type, favoriteItem) {
        calls.push({ kind: 'toggleFavorite', type, favoriteItem });
      },
      saveScheduleDraft(draft) {
        calls.push({ kind: 'saveScheduleDraft', draft });
      },
      navigateTo(href) {
        calls.push({ kind: 'navigateTo', href });
      },
      showAlternatives() {
        calls.push({ kind: 'showAlternatives' });
      }
    };

    dispatchAction(actions.buildToggleSaveLookAction({
      id: 'midnight-formalism',
      title: 'Midnight Formalism',
      description: 'Structured tailoring with quiet sheen.',
      image: '/uploads/shared/travel-look.jpg'
    }), context);

    dispatchAction(actions.buildAddOutfitToScheduleAction({
      id: 'midnight-formalism',
      title: 'Midnight Formalism',
      description: 'Structured tailoring with quiet sheen.',
      image: '/uploads/shared/travel-look.jpg'
    }, {
      locale: 'en-US',
      reminderEnabled: false
    }), context);

    dispatchAction(actions.buildShowAlternativesAction(), context);
    dispatchAction(actions.buildNavigateToOutfitDetailAction('editorial-look'), context);

    assert.deepStrictEqual(calls.map((entry) => entry.kind), [
      'toggleFavorite',
      'saveScheduleDraft',
      'navigateTo',
      'showAlternatives',
      'navigateTo'
    ]);
    assert.strictEqual(calls[0].type, 'looks');
    assert.strictEqual(calls[1].draft.source.id, 'midnight-formalism');
    assert.strictEqual(calls[2].href, 'schedule-event.html');
    assert.strictEqual(calls[4].href, 'outfit-detail.html?id=editorial-look');
  });
}

main();

