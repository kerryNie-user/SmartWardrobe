const assert = require('assert');
const fs = require('fs');
const path = require('path');

function main() {
  const manifestPath = path.join(__dirname, '..', 'images', 'weather', 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Expected stitch crop manifest to exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(Array.isArray(manifest.cards), 'Manifest should include cards array');
  assert.strictEqual(manifest.cards.length, 11, 'Manifest should describe 11 cropped cards');

  const names = manifest.cards.map((card) => card.name);
  [
    'sunny',
    'clear-night',
    'rainy',
    'stormy',
    'snowy',
    'cloudy',
    'cloudy-soft',
    'foggy',
    'sandstorm',
    'hail',
    'windy'
  ].forEach((name) => {
    assert.ok(names.includes(name), `Manifest should include ${name}`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'weather', `${name}.png`)), `Expected ${name}.png to exist`);
  });
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exit(1);
}
