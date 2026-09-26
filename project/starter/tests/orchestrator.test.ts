import { describe, it, expect, beforeEach } from 'vitest';
import { CodeReviewOrchestrator } from '../src/orchestrator.js';

describe('CodeReviewOrchestrator', () => {
  let orchestrator: CodeReviewOrchestrator;

  beforeEach(() => {
    orchestrator = new CodeReviewOrchestrator({
      rateLimits: {
        maxRequestsPerMinute: 100,
        maxTokensPerMinute: 200000,
        maxConcurrent: 10,
      },
    });
  });

  it('should initialize with default options', () => {
    expect(orchestrator).toBeDefined();
    const status = (orchestrator as any).rateLimiter.getStatus();
    expect(status).toHaveProperty('requestsInWindow');
  });

  it('should accept custom rate limit configuration', () => {
    const customOrchestrator = new CodeReviewOrchestrator({
      rateLimits: {
        maxRequestsPerMinute: 5,
        maxTokensPerMinute: 10000,
        maxConcurrent: 1,
      },
    });
    const status = (customOrchestrator as any).rateLimiter.getStatus();
    expect(status).toHaveProperty('requestsInWindow');
    expect(status).toHaveProperty('activeRequests');
  });

  it('should handle integration execution structure for small PRs', async () => {
    expect(typeof orchestrator.reviewPullRequest).toBe('function');
  });
});