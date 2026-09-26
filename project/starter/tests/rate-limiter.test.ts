import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2,
    });
  });

  it('should acquire and track requests', async () => {
    await limiter.acquire(100);
    const status = limiter.getStatus();
    expect(status.requestsInWindow).toBe(1);
    expect(status.tokensInWindow).toBe(100);
  });

  it('should enforce concurrent request limits', async () => {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 2; i++) {
      promises.push(limiter.acquire(100));
    }
    await Promise.all(promises);
    const status = limiter.getStatus();
    expect(status.activeRequests).toBeLessThanOrEqual(2);
  });

  it('should track token accumulation across requests', async () => {
    await limiter.acquire(300);
    const status = limiter.getStatus();
    expect(status.tokensInWindow).toBeGreaterThanOrEqual(300);
  });

  it('should release slots when requests complete', async () => {
    await limiter.acquire(100);
    limiter.release(100);
    const status = limiter.getStatus();
    expect(status.activeRequests).toBe(0);
  });
});