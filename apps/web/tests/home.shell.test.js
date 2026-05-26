const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

function formatLocalDateISO(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

runTest('New 首页应包含第一阶段 Home 壳层关键区域', () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const selectors = [
    '#app',
    '[data-ct-topbar]',
    '[data-ct-weather]',
    '[data-ct-schedule]',
    '[data-ct-secondary-tabs]',
    '[data-ct-recommend-feed]',
    '[data-ct-bottom-nav]',
    '[data-ct-detail]'
  ];

  for (const selector of selectors) {
    const node = doc.querySelector(selector);
    assert.ok(node, `Missing selector: ${selector}`);
  }
});

runTest('New 首页应默认渲染 Recommend 卡片并支持切换到 Featured', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href;
  const { renderHomePage } = await import(modulePath);

  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const initialTitles = Array.from(dom.window.document.querySelectorAll('.ct-feed-card__title')).map((node) => node.textContent.trim());
  assert.ok(initialTitles.includes('Urban Commute'));

  const featuredTab = dom.window.document.querySelector('[data-tab-key="featured"]');
  assert.ok(featuredTab, 'Missing featured tab');
  featuredTab.click();

  const nextTitles = Array.from(dom.window.document.querySelectorAll('.ct-feed-card__title')).map((node) => node.textContent.trim());
  assert.ok(nextTitles.includes('Runway Analysis'));
  assert.ok(!nextTitles.includes('Urban Commute'));
});

runTest('New 首页 tabs 与推荐流应具备语义结构且图片走本地资源', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href;
  const { renderHomePage } = await import(modulePath);

  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const tablist = dom.window.document.querySelector('[data-ct-secondary-tabs] [role="tablist"]');
  assert.ok(tablist, 'Missing tablist role');

  const track = dom.window.document.querySelector('.ct-tab-list__track');
  assert.ok(track, 'Missing segmented track');

  const activeTab = dom.window.document.querySelector('[data-ct-secondary-tabs] [role="tab"][aria-selected="true"]');
  assert.ok(activeTab, 'Missing active tab aria-selected');
  assert.ok(/Recommend/i.test(activeTab.textContent));

  const tabpanel = dom.window.document.querySelector('[data-ct-recommend-feed][role="tabpanel"]');
  assert.ok(tabpanel, 'Missing tabpanel role');

  const feedList = dom.window.document.querySelector('.ct-feed-list');
  assert.ok(feedList, 'Missing feed list');
  assert.ok(feedList.matches('ul'), 'Feed should use ul');

  const image = dom.window.document.querySelector('.ct-feed-card__image');
  assert.ok(image, 'Missing feed image');
  assert.ok(!/^https?:/i.test(image.getAttribute('src')), 'Feed image should use local asset');
});

runTest('New 首页推荐卡片应使用更紧凑的图片占比与内容留白', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'pages', 'home.css'), 'utf8');

  assert.match(css, /\.ct-feed-card__media[\s\S]*aspect-ratio:\s*4\s*\/\s*4\.1;/, 'Home feed card image should use a tighter portrait crop');
  assert.match(css, /\.ct-feed-card__content[\s\S]*padding:\s*16px\s+18px\s+18px;/, 'Home feed card content should be more compact');
  assert.match(css, /\.ct-feed-card__title[\s\S]*font-size:\s*28px;/, 'Home feed card title should be slightly smaller');
});

runTest('New 首页应跟随 app_locale 切换主要文案', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  dom.window.localStorage.setItem('app_locale', 'zh-CN');
  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.navigator = dom.window.navigator;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href;
  const { renderHomePage } = await import(modulePath);

  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(dom.window.document.documentElement.lang, 'zh-CN');
  assert.ok(/推荐/.test(dom.window.document.querySelector('[data-tab-key="recommend"]').textContent));
  assert.ok(/首页/.test(dom.window.document.querySelector('.ct-bottom-nav').textContent));
});

runTest('New 首页卡片应把详情阅读交给独立页入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href;
  const { renderHomePage } = await import(modulePath);

  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const detailRoot = dom.window.document.querySelector('[data-ct-detail]');
  assert.ok(detailRoot, 'Missing legacy detail root');
  assert.ok(!detailRoot.classList.contains('is-open'), 'Legacy detail layer should stay closed');

  const firstLink = dom.window.document.querySelector('[data-ct-look-link]');
  assert.ok(firstLink, 'Missing outfit detail link');
  assert.strictEqual(firstLink.getAttribute('href'), 'outfit-detail.html?id=urban-commute');
});

runTest('New 首页卡片主体应提供 Outfit Detail 独立页入口', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const firstLink = dom.window.document.querySelector('[data-ct-look-link]');
  assert.ok(firstLink, 'Missing outfit detail link');
  assert.strictEqual(firstLink.getAttribute('href'), 'outfit-detail.html?id=urban-commute');
});

runTest('New 首页应支持收藏推荐与精选穿搭', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const favoriteButton = dom.window.document.querySelector('.ct-feed-card__favorite');
  assert.ok(favoriteButton, 'Missing look favorite button');
  favoriteButton.click();

  let stored = JSON.parse(dom.window.localStorage.getItem('ct_favorites'));
  let storedFavorites = stored.users?.guest || stored;
  assert.ok(storedFavorites.looks.some((item) => item.id === 'urban-commute'), 'Recommend look should be saved');

  dom.window.document.querySelector('[data-tab-key="featured"]').click();
  dom.window.document.querySelector('.ct-feed-card__favorite').click();

  stored = JSON.parse(dom.window.localStorage.getItem('ct_favorites'));
  storedFavorites = stored.users?.guest || stored;
  assert.ok(storedFavorites.looks.some((item) => item.id === 'runway-analysis'), 'Featured look should be saved');
});

runTest('共享底部 dock 应由 shell 层处理安全区贴底', () => {
  const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'layout.css'), 'utf8');

  assert.ok(/padding-bottom:\s*calc\(112px \+ env\(safe-area-inset-bottom\)\)/.test(layoutCss), 'ct-app should reserve safe area');
  assert.ok(/\.ct-bottom-shell[\s\S]*env\(safe-area-inset-bottom\)/.test(layoutCss), 'ct-bottom-shell should handle safe area');
  assert.ok(/100dvh/.test(layoutCss), 'Layout should use dynamic viewport height');
  assert.ok(/\.ct-bottom-shell::before/.test(layoutCss), 'Bottom shell should use pseudo element background');
  assert.ok(/@media\s*\(min-width:\s*1024px\)[\s\S]*\.ct-app[\s\S]*padding-bottom:\s*0/.test(layoutCss), 'Desktop app shell should not keep mobile bottom padding');
  assert.ok(/@media\s*\(min-width:\s*1024px\)[\s\S]*\.ct-bottom-shell[\s\S]*display:\s*none/.test(layoutCss), 'Desktop should hide bottom shell');
});

runTest('Home 顶部无菜单实现时应使用空占位壳', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?placeholder=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const placeholder = dom.window.document.querySelector('.ct-topbar .ct-icon-button.is-placeholder');
  assert.ok(placeholder, 'Home topbar should render placeholder shell');
  assert.strictEqual(placeholder.textContent.trim(), '');
});

runTest('New 首页温度展示应跟随 temperature_unit 偏好切换', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const celsiusDom = new JSDOM(html, { url: 'http://localhost/' });
  celsiusDom.window.localStorage.setItem('temperature_unit', 'celsius');
  global.window = celsiusDom.window;
  global.document = celsiusDom.window.document;
  global.localStorage = celsiusDom.window.localStorage;
  global.CustomEvent = celsiusDom.window.CustomEvent;
  global.HTMLElement = celsiusDom.window.HTMLElement;
  global.Node = celsiusDom.window.Node;

  const celsiusModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?temp=1`;
  const { renderHomePage } = await import(celsiusModulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.ok(/20°C/.test(celsiusDom.window.document.querySelector('.ct-home-weather__temp').textContent), 'Home should render celsius temperature');
  assert.ok(/▼/.test(celsiusDom.window.document.querySelector('[data-ct-weather]').textContent), 'Home should render low temperature arrow');
  assert.ok(/▲/.test(celsiusDom.window.document.querySelector('[data-ct-weather]').textContent), 'Home should render high temperature arrow');
  assert.ok(/9°C/.test(celsiusDom.window.document.querySelector('[data-ct-weather]').textContent), 'Home should render celsius low temperature');
  assert.ok(/21°C/.test(celsiusDom.window.document.querySelector('[data-ct-weather]').textContent), 'Home should render celsius high temperature');
  const weatherCard = celsiusDom.window.document.querySelector('.ct-home-weather');
  assert.ok(weatherCard, 'Home should render the weather card');
  assert.ok(weatherCard.classList.contains('ct-home-weather--compact'), 'Home should render the compact weather card layout marker');
  assert.strictEqual(weatherCard.querySelector('.ct-home-weather__art'), null, 'Home should not render an inner weather art wrapper');
  assert.strictEqual(weatherCard.querySelector('.ct-home-weather__art-visual'), null, 'Home should not render an inner weather art visual wrapper');
  assert.strictEqual(celsiusDom.window.document.querySelector('.ct-home-weather__primary'), null, 'Home should remove the old dedicated primary text wrapper');
  assert.strictEqual(weatherCard.querySelector('.ct-home-weather__condition'), null, 'Home should not render a standalone weather condition node');
  assert.ok(Array.from(weatherCard.children).some((node) => node.classList?.contains('ct-home-weather__temp')), 'Home should render the temperature as a direct child of the weather card');
  assert.ok(Array.from(weatherCard.children).some((node) => node.classList?.contains('ct-home-weather__range')), 'Home should render the temperature range as a direct child of the weather card');
  const caption = weatherCard.querySelector('.ct-home-weather__caption');
  assert.ok(caption, 'Home should render a merged compact weather caption');
  assert.ok(/^(纽约·多云|New York·Cloudy)$/.test(caption.textContent.trim()), 'Home should merge location and condition into a compact caption');
  assert.strictEqual(weatherCard.getAttribute('data-weather-art'), 'cloudy', 'Home should map cloudy weather to the cloudy illustration variant');

  const fahrenheitDom = new JSDOM(html, { url: 'http://localhost/' });
  fahrenheitDom.window.localStorage.setItem('temperature_unit', 'fahrenheit');
  global.window = fahrenheitDom.window;
  global.document = fahrenheitDom.window.document;
  global.localStorage = fahrenheitDom.window.localStorage;
  global.CustomEvent = fahrenheitDom.window.CustomEvent;
  global.HTMLElement = fahrenheitDom.window.HTMLElement;
  global.Node = fahrenheitDom.window.Node;

  const fahrenheitModulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?temp=2`;
  const { renderHomePage: renderFahrenheitHomePage } = await import(fahrenheitModulePath);
  renderFahrenheitHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.ok(/68°F/.test(fahrenheitDom.window.document.querySelector('.ct-home-weather__temp').textContent), 'Home should render fahrenheit temperature');
  assert.ok(/48°F/.test(fahrenheitDom.window.document.querySelector('[data-ct-weather]').textContent), 'Home should render fahrenheit low temperature');
  assert.ok(/70°F/.test(fahrenheitDom.window.document.querySelector('[data-ct-weather]').textContent), 'Home should render fahrenheit high temperature');
});

runTest('New 首页应在定位成功后切换为解析出的范围天气摘要', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  Object.defineProperty(dom.window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 18
          }
        });
      }
    }
  });

  dom.window.fetch = async (url) => {
    if (typeof url === 'string' && /reverse-geocode/i.test(url)) {
      return {
        ok: true,
        status: 200,
        headers: {
          get(name) {
            return name.toLowerCase() === 'content-type' ? 'application/json' : null;
          }
        },
        async json() {
          return {
            city: 'Shanghai',
            locality: 'Xuhui'
          };
        }
      };
    }

    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === 'content-type' ? 'application/json' : null;
        }
      },
      async json() {
        if (url === '/api/favorites') return { favorites: { looks: [], posts: [] } };
        if (url === '/api/wardrobe') return { items: [] };
        if (url === '/api/schedules') return { items: [] };
        return {};
      }
    };
  };
  dom.window.isSecureContext = true;

  global.window = dom.window;
  global.fetch = dom.window.fetch;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?location=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  await new Promise((resolve) => setTimeout(resolve, 0));

  const weatherCaption = dom.window.document.querySelector('.ct-home-weather__caption').textContent;
  assert.ok(/Xuhui|徐汇/.test(weatherCaption), 'Home should switch weather summary to resolved range after location succeeds');
});

runTest('New 首页在非安全上下文下应回退到 IP 城市天气摘要', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://10.20.80.192:8080/' });

  dom.window.fetch = async (url) => {
    if (typeof url === 'string' && /ipwho\.is/i.test(url)) {
      return {
        ok: true,
        status: 200,
        headers: {
          get(name) {
            return name.toLowerCase() === 'content-type' ? 'application/json' : null;
          }
        },
        async json() {
          return {
            success: true,
            city: 'Shanghai',
            latitude: 31.2304,
            longitude: 121.4737
          };
        }
      };
    }

    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === 'content-type' ? 'application/json' : null;
        }
      },
      async json() {
        if (typeof url === 'string' && /\/api\/favorites$/.test(url)) return { favorites: { looks: [], posts: [] } };
        if (typeof url === 'string' && /\/api\/wardrobe$/.test(url)) return { items: [] };
        if (typeof url === 'string' && /\/api\/schedules$/.test(url)) return { items: [] };
        return {};
      }
    };
  };
  dom.window.isSecureContext = false;

  global.window = dom.window;
  global.fetch = dom.window.fetch;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?location-ip-fallback=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  await new Promise((resolve) => setTimeout(resolve, 0));

  const weatherCaption = dom.window.document.querySelector('.ct-home-weather__caption').textContent;
  assert.ok(/Shanghai|上海/.test(weatherCaption), 'Home should switch weather summary to IP-based city on insecure context');
});

runTest('New 首页应把繁体地区名显示为简体范围文案', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  dom.window.localStorage.setItem('app_locale', 'zh-CN');

  Object.defineProperty(dom.window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 39.9042,
            longitude: 116.4074,
            accuracy: 12
          }
        });
      }
    }
  });

  dom.window.fetch = async (url) => {
    if (typeof url === 'string' && /reverse-geocode/i.test(url)) {
      return {
        ok: true,
        status: 200,
        headers: {
          get(name) {
            return name.toLowerCase() === 'content-type' ? 'application/json' : null;
          }
        },
        async json() {
          return {
            city: 'Beijing',
            locality: '朝陽區'
          };
        }
      };
    }

    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === 'content-type' ? 'application/json' : null;
        }
      },
      async json() {
        if (typeof url === 'string' && /\/api\/favorites$/.test(url)) return { favorites: { looks: [], posts: [] } };
        if (typeof url === 'string' && /\/api\/wardrobe$/.test(url)) return { items: [] };
        if (typeof url === 'string' && /\/api\/schedules$/.test(url)) return { items: [] };
        return {};
      }
    };
  };
  dom.window.isSecureContext = true;

  global.window = dom.window;
  global.fetch = dom.window.fetch;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?location-zh-normalize=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const weatherCaption = dom.window.document.querySelector('.ct-home-weather__caption').textContent;
  assert.ok(/朝阳区附近/.test(weatherCaption), 'Home should normalize Traditional Chinese district labels to Simplified Chinese');
});

runTest('New 首页日程卡片应读取持久化 Schedule 摘要', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    users: {
      guest: {
        views: {
          upcoming: {
            groups: [
              {
                dateISO: formatLocalDateISO(1),
                day: formatLocalDateISO(1).slice(8, 10),
                label: 'Date Window',
                events: [
                  {
                    id: 'atelier-review',
                    dateISO: formatLocalDateISO(1),
                    time: '08:30 AM — 09:30 AM',
                    title: 'Atelier Review',
                    location: 'Lower East Studio',
                    image: '/uploads/shared/editorial-look-02.jpg',
                    tags: ['Outerwear']
                  }
                ]
              }
            ]
          },
          travel: { groups: [] },
          archive: { groups: [] }
        }
      }
    }
  }));

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?schedule-summary=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const scheduleText = dom.window.document.querySelector('[data-ct-schedule]').textContent;
  assert.ok(/Atelier Review/.test(scheduleText), 'Home schedule card should read persisted title');
  assert.ok(/Lower East Studio/.test(scheduleText), 'Home schedule card should read persisted location');
  assert.ok(/08:30 AM/.test(scheduleText), 'Home schedule card should read persisted time');
});

runTest('New 首页日程卡片应读取真实最近的跨 tab 事件', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    users: {
      guest: {
        views: {
          upcoming: {
            groups: [
              {
                dateISO: formatLocalDateISO(2),
                day: formatLocalDateISO(2).slice(8, 10),
                label: 'Date Window',
                events: [
                  {
                    id: 'late-upcoming',
                    dateISO: formatLocalDateISO(2),
                    time: '11:00 AM — 12:00 PM',
                    title: 'Late Upcoming',
                    location: 'Studio West',
                    image: '/uploads/shared/editorial-look-02.jpg',
                    tags: ['Review']
                  }
                ]
              }
            ]
          },
          travel: {
            groups: [
              {
                dateISO: formatLocalDateISO(1),
                day: formatLocalDateISO(1).slice(8, 10),
                label: 'Date Window',
                events: [
                  {
                    id: 'early-travel',
                    dateISO: formatLocalDateISO(1),
                    time: '07:30 AM — 09:00 AM',
                    title: 'Early Travel',
                    location: 'Terminal 1',
                    image: '/uploads/shared/travel-look.jpg',
                    tags: ['Travel']
                  }
                ]
              }
            ]
          },
          archive: { groups: [] }
        }
      }
    }
  }));

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?schedule-order=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const scheduleText = dom.window.document.querySelector('[data-ct-schedule]').textContent;
  assert.ok(/Early Travel/.test(scheduleText), 'Home schedule card should prefer the nearest event across tabs');
});

runTest('New 首页推荐应统一接入 favorites、wardrobe、schedule、settings 信号', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/' });

  dom.window.localStorage.setItem('ct_favorites', JSON.stringify({
    version: 1,
    users: {
      guest: {
        looks: [
          {
            id: 'urban-commute',
            title: 'Urban Commute',
            subtitle: 'Saved already',
            image: '/uploads/shared/copenhagen-minimalist.jpg',
            href: 'outfit-detail.html?id=urban-commute'
          }
        ],
        posts: []
      }
    }
  }));
  dom.window.localStorage.setItem('ct_wardrobe', JSON.stringify({
    version: 1,
    users: {
      guest: [
        {
          id: 'coat-1',
          title: 'Archive Coat',
          category: 'Outerwear',
          material: 'Virgin Wool',
          color: 'Black',
          image: '/uploads/shared/editorial-look-01.jpg',
          filter: 'essentials',
          favorite: true
        }
      ]
    }
  }));
  dom.window.localStorage.setItem('ct_schedule', JSON.stringify({
    version: 1,
    users: {
      guest: {
        views: {
          upcoming: {
            groups: [
              {
                day: '09',
                label: 'Apr / Wed',
                events: [
                  {
                    id: 'review-call',
                    time: '08:30 AM — 09:30 AM',
                    title: 'Product Review',
                    location: 'SoHo Studio',
                    tags: ['Outerwear']
                  }
                ]
              }
            ]
          },
          travel: { groups: [] },
          archive: { groups: [] }
        }
      }
    }
  }));
  dom.window.localStorage.setItem('ct_settings', JSON.stringify({
    version: 1,
    users: {
      guest: {
        language: 'en-US',
        'display-mode': 'dark',
        'wardrobe-layout': 'list',
        'temperature-unit': 'fahrenheit',
        'public-profile': true,
        'outfit-reminders': true
      }
    }
  }));

  global.window = dom.window;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?recommendation-input=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();
  await new Promise(resolve => setTimeout(resolve, 100));

  const titles = Array.from(dom.window.document.querySelectorAll('.ct-feed-card__title')).map((node) => node.textContent.trim());
  assert.strictEqual(titles[0], 'Midnight Formalism');
  assert.strictEqual(titles[titles.length - 1], 'Urban Commute');
});

runTest('New 首页收藏 model2 推荐时应保存模型 look 本身', async () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost:8140/index.html' });

  dom.window.localStorage.setItem('ct_auth_session', JSON.stringify({
    user: {
      id: 'user-model2',
      name: 'Model User',
      emailOrMobile: 'model@example.com'
    }
  }));

  dom.window.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;
    if (url === '/api/closettwin/recommendations/daily') {
      assert.strictEqual(body.model1.source, 'wardrobe-ai-json');
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        async json() {
          return {
            ok: true,
            status: 'ready',
            data: {
              recommendations: [
                {
                  outfitId: 'model2-look',
                  outfitName: 'Model2 Look',
                  reason: 'Matched to real schedule and wardrobe',
                  imageUrl: '/uploads/shared/travel-look.jpg',
                  items: [
                    { name: 'Rain Trench', category: 'Outerwear', color: 'Onyx', material: 'Wool Blend' }
                  ]
                }
              ]
            },
            error: null
          };
        }
      };
    }

    return {
      ok: true,
      status: method === 'POST' ? 201 : 200,
      headers: { get: () => 'application/json' },
      async json() {
        if (url === '/api/favorites' && method === 'GET') return { favorites: { looks: [], posts: [] } };
        if (url === '/api/favorites' && method === 'POST') return { favorites: { looks: [body.item], posts: [] } };
        if (url === '/api/wardrobe') return { items: [] };
        if (url === '/api/schedules') return { items: [] };
        if (String(url).startsWith('/api/home/content')) return {};
        if (String(url).startsWith('/api/schedules/content')) return {};
        return {};
      }
    };
  };

  global.window = dom.window;
  global.fetch = dom.window.fetch;
  global.window.fetch = global.fetch;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'pages', 'homePage.js')).href}?model2-favorite=1`;
  const { renderHomePage } = await import(modulePath);
  renderHomePage();

  for (let index = 0; index < 20; index += 1) {
    const titleText = Array.from(dom.window.document.querySelectorAll('.ct-feed-card__title')).map((node) => node.textContent.trim()).join(' ');
    if (/Model2 Look/.test(titleText)) break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  assert.ok(/Model2 Look/.test(dom.window.document.body.textContent), 'Home should render model2 recommendation before favorite action');
  const favoriteButton = dom.window.document.querySelector('.ct-feed-card__favorite');
  assert.ok(favoriteButton, 'Missing model2 favorite button');
  favoriteButton.click();

  const stored = JSON.parse(dom.window.localStorage.getItem('ct_favorites'));
  const savedLooks = stored.users['user-model2'].looks;
  assert.strictEqual(savedLooks[0].id, 'model2-look');
  assert.strictEqual(savedLooks[0].title, 'Model2 Look');
  assert.strictEqual(savedLooks[0].href, 'outfit-detail.html?id=model2-look');
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
