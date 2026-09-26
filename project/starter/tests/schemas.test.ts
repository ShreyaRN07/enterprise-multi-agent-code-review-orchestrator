import { describe, it, expect } from 'vitest';
import { ReviewReportSchema } from '../src/types/index.js';

describe('Zod Schemas', () => {
  describe('ReviewReportSchema', () => {
    it('should validate correct ReviewReport', () => {
      const validReport = {
        pullRequest: {
          owner: 'facebook',
          repo: 'react',
          number: 12345,
        },
        fileReviews: [],
        summary: {
          totalFiles: 0,
          overallScore: 85,
          criticalIssues: 0,
          highPriorityTests: 0,
          refactoringOpportunities: 0,
        },
        recommendations: [
          {
            priority: 'low',
            category: 'General',
            description: 'Minor code cleanup',
            files: [],
          },
        ],
        metadata: {
          analyzedAt: new Date().toISOString(),
          duration: 1000,
          agentVersions: {
            'code-quality-analyzer': '1.0.0',
            'test-coverage-analyzer': '1.0.0',
            'refactoring-suggester': '1.0.0',
          },
        },
      };
      const result = ReviewReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidReport = {
        pullRequest: {
          owner: 'facebook',
        },
      };
      const result = ReviewReportSchema.safeParse(invalidReport);
      expect(result.success).toBe(false);
    });

    it('should reject invalid scores outside numeric ranges', () => {
      const invalidReport = {
        pullRequest: {
          owner: 'facebook',
          repo: 'react',
          number: 123,
        },
        fileReviews: [],
        summary: {
          totalFiles: 0,
          overallScore: 'invalid_score',
        },
      };
      const result = ReviewReportSchema.safeParse(invalidReport);
      expect(result.success).toBe(false);
    });
  });
});