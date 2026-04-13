const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => process.stdout.write(`PASS ${name}\n`),
        (error) => {
          process.stderr.write(`FAIL ${name}\n`);
          process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
          process.exitCode = 1;
        }
      );
    }
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`);
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  }
}

const projectRoot = path.resolve(__dirname, '..', '..', '..');

runTest('重写基础骨架文件应已就位', () => {
  const requiredFiles = [
    'docs/superpowers/plans/2026-03-30-webapp-rewrite-foundation.md',
    'apps/web-legacy/css/tokens.css',
    'apps/web-legacy/css/layout.css',
    'apps/web-legacy/css/components.css',
    'apps/web-legacy/css/pages/home.css',
    'apps/web-legacy/js/core/bootstrap.js',
    'apps/web-legacy/js/core/pageRegistry.js',
    'apps/web-legacy/js/core/events.js',
    'apps/web-legacy/js/services/storage.js',
    'apps/web-legacy/js/services/mockData.js',
    'apps/web-legacy/js/store/preferencesStore.js',
    'apps/web-legacy/js/store/recommendationStore.js',
    'apps/web-legacy/js/store/scheduleStore.js',
    'apps/web-legacy/js/components/topbar.js',
    'apps/web-legacy/js/components/bottomNav.js',
    'apps/web-legacy/js/components/secondaryTabs.js',
    'apps/web-legacy/js/pages/homePage.js'
  ];

  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    assert.ok(fs.existsSync(absolutePath), `${relativePath} is missing`);
  }
});

runTest('Home 第一阶段骨架目录应完整', () => {
  const requiredDirectories = [
    'docs/superpowers/plans',
    'apps/web-legacy/js/core',
    'apps/web-legacy/js/services',
    'apps/web-legacy/js/store',
    'apps/web-legacy/js/components',
    'apps/web-legacy/js/pages',
    'apps/web-legacy/css/pages'
  ];

  for (const relativePath of requiredDirectories) {
    const absolutePath = path.join(projectRoot, relativePath);
    assert.ok(fs.existsSync(absolutePath), `${relativePath} is missing`);
    assert.ok(fs.statSync(absolutePath).isDirectory(), `${relativePath} is not a directory`);
  }
});
