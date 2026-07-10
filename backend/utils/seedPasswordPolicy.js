function normalizeValue(value) {
  return String(value || '').trim();
}

function assertStrongSeedPassword(value, envName) {
  const password = normalizeValue(value);

  if (!password) {
    throw new Error(`Missing required env var: ${envName}`);
  }

  const lowered = password.toLowerCase();
  const blockedFragments = ['change_me', 'password', 'example', 'demo123', 'test123', '123456'];
  if (blockedFragments.some((fragment) => lowered.includes(fragment))) {
    throw new Error(`${envName} must not use placeholder/default password values`);
  }

  const meetsLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!(meetsLength && hasUpper && hasLower && hasDigit && hasSymbol)) {
    throw new Error(`${envName} must be at least 12 chars and include upper, lower, number, and symbol`);
  }

  return password;
}

module.exports = {
  assertStrongSeedPassword,
};
