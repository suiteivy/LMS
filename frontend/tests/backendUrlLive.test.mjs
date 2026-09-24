import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mirror to test the exact logic in backendUrl.ts under all environments
const createUrlResolver = ({ os, isDevice, expoHost, linkingUri, envUrl, isDev = true }) => {
  const getExpoDevHost = () => {
    if (expoHost && typeof expoHost === 'string' && expoHost.trim().length > 0) {
      const host = expoHost.split(':')[0].trim();
      if (host && !host.startsWith('169.254.')) {
        return host;
      }
    }
    if (typeof linkingUri === 'string' && linkingUri.includes('://')) {
      const match = linkingUri.match(/:\/\/([^/:]+)/);
      if (match && match[1] && !match[1].startsWith('169.254.')) {
        return match[1].trim();
      }
    }
    return null;
  };

  const resolveDevHost = () => {
    if (os === 'web') return 'localhost';
    const detectedHost = getExpoDevHost();
    if (isDevice) {
      if (detectedHost && detectedHost !== 'localhost' && detectedHost !== '127.0.0.1') {
        return detectedHost;
      }
      return detectedHost || '192.168.100.25';
    }
    if (os === 'android') {
      if (detectedHost && detectedHost !== 'localhost' && detectedHost !== '127.0.0.1' && !detectedHost.startsWith('10.0.2.')) {
        return detectedHost;
      }
      return '10.0.2.2';
    }
    if (os === 'ios') return 'localhost';
    return detectedHost || 'localhost';
  };

  const getApiBaseUrl = () => {
    let url = envUrl;
    if (isDev && os !== 'web') {
      const devHost = resolveDevHost();
      if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        url = url.replace(/localhost|127\.0\.0\.1/g, devHost);
      }
      if (!url) url = `http://${devHost}:4001`;
    }
    if (!url) {
      if (isDev) {
        url = `http://${resolveDevHost()}:4001`;
      } else {
        url = 'https://api.cloudora.app';
      }
    }
    url = url.trim().replace(/\/+$/, '').replace(/\/api$/i, '').replace(/\/+$/, '');
    return `${url}/api`;
  };

  return { getExpoDevHost, resolveDevHost, getApiBaseUrl };
};

test('Physical device resolves to Metro LAN IP', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'android',
    isDevice: true,
    expoHost: '192.168.100.25:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://192.168.100.25:4001/api');
});

test('Android emulator resolves to 10.0.2.2 alias', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'android',
    isDevice: false,
    expoHost: 'localhost:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://10.0.2.2:4001/api');
});

test('iOS simulator preserves localhost', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'ios',
    isDevice: false,
    expoHost: 'localhost:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://localhost:4001/api');
});

test('Web browser preserves localhost', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'web',
    isDevice: false,
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://localhost:4001/api');
});

test('Link-local 169.254.x.x is rejected and safely falls back', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'android',
    isDevice: false,
    expoHost: '169.254.62.68:8081',
    envUrl: 'http://localhost:4001',
  });
  // Must NOT contain 169.254
  assert.ok(!getApiBaseUrl().includes('169.254'));
  assert.equal(getApiBaseUrl(), 'http://10.0.2.2:4001/api');
});

test('Live Backend responds to /api/settings/maintenance via localhost', async () => {
  const res = await fetch('http://localhost:4001/api/settings/maintenance');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.enabled, 'boolean');
});

test('Live Backend responds to /api/settings/maintenance via LAN IP (192.168.100.25)', async () => {
  const res = await fetch('http://192.168.100.25:4001/api/settings/maintenance');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.enabled, 'boolean');
});
