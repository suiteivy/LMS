/**
 * Generic Circuit Breaker Pattern Implementation
 * 
 * Complies with Backend Handbook Part E3:
 * - Prevents thread and socket starvation when downstream dependencies degrade
 * - 3 States: CLOSED (normal), OPEN (fast-fail), HALF_OPEN (probing recovery)
 * - Configurable failure thresholds, cooldowns, and probe handling
 */

const logger = require('./logger.js');

class CircuitBreakerOpenError extends Error {
  constructor(message = 'Service temporarily unavailable (Circuit Breaker OPEN)') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.statusCode = 503;
    this.isCircuitBreaker = true;
  }
}

class CircuitBreaker {
  constructor({
    name = 'default',
    failureThreshold = 5,
    cooldownMs = 15000,
    isFailure = (err) => err && !err.isClientError && err.statusCode !== 401 && err.statusCode !== 403,
  } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.isFailure = isFailure;

    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
    this.failureCount = 0;
    this.nextAttemptAt = 0;
  }

  async execute(action) {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now >= this.nextAttemptAt) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker [${this.name}] entered HALF_OPEN state; allowing trial probe`);
      } else {
        throw new CircuitBreakerOpenError(`Downstream service [${this.name}] is unavailable`);
      }
    }

    try {
      const result = await action();

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info(`Circuit breaker [${this.name}] probe succeeded; transitioned back to CLOSED`);
      } else if (this.state === 'CLOSED') {
        this.failureCount = 0;
      }

      return result;
    } catch (err) {
      if (this.isFailure(err)) {
        this.failureCount += 1;

        if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
          this.state = 'OPEN';
          this.nextAttemptAt = Date.now() + this.cooldownMs;
          logger.warn(`Circuit breaker [${this.name}] TRIPPED to OPEN after ${this.failureCount} failures. Cooldown: ${this.cooldownMs}ms`);
        }
      }

      throw err;
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      isOpen: this.state === 'OPEN',
      nextAttemptAt: this.state === 'OPEN' ? new Date(this.nextAttemptAt).toISOString() : null,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttemptAt = 0;
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerOpenError,
};
