const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('profileSelectors 应聚合 profile summary 与 favorites preview 输入', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'profileSelectors.js')).href}?selector=1`;
  const { buildProfilePageSelectorInput } = await import(modulePath);

  const selectorInput = buildProfilePageSelectorInput({
    locale: 'en-US',
    content: {
      summary: {
        action: 'Edit',
        heading: 'Preview',
        preview: {
          heading: 'Saved',
          empty: 'Nothing yet'
        }
      }
    },
    profile: { name: 'Nova', bio: 'Bio', avatar: './avatar.jpg' },
    favorites: {
      looks: [{ id: 'look-1', title: 'Look 1', subtitle: 'Saved look', image: './look.jpg' }],
      posts: [{ id: 'post-1', title: 'Post 1', subtitle: 'Saved post', image: './post.jpg' }]
    },
    favoritesStats: { total: 2 },
    wardrobeCount: 3,
    syncStates: {
      profile: { status: 'synced' },
      favorites: { status: 'stale' }
    }
  });

  assert.strictEqual(selectorInput.favorites.items.length, 2);
  assert.strictEqual(selectorInput.favorites.stats.total, 2);
  assert.strictEqual(selectorInput.wardrobe.count, 3);
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
