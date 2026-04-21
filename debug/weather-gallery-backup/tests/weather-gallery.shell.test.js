const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

async function main() {
  const htmlPath = path.join(__dirname, '..', 'weather-gallery.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/weather-gallery.html' });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'weatherGalleryPage.js')).href}?gallery=1`;
  const { renderWeatherGalleryPage } = await import(modulePath);
  renderWeatherGalleryPage();

  const styles = Array.from(dom.window.document.querySelectorAll('[data-ct-weather-gallery-style]'));
  const styleKeys = styles.map((node) => node.getAttribute('data-ct-weather-gallery-style'));
  assert.deepStrictEqual(styleKeys, ['stitch'], 'Gallery should only render stitch style section');

  const variantCards = Array.from(dom.window.document.querySelectorAll('[data-ct-weather-gallery-variant]'));
  const variantKeys = variantCards.map((node) => node.getAttribute('data-ct-weather-gallery-variant'));

  ['sunny', 'clear-night', 'rainy', 'stormy', 'snowy', 'cloudy', 'cloudy-soft', 'foggy', 'sandstorm', 'hail', 'windy'].forEach((variant) => {
    assert.ok(variantKeys.includes(variant), `Gallery should render ${variant}`);
  });

  assert.strictEqual(variantCards.length, 11, 'Gallery should render 11 stitch weather variants');

  const rainyContainer = dom.window.document.querySelector('[data-ct-weather-gallery-card="rainy"] .ct-weather-gallery-stitch');
  const stormyContainer = dom.window.document.querySelector('[data-ct-weather-gallery-card="stormy"] .ct-weather-gallery-stitch');
  assert.ok(rainyContainer, 'Stitch rainy preview should render card container');
  assert.ok(stormyContainer, 'Stitch stormy preview should render card container');
  assert.strictEqual(dom.window.document.querySelector('[data-ct-weather-gallery-card="rainy"] img'), null, 'Rainy card should not use foreground img tag');
  assert.strictEqual(dom.window.document.querySelector('[data-ct-weather-gallery-card="stormy"] img'), null, 'Stormy card should not use foreground img tag');
  assert.ok(rainyContainer.getAttribute('style').includes('images/weather/rainy.png'), 'Rainy card should use cropped stitch asset as background image');
  assert.ok(stormyContainer.getAttribute('style').includes('images/weather/stormy.png'), 'Stormy card should use cropped stitch asset as background image');

  const sunnyCard = dom.window.document.querySelector('[data-ct-weather-gallery-card="sunny"]');
  assert.strictEqual(sunnyCard.querySelector('.ct-weather-gallery-stitch__eyebrow'), null, 'Gallery card should not render eyebrow overlay');
  assert.ok(sunnyCard.querySelector('.ct-home-weather__temp'), 'Gallery card should render original project temperature class');
  assert.ok(sunnyCard.querySelector('.ct-home-weather__range'), 'Gallery card should render original project low/high class');
  assert.ok(sunnyCard.querySelector('.ct-home-weather__caption'), 'Gallery card should render original project caption class');
  assert.ok(sunnyCard.querySelector('.ct-weather-gallery-stitch__content.ct-home-weather'), 'Gallery card should wrap original project weather content inside poster container');
  assert.strictEqual(sunnyCard.querySelector('.ct-weather-gallery-stitch__headline'), null, 'Gallery card should not duplicate weather headline');
  assert.strictEqual(sunnyCard.querySelector('.ct-weather-gallery-stitch__locale'), null, 'Gallery card should not duplicate locale label');
  assert.strictEqual(sunnyCard.querySelector('.ct-weather-gallery-stitch__location'), null, 'Gallery card should not render separate location pill');
  assert.ok(sunnyCard.querySelector('.ct-weather-gallery-stitch__footer'), 'Gallery card should render poster footer container');
  assert.strictEqual(sunnyCard.querySelector('.ct-home-weather__caption').textContent.trim(), 'Shanghai · Sunny', 'Gallery card should use location · weather caption');

  [
    'sandstorm.png',
    'sunny.png',
    'clear-night.png',
    'cloudy.png',
    'cloudy-soft.png',
    'rainy.png',
    'foggy.png',
    'snowy.png',
    'stormy.png',
    'hail.png',
    'windy.png'
  ].forEach((asset) => {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'weather', asset)), `Expected cropped asset ${asset} to exist`);
  });
}

main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exit(1);
});
