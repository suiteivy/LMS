import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';

// Helper mirror to test the exact logic in backendUrl.ts under all environments
const createUrlResolver = ({
  os,
  isPhysical = false,
  expoHost,
  linkingUri,
  envUrl,
  isDev = true,
  fallbackLanIp = '192.168.100.83'
}) => {
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

    if (isPhysical) {
      if (detectedHost && !detectedHost.startsWith('10.0.2.') && !detectedHost.startsWith('169.254.')) {
        if (detectedHost === 'localhost' || detectedHost === '127.0.0.1') {
          return '127.0.0.1';
        }
        return detectedHost;
      }
      return fallbackLanIp;
    }

    if (os === 'android') {
      if (detectedHost && detectedHost !== 'localhost' && detectedHost !== '127.0.0.1' && !detectedHost.startsWith('169.254.')) {
        return detectedHost;
      }
      return '10.0.2.2';
    }

    if (os === 'ios') {
      if (detectedHost && detectedHost !== 'localhost' && detectedHost !== '127.0.0.1' && !detectedHost.startsWith('169.254.')) {
        return detectedHost;
      }
      return 'localhost';
    }

    return detectedHost || fallbackLanIp;
  };

  const getFallbackDevHost = () => {
    if (os === 'web') return null;
    const currentHost = resolveDevHost();
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return fallbackLanIp;
    }
    if (currentHost === fallbackLanIp) {
      return '127.0.0.1';
    }
    return fallbackLanIp;
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

  const getFallbackApiBaseUrl = () => {
    const fallbackHost = getFallbackDevHost();
    if (!fallbackHost) return getApiBaseUrl();
    const currentHost = resolveDevHost();
    return getApiBaseUrl().replace(currentHost, fallbackHost);
  };

  return { getExpoDevHost, resolveDevHost, getFallbackDevHost, getApiBaseUrl, getFallbackApiBaseUrl };
};

test('Physical device with USB adb reverse (localhost) resolves to 127.0.0.1:4001/api', () => {
  const { getApiBaseUrl, getFallbackApiBaseUrl } = createUrlResolver({
    os: 'android',
    isPhysical: true,
    expoHost: 'localhost:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://127.0.0.1:4001/api');
  assert.equal(getFallbackApiBaseUrl(), 'http://192.168.100.83:4001/api');
});

test('Physical device with Wi-Fi Metro host resolves to LAN IP', () => {
  const { getApiBaseUrl, getFallbackApiBaseUrl } = createUrlResolver({
    os: 'android',
    isPhysical: true,
    expoHost: '192.168.100.83:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://192.168.100.83:4001/api');
  assert.equal(getFallbackApiBaseUrl(), 'http://127.0.0.1:4001/api');
});

test('Physical device without detected Metro host falls back to workstation LAN IP (never 10.0.2.2)', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'android',
    isPhysical: true,
    expoHost: null,
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://192.168.100.83:4001/api');
  assert.ok(!getApiBaseUrl().includes('10.0.2.2'));
});

test('Android emulator resolves to 10.0.2.2 alias', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'android',
    isPhysical: false,
    expoHost: 'localhost:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://10.0.2.2:4001/api');
});

test('iOS simulator preserves localhost', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'ios',
    isPhysical: false,
    expoHost: 'localhost:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://localhost:4001/api');
});

test('Web browser preserves localhost', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'web',
    isPhysical: false,
    envUrl: 'http://localhost:4001',
  });
  assert.equal(getApiBaseUrl(), 'http://localhost:4001/api');
});

test('Link-local 169.254.x.x is rejected and safely falls back on emulator', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'android',
    isPhysical: false,
    expoHost: '169.254.62.68:8081',
    envUrl: 'http://localhost:4001',
  });
  assert.ok(!getApiBaseUrl().includes('169.254'));
  assert.equal(getApiBaseUrl(), 'http://10.0.2.2:4001/api');
});

test('Production environment preserves production URL as-is', () => {
  const { getApiBaseUrl } = createUrlResolver({
    os: 'android',
    isPhysical: true,
    isDev: false,
    envUrl: 'https://api.cloudora.app',
  });
  assert.equal(getApiBaseUrl(), 'https://api.cloudora.app/api');
});

test('Live Backend responds to /api/settings/maintenance via localhost', async () => {
  const res = await fetch('http://localhost:4001/api/settings/maintenance');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.enabled, 'boolean');
});

test('Live Backend responds to /api/settings/maintenance via active LAN IP', async () => {
  const nets = os.networkInterfaces();
  let lanIp = '192.168.1.103';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.') && !net.address.startsWith('172.') && !net.address.startsWith('100.')) {
        lanIp = net.address;
        break;
      }
    }
  }

  const res = await fetch(`http://${lanIp}:4001/api/settings/maintenance`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.enabled, 'boolean');
});

