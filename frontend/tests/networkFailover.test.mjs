import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// ── Test 1: Automatic IP Synchronization Script ──────────────────────────────
test('sync-dev-ip.js detects valid IPv4 LAN IP and writes to frontend/.env', () => {
  const syncScript = path.resolve(rootDir, 'scripts', 'sync-dev-ip.js');
  const output = execSync(`node "${syncScript}"`, { encoding: 'utf8' });

  assert.ok(
    output.includes('[LMS IP Sync]'),
    'sync-dev-ip.js should output LMS IP Sync log'
  );

  const ipMatch = output.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  assert.ok(ipMatch, 'Should output a valid IPv4 address');

  const detectedIp = ipMatch[1];
  assert.ok(!detectedIp.startsWith('127.'), 'Should not be loopback');
  assert.ok(!detectedIp.startsWith('169.254.'), 'Should not be link-local');
});

// ── Test 2: Live Backend Health Probing ───────────────────────────────────────
test('Live backend health probe returns 200 OK for live host and rejects dead host', async () => {
  const probeHost = async (host, port = 4001) => {
    try {
      const res = await fetch(`http://${host}:${port}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });
      return res.status === 200;
    } catch {
      return false;
    }
  };

  const isLocalLive = await probeHost('127.0.0.1');
  assert.equal(isLocalLive, true, '127.0.0.1 should be live');

  const isDeadLive = await probeHost('192.168.100.25');
  assert.equal(isDeadLive, false, 'Stale IP 192.168.100.25 must fail health probe');
});

// ── Test 3: Fast Multi-Candidate Discovery ───────────────────────────────────
test('Multi-candidate probe identifies live host quickly and ignores failed host', async () => {
  const probeFirstReachable = async (candidates, failedHost) => {
    const toTest = candidates.filter((c) => c !== failedHost);
    return new Promise((resolve) => {
      let resolved = false;
      let count = 0;
      if (toTest.length === 0) return resolve(null);

      toTest.forEach(async (host) => {
        try {
          const res = await fetch(`http://${host}:4001/api/health`, {
            signal: AbortSignal.timeout(1500),
          });
          if (res.status === 200 && !resolved) {
            resolved = true;
            resolve(host);
          }
        } catch {
          // unreachable
        } finally {
          count++;
          if (count === toTest.length && !resolved) resolve(null);
        }
      });
    });
  };

  const start = Date.now();
  const winner = await probeFirstReachable(
    ['192.168.100.25', '127.0.0.1'],
    '192.168.100.25'
  );
  const duration = Date.now() - start;

  assert.equal(winner, '127.0.0.1', 'Should select live 127.0.0.1 host');
  assert.ok(duration < 1000, `Probing should resolve quickly (<1000ms), took ${duration}ms`);
});
