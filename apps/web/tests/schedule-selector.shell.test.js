const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('scheduleSelectors 应产出 overview、delete candidate 与 dialog copy', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'scheduleSelectors.js')).href}?selector=1`;
  const {
    selectScheduleOverview,
    selectScheduleDeleteCandidate,
    selectScheduleDeleteDialogCopy
  } = await import(modulePath);

  const scheduleState = {
    upcoming: {
      overview: { label: 'Upcoming' },
      groups: [{ events: [{ id: 'review-1', title: 'Product Review' }, { id: 'review-2', title: 'Travel Review' }] }]
    }
  };

  const overview = selectScheduleOverview('upcoming', scheduleState);
  assert.strictEqual(overview.value, '02');

  const candidate = selectScheduleDeleteCandidate(scheduleState, 'upcoming', 'review-2');
  assert.strictEqual(candidate.title, 'Travel Review');

  const copy = selectScheduleDeleteDialogCopy('zh-CN', candidate, { actions: { cancel: '取消', delete: '删除' } });
  assert.ok(/Travel Review/.test(copy.description));
  assert.strictEqual(copy.confirmLabel, '删除');
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
