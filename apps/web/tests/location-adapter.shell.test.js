const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn });
}

runTest('location adapter 默认应返回 unsupported capability', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'locationAdapter.js')).href}?adapter=1`;
  const { createLocationAdapter } = await import(modulePath);

  const adapter = createLocationAdapter();
  const capability = adapter.getLocationCapability();
  const currentLocation = await adapter.getCurrentLocation();

  assert.strictEqual(capability.supported, false);
  assert.strictEqual(currentLocation.ok, false);
  assert.strictEqual(currentLocation.kind, 'unsupported');
});

runTest('location adapter 应支持 geolocation 成功与 denied 语义', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'locationAdapter.js')).href}?adapter-success=1`;
  const { createLocationAdapter } = await import(modulePath);

  const successAdapter = createLocationAdapter({
    secureContext: true,
    geolocation: {
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 32
          }
        });
      }
    }
  });

  const deniedAdapter = createLocationAdapter({
    secureContext: true,
    geolocation: {
      getCurrentPosition(_success, failure) {
        failure({
          code: 1,
          message: 'Permission denied'
        });
      }
    }
  });

  const successResult = await successAdapter.getCurrentLocation();
  const deniedResult = await deniedAdapter.getCurrentLocation();

  assert.strictEqual(successAdapter.getLocationCapability().supported, true);
  assert.strictEqual(successResult.ok, true);
  assert.strictEqual(successResult.coords.latitude, 40.7128);
  assert.strictEqual(deniedResult.ok, false);
  assert.strictEqual(deniedResult.kind, 'denied');
});

runTest('location adapter 应区分 insecure context 并支持范围化位置解析', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'locationAdapter.js')).href}?adapter-recovery=1`;
  const { createLocationAdapter } = await import(modulePath);

  const insecureAdapter = createLocationAdapter({
    geolocation: {
      getCurrentPosition() {}
    },
    secureContext: false
  });

  const cityAdapter = createLocationAdapter({
    secureContext: true,
    geolocation: {
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 31.2304,
            longitude: 121.4737,
            accuracy: 24
          }
        });
      }
    },
    reverseGeocode: async ({ latitude, longitude, locale }) => ({
      ok: true,
      cityLabel: locale === 'zh-CN' ? '上海' : 'Shanghai',
      districtLabel: locale === 'zh-CN' ? '徐汇区' : 'Xuhui'
    })
  });

  const insecureCapability = insecureAdapter.getLocationCapability();
  const insecureResult = await insecureAdapter.getCurrentLocation();
  const cityResult = await cityAdapter.getCurrentLocation('zh-CN');

  assert.strictEqual(insecureCapability.kind, 'insecure-context');
  assert.strictEqual(insecureResult.ok, false);
  assert.strictEqual(insecureResult.kind, 'insecure-context');
  assert.strictEqual(cityResult.ok, true);
  assert.strictEqual(cityResult.place.cityLabel, '上海');
  assert.strictEqual(cityResult.place.rangeLabel, '徐汇区附近');
  assert.strictEqual(cityResult.place.precision, 'precise');
});

runTest('location adapter 在 zh-CN 下应把繁体地区名归一为简体', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'locationAdapter.js')).href}?adapter-zh-normalize=1`;
  const { createLocationAdapter } = await import(modulePath);

  const adapter = createLocationAdapter({
    secureContext: true,
    geolocation: {
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 39.9042,
            longitude: 116.4074,
            accuracy: 20
          }
        });
      }
    },
    reverseGeocode: async () => ({
      ok: true,
      cityLabel: '北京',
      districtLabel: '朝陽區'
    })
  });

  const result = await adapter.getCurrentLocation('zh-CN');
  assert.strictEqual(result.place.rangeLabel, '朝阳区附近');
});

runTest('location adapter 应在 insecure context 下回退到 IP 城市定位', async () => {
  const modulePath = `${pathToFileURL(path.join(__dirname, '..', 'js', 'lib', 'locationAdapter.js')).href}?adapter-ip-fallback=1`;
  const { createLocationAdapter } = await import(modulePath);

  const adapter = createLocationAdapter({
    secureContext: false,
    ipLocate: async ({ locale }) => ({
      ok: true,
      cityLabel: locale === 'zh-CN' ? '上海' : 'Shanghai',
      coords: {
        latitude: 31.2304,
        longitude: 121.4737
      }
    })
  });

  const location = await adapter.getCurrentLocation('zh-CN');
  assert.strictEqual(location.ok, true);
  assert.strictEqual(location.kind, 'ip-geolocation');
  assert.strictEqual(location.place.cityLabel, '上海');
  assert.strictEqual(location.place.rangeLabel, '上海');
  assert.strictEqual(location.place.precision, 'approximate');
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
