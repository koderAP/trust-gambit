/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when a service is unhealthy
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing fast, not attempting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time to wait before attempting recovery (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitBreakerStats = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
  };
  private nextAttempt: number = 0;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
    }
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker [${this.name}] is OPEN. Service unavailable.`
        );
      }
      // Transition to HALF_OPEN to test recovery
      this.state = CircuitState.HALF_OPEN;
      console.log(`Circuit breaker [${this.name}] transitioning to HALF_OPEN`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.stats.successes++;
    this.stats.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.stats.successes >= this.options.successThreshold) {
        this.close();
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.stats.failures = 0;
    }
  }

  private onFailure() {
    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we've exceeded failure threshold in monitoring period
      const failureWindow = Date.now() - this.options.monitoringPeriod;
      if (
        this.stats.lastFailureTime > failureWindow &&
        this.stats.failures >= this.options.failureThreshold
      ) {
        this.open();
      }
    }
  }

  private open() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.timeout;
    this.stats.successes = 0;
    console.error(
      `Circuit breaker [${this.name}] OPENED after ${this.stats.failures} failures. Will retry at ${new Date(this.nextAttempt).toISOString()}`
    );
  }

  private close() {
    this.state = CircuitState.CLOSED;
    this.stats.failures = 0;
    this.stats.successes = 0;
    console.log(`Circuit breaker [${this.name}] CLOSED. Service recovered.`);
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failures: this.stats.failures,
      successes: this.stats.successes,
      lastFailure: this.stats.lastFailureTime
        ? new Date(this.stats.lastFailureTime).toISOString()
        : null,
      lastSuccess: this.stats.lastSuccessTime
        ? new Date(this.stats.lastSuccessTime).toISOString()
        : null,
      nextAttempt:
        this.state === CircuitState.OPEN
          ? new Date(this.nextAttempt).toISOString()
          : null,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.stats.failures = 0;
    this.stats.successes = 0;
    console.log(`Circuit breaker [${this.name}] manually reset.`);
  }
}

// Global circuit breakers for different services
export const databaseCircuitBreaker = new CircuitBreaker('Database', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  monitoringPeriod: 10000, // 10 seconds
});

export const redisCircuitBreaker = new CircuitBreaker('Redis', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 10000, // 10 seconds
  monitoringPeriod: 5000, // 5 seconds
});

/**
 * Wrapper for database operations with circuit breaker
 */
export async function withDatabaseCircuitBreaker<T>(
  operation: () => Promise<T>
): Promise<T> {
  return databaseCircuitBreaker.execute(operation);
}

/**
 * Wrapper for Redis operations with circuit breaker
 */
export async function withRedisCircuitBreaker<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await redisCircuitBreaker.execute(operation);
  } catch (error) {
    // Redis failures are non-critical, log and continue
    console.warn('Redis operation failed (circuit breaker):', error);
    throw error;
  }
}
