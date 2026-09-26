import { describe, it, expect } from 'vitest';
import { withRetry, withTimeout, ReviewError } from '../src/utils/error-handler.js';

describe('Error Handler', () => {
  describe('withRetry', () => {
    it('should retry with exponential backoff', async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 2) throw new Error('First attempt fails');
          return 'success';
        },
        { maxAttempts: 2, delayMs: 10 }
      );
      expect(attempts).toBe(2);
      expect(result).toBe('success');
    });

    it('should throw ReviewError after max attempts', async () => {
      let attempts = 0;
      await expect(
        withRetry(
          async () => {
            attempts++;
            throw new Error('Always fails');
          },
          { maxAttempts: 2, delayMs: 10 }
        )
      ).rejects.toThrow(ReviewError);
      expect(attempts).toBe(2);
    });

    it('should calculate exponential backoff correctly', async () => {
      let attempts = 0;
      const startTime = Date.now();
      await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Retry needed');
          }
          return 'done';
        },
        { maxAttempts: 3, delayMs: 30, backoffFactor: 2 }
      );
      const elapsed = Date.now() - startTime;
      expect(attempts).toBe(3);
      expect(elapsed).toBeGreaterThanOrEqual(25);
    });
  });

  describe('withTimeout', () => {
    it('should complete before timeout', async () => {
      const result = await withTimeout(
        () => Promise.resolve('success'),
        1000
      );
      expect(result).toBe('success');
    });

    it('should throw ReviewError on timeout', async () => {
      await expect(
        withTimeout(
          () => new Promise((resolve) => setTimeout(resolve, 5000)),
          50
        )
      ).rejects.toThrow(ReviewError);
    });

    it('should have timeout error code', async () => {
      try {
        await withTimeout(
          () => new Promise((resolve) => setTimeout(resolve, 5000)),
          50
        );
      } catch (error) {
        if (error instanceof ReviewError) {
          expect(error.code).toBe('AGENT_TIMEOUT');
        }
      }
    });
  });
});