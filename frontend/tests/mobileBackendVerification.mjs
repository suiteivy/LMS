import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ── Test 1: AndroidManifest.xml Cleartext Configuration ──────────────────────────
test('AndroidManifest.xml includes android:usesCleartextTraffic="true"', () => {
  const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  assert.ok(
    manifestContent.includes('android:usesCleartextTraffic="true"'),
    'AndroidManifest.xml MUST declare android:usesCleartextTraffic="true" for HTTP on Android API 28+'
  );
});

// ── Test 2: app.json Cleartext & Transport Security ──────────────────────────────
test('app.json includes usesCleartextTraffic: true for Android and ATS for iOS', () => {
  const appJsonPath = path.resolve('app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  assert.equal(
    appJson.expo.android.usesCleartextTraffic,
    true,
    'app.json expo.android.usesCleartextTraffic MUST be true'
  );

  assert.equal(
    appJson.expo.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads,
    true,
    'app.json expo.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads MUST be true'
  );
});

// ── Test 3: Backend URL Resolution Logic Simulation ──────────────────────────────
const simulateUrlResolution = ({
  platform,
  isDevice,
  scriptURL,
  hostUri,
  linkingUri,
  envApiUrl = 'http://localhost:4001',
}) => {
  const getExpoDevHost = () => {
    if (typeof scriptURL === 'string' && scriptURL.includes('://')) {
      const match = scriptURL.match(/:\/\/([^/:]+)/);
      if (match && match[1]) {
        const host = match[1].trim();
        if (host && !host.startsWith('169.254.') && host !== 'localhost' && host !== '127.0.0.1') {
          return host;
        }
      }
    }
    if (typeof hostUri === 'string' && hostUri.trim().length > 0) {
      const host = hostUri.split(':')[0].trim();
      if (host && !host.startsWith('169.254.')) {
        return host;
      }
    }
    if (typeof linkingUri === 'string' && linkingUri.includes('://')) {
      const match = linkingUri.match(/:\/\/([^/:]+)/);
      if (match && match[1]) {
        const host = match[1].trim();
        if (host && !host.startsWith('169.254.')) {
          return host;
        }
      }
    }
    return null;
  };

  const resolveDevHost = () => {
    if (platform === 'web') return 'localhost';
    const expoHost = getExpoDevHost();
    const isPhysical = isDevice ?? false;

    if (isPhysical) {
      if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
        return expoHost;
      }
      return '192.168.100.25';
    }

    if (platform === 'android') {
      if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1' && !expoHost.startsWith('10.0.2.')) {
        return expoHost;
      }
      return '192.168.100.25';
    }

    if (platform === 'ios') {
      if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
        return expoHost;
      }
      return 'localhost';
    }

    return expoHost || '192.168.100.25';
  };

  const getApiBaseUrl = () => {
    let url = envApiUrl;
    if (platform !== 'web') {
      const devHost = resolveDevHost();
      if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        url = url.replace(/localhost|127\.0\.0\.1/g, devHost);
      }
    }
    url = url.trim().replace(/\/+$/, '').replace(/\/api$/i, '').replace(/\/+$/, '');
    return `${url}/api`;
  };

  return {
    devHost: resolveDevHost(),
    apiBaseUrl: getApiBaseUrl(),
  };
};

test('Mobile resolution: Android physical device with NativeModules.SourceCode.scriptURL', () => {
  const result = simulateUrlResolution({
    platform: 'android',
    isDevice: true,
    scriptURL: 'http://192.168.100.25:8081/index.bundle?platform=android&dev=true',
  });
  assert.equal(result.devHost, '192.168.100.25');
  assert.equal(result.apiBaseUrl, 'http://192.168.100.25:4001/api');
});

test('Mobile resolution: Android device with no Constants host falls back safely to workstation LAN IP', () => {
  const result = simulateUrlResolution({
    platform: 'android',
    isDevice: true,
    scriptURL: null,
    hostUri: null,
  });
  assert.equal(result.devHost, '192.168.100.25');
  assert.equal(result.apiBaseUrl, 'http://192.168.100.25:4001/api');
});

test('Mobile resolution: iOS device with Metro bundle URL', () => {
  const result = simulateUrlResolution({
    platform: 'ios',
    isDevice: true,
    scriptURL: 'http://192.168.100.25:8081/index.bundle?platform=ios&dev=true',
  });
  assert.equal(result.devHost, '192.168.100.25');
  assert.equal(result.apiBaseUrl, 'http://192.168.100.25:4001/api');
});

// ── Test 4: Live HTTP Network Test to Backend over LAN IP ─────────────────────────
test('Live Backend responds to mobile endpoints via LAN IP (192.168.100.25:4001)', async () => {
  const baseUrl = 'http://192.168.100.25:4001/api';

  // 1. Maintenance endpoint (cold-start test)
  const maintenanceRes = await fetch(`${baseUrl}/settings/maintenance`, {
    headers: { Accept: 'application/json' },
  });
  assert.equal(maintenanceRes.status, 200, 'Maintenance endpoint should return 200 OK');
  const maintenanceData = await maintenanceRes.json();
  assert.equal(typeof maintenanceData.enabled, 'boolean', 'Maintenance should contain boolean enabled flag');
  assert.equal(
    maintenanceRes.headers.get('access-control-allow-origin'),
    '*',
    'CORS header Access-Control-Allow-Origin must be *'
  );

  // 2. Currency endpoint
  const currencyRes = await fetch(`${baseUrl}/settings/currency`, {
    headers: { Accept: 'application/json' },
  });
  assert.equal(currencyRes.status, 200, 'Currency endpoint should return 200 OK');
  const currencyData = await currencyRes.json();
  assert.ok(currencyData.KES !== undefined, 'Currency response should contain KES rate');
});
