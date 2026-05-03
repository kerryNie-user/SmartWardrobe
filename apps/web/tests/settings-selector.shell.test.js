const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('settingsSelectors 应聚合 locale、profile 与 panel 输入', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'settingsSelectors.js')).href}?selector=1`;
  const { buildSettingsPageSelectorInput } = await import(modulePath);

  const selectorInput = buildSettingsPageSelectorInput({
    settingsState: {
      language: 'zh-CN',
      'display-mode': 'dark',
      'temperature-unit': 'celsius',
      'outfit-reminders': true
    },
    content: {
      heading: '设置',
      items: [{ key: 'language' }],
      profile: { eyebrow: '档案' }
    },
    profile: {
      name: 'Nova',
      avatar: './avatar.jpg',
      bio: 'Bio'
    },
    syncStates: {
      profile: { status: 'synced' },
      settings: { status: 'failed' }
    }
  });

  assert.strictEqual(selectorInput.locale, 'zh-CN');
  assert.strictEqual(selectorInput.settingsState.language, 'zh-CN');
  assert.strictEqual(selectorInput.profile.name, 'Nova');
  assert.strictEqual(selectorInput.content.items.length, 1);
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
