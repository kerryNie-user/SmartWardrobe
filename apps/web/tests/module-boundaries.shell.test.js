const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

function readJsFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(dir, name));
}

runTest('页面层只能依赖公开 contract 与 store 入口', () => {
  const pagesDir = path.join(__dirname, '..', 'js', 'pages');
  const pageFiles = readJsFiles(pagesDir);
  const disallowedImports = [
    /from ['"]\.\.\/lib\/pageContracts\//,
    /from ['"]\.\.\/lib\/(?:favorites|wardrobe)\//,
    /from ['"]\.\.\/lib\/.*(?:LocalRepository|RemoteRepository|Service)\.js['"]/
  ];

  for (const file of pageFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of disallowedImports) {
      assert.ok(!pattern.test(source), `${path.basename(file)} should not import internal domain modules`);
    }
  }
});

runTest('pageContracts 入口应保持 barrel-only', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'lib', 'pageContracts.js'), 'utf8');
  assert.ok(!source.includes('function '), 'pageContracts.js should not contain contract implementations');
  assert.ok(!source.includes('const '), 'pageContracts.js should not contain local state or helper constants');
  const leftovers = source
    .replace(/export\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"]/g, '')
    .trim();
  assert.strictEqual(leftovers, '', 'pageContracts.js should only export page contract modules');
});

runTest('收藏与衣橱 store facade 不应直接依赖存储或 backend', () => {
  const facadeFiles = [
    path.join(__dirname, '..', 'js', 'lib', 'favoritesStore.js'),
    path.join(__dirname, '..', 'js', 'lib', 'wardrobeStore.js')
  ];

  for (const file of facadeFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(!source.includes('backendClient'), `${path.basename(file)} should delegate remote IO to remoteRepository`);
    assert.ok(!source.includes('readUserScopedValue'), `${path.basename(file)} should delegate storage reads to localRepository`);
    assert.ok(!source.includes('writeUserScopedValue'), `${path.basename(file)} should delegate storage writes to localRepository`);
  }
});

runTest('store facade 不应依赖页面或组件实现', () => {
  const libDir = path.join(__dirname, '..', 'js', 'lib');
  const storeFiles = readJsFiles(libDir).filter((file) => file.endsWith('Store.js'));

  for (const file of storeFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(!source.includes('../pages/'), `${path.basename(file)} should not import pages`);
    assert.ok(!source.includes('../components/'), `${path.basename(file)} should not import components`);
  }
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
