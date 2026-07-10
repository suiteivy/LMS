const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const SYSTEM_LOG = path.join(LOG_DIR, 'system_activity.log');
const RETENTION_DAYS = 5;

const ensureLogDir = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

const toIso = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

const logSystemActivity = ({
  event,
  actor_user_id = null,
  actor_role = null,
  institution_id = null,
  details = {},
}) => {
  if (!event) return;
  ensureLogDir();

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    actor_user_id,
    actor_role,
    institution_id,
    details,
  }) + '\n';

  fs.appendFile(SYSTEM_LOG, line, () => {});
};

const readSystemActivityLogs = ({ from = null, to = null, limit = 500 }) => {
  ensureLogDir();
  if (!fs.existsSync(SYSTEM_LOG)) return [];

  const maxRows = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  const fromMs = from ? new Date(from).getTime() : null;
  const toMs = to ? new Date(to).getTime() : null;

  const content = fs.readFileSync(SYSTEM_LOG, 'utf8');
  const rows = content
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line);
        return {
          ...parsed,
          timestamp: toIso(parsed.timestamp),
        };
      } catch (_err) {
        return null;
      }
    })
    .filter(Boolean)
    .filter((row) => {
      const ts = new Date(row.timestamp).getTime();
      if (fromMs && Number.isFinite(fromMs) && ts < fromMs) return false;
      if (toMs && Number.isFinite(toMs) && ts > toMs) return false;
      return true;
    });

  return rows.slice(-maxRows).reverse();
};

const pruneSystemActivityLogs = () => {
  ensureLogDir();
  if (!fs.existsSync(SYSTEM_LOG)) return { pruned: 0, kept: 0 };

  const cutoffMs = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const content = fs.readFileSync(SYSTEM_LOG, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  const kept = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const ts = new Date(parsed.timestamp).getTime();
      if (Number.isFinite(ts) && ts >= cutoffMs) {
        kept.push(JSON.stringify(parsed));
      }
    } catch (_err) {
      // Skip malformed lines
    }
  }

  fs.writeFileSync(SYSTEM_LOG, kept.length ? `${kept.join('\n')}\n` : '', 'utf8');
  return { pruned: lines.length - kept.length, kept: kept.length };
};

const clearSystemActivityLogs = ({ window = null } = {}) => {
  ensureLogDir();
  if (!fs.existsSync(SYSTEM_LOG)) return { deleted: 0, kept: 0 };

  const content = fs.readFileSync(SYSTEM_LOG, 'utf8');
  const lines = content.split('\n').filter(Boolean);

  if (!window || String(window).toLowerCase() === 'all') {
    fs.writeFileSync(SYSTEM_LOG, '', 'utf8');
    return { deleted: lines.length, kept: 0 };
  }

  const windowMap = {
    '1h': 60 * 60 * 1000,
    '5h': 5 * 60 * 60 * 1000,
    '10h': 10 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  const normalizedWindow = String(window).toLowerCase();
  const windowMs = windowMap[normalizedWindow];
  if (!windowMs) {
    throw new Error('Invalid window. Allowed values: 1h, 5h, 10h, 1d, 7d, all');
  }

  const cutoffMs = Date.now() - windowMs;
  const kept = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const ts = new Date(parsed.timestamp).getTime();
      if (Number.isFinite(ts) && ts > cutoffMs) {
        kept.push(JSON.stringify(parsed));
      }
    } catch (_err) {
      // Skip malformed lines
    }
  }

  fs.writeFileSync(SYSTEM_LOG, kept.length ? `${kept.join('\n')}\n` : '', 'utf8');
  return { deleted: lines.length - kept.length, kept: kept.length };
};

module.exports = {
  logSystemActivity,
  readSystemActivityLogs,
  pruneSystemActivityLogs,
  clearSystemActivityLogs,
};
