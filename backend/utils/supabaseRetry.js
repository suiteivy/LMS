const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CIRCUIT_OPEN_MS = 30 * 1000;
const FAILURE_THRESHOLD = 5;

const circuit = {
  state: 'closed', // closed | open | half_open
  failureCount: 0,
  openedAt: 0,
  halfOpenInFlight: false,
};

const markCircuitSuccess = () => {
  circuit.state = 'closed';
  circuit.failureCount = 0;
  circuit.openedAt = 0;
  circuit.halfOpenInFlight = false;
};

const markCircuitFailure = () => {
  const now = Date.now();

  if (circuit.state === 'half_open') {
    circuit.state = 'open';
    circuit.openedAt = now;
    circuit.halfOpenInFlight = false;
    return;
  }

  circuit.failureCount += 1;
  if (circuit.failureCount >= FAILURE_THRESHOLD) {
    circuit.state = 'open';
    circuit.openedAt = now;
  }
};

const buildCircuitOpenError = () => {
  const err = new Error('Supabase circuit breaker open');
  err.code = 'SUPABASE_CIRCUIT_OPEN';
  err.details = 'Requests are temporarily paused due to repeated upstream failures';
  return err;
};

const assertCircuitAllowsRequest = () => {
  if (circuit.state === 'closed') return;

  const now = Date.now();
  if (circuit.state === 'open') {
    if ((now - circuit.openedAt) < CIRCUIT_OPEN_MS) {
      throw buildCircuitOpenError();
    }
    circuit.state = 'half_open';
    circuit.halfOpenInFlight = false;
  }

  if (circuit.state === 'half_open') {
    if (circuit.halfOpenInFlight) {
      throw buildCircuitOpenError();
    }
    circuit.halfOpenInFlight = true;
  }
};

const isTransientSupabaseError = (errorLike) => {
  const msg = String(
    errorLike?.message ||
    errorLike?.details ||
    errorLike?.code ||
    errorLike || ''
  ).toLowerCase();

  return (
    msg.includes('fetch failed') ||
    msg.includes('connect timeout') ||
    msg.includes('und_err_connect_timeout') ||
    msg.includes('supabase circuit breaker open') ||
    msg.includes('supabase_circuit_open') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('network')
  );
};

const withSupabaseRetry = async (fn, { attempts = 3, delaysMs = [250, 700] } = {}) => {
  assertCircuitAllowsRequest();

  let lastError;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const result = await fn();

      if (result && typeof result === 'object' && 'error' in result && result.error) {
        if (isTransientSupabaseError(result.error)) {
          lastError = result.error;
          if (i < attempts - 1) {
            await sleep(delaysMs[Math.min(i, delaysMs.length - 1)] || 500);
            continue;
          }
        }
      }

      markCircuitSuccess();
      return result;
    } catch (error) {
      if (!isTransientSupabaseError(error) || i === attempts - 1) {
        if (isTransientSupabaseError(error)) {
          markCircuitFailure();
        } else {
          markCircuitSuccess();
        }
        throw error;
      }
      lastError = error;
      await sleep(delaysMs[Math.min(i, delaysMs.length - 1)] || 500);
    }
  }

  if (isTransientSupabaseError(lastError)) {
    markCircuitFailure();
  }

  throw lastError || new Error('Supabase request failed after retries');
};

module.exports = {
  isTransientSupabaseError,
  withSupabaseRetry,
  getSupabaseCircuitState: () => ({ ...circuit }),
};
