import { query } from '@anthropic-ai/claude-agent-sdk';
import { mcpServersConfig } from './config/mcp.config.js';
import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester,
} from './agents/index.js';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './prompts/index.js';
import {
  ReviewReportSchema,
  ReviewReportJSONSchema,
  type ReviewReport,
} from './types/index.js';
import { RateLimiter, type RateLimiterConfig } from './utils/rate-limiter.js';
import { withRetry, withTimeout } from './utils/error-handler.js';

export interface OrchestratorOptions {
  rateLimits?: Partial<RateLimiterConfig>;
}

export interface ReviewPullRequestParams {
  owner: string;
  repo: string;
  prNumber: number;
}

export class CodeReviewOrchestrator {
  private rateLimiter: RateLimiter;
  private options: OrchestratorOptions;

  constructor(options: OrchestratorOptions = {}) {
    this.options = options;
    this.rateLimiter = new RateLimiter(options.rateLimits);
  }

  async reviewPullRequest(params: ReviewPullRequestParams): Promise<ReviewReport> {
    const { owner, repo, prNumber } = params;

    const runReview = async (): Promise<ReviewReport> => {
      await this.rateLimiter.acquire();

      // Pre-fetch PR files and diff via GitHub API to ensure Claude always has the code
      let prContext = `Pull Request: #${prNumber} for repository ${owner}/${repo}\n`;
      try {
        const headers: Record<string, string> = {
          'User-Agent': 'claude-code-review',
          'Accept': 'application/vnd.github.v3+json',
        };
        const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        if (token) {
          headers['Authorization'] = `token ${token}`;
        }

        const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
        if (prRes.ok) {
          const prJson = (await prRes.json()) as any;
          prContext += `Title: ${prJson.title}\nDescription: ${prJson.body || 'None'}\n\n`;
        }

        const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, { headers });
        if (filesRes.ok) {
          const filesJson = (await filesRes.json()) as any[];
          prContext += 'Changed Files & Diff:\n';
          for (const f of filesJson) {
            const patchText = f.patch ? (f.patch.length > 3000 ? f.patch.slice(0, 3000) + '\n...[diff truncated]' : f.patch) : 'No patch available';
            prContext += `\n--- File: ${f.filename} (${f.status}) ---\n${patchText}\n`;
          }
        }
      } catch (err) {
        // Continue if network pre-fetch fails; the agent can attempt MCP tools
      }

      const userPrompt = `${prContext}

CRITICAL REVIEW INSTRUCTIONS:
1. Review the pull request code changes above.
2. Delegate deep inspection to all three subagents:
   - "code-quality-analyzer": checks for syntax, security risks, error handling, and lint issues.
   - "test-coverage-analyzer": identifies missing tests, uncovered branches, and test assertions.
   - "refactoring-suggester": finds opportunities to improve structure, maintainability, and clean code.
3. Compute an overall quality score between 1 and 100 based on the findings.
4. Itemize all issues by file name and line numbers.
5. Return the aggregated data strictly according to the ReviewReport JSON schema.`;

      const responseStream = query({
        prompt: userPrompt,
        options: {
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
          systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
          mcpServers: mcpServersConfig as any,
          allowedTools: [
            'Task',
            'mcp__github__get_file_contents',
            'mcp__github__pull_request_read',
            'mcp__github__get_pull_request',
            'mcp__github__get_pull_request_files',
            'mcp__eslint__lint_files',
          ],
          agents: {
            'code-quality-analyzer': codeQualityAnalyzer,
            'test-coverage-analyzer': testCoverageAnalyzer,
            'refactoring-suggester': refactoringSuggester,
          },
          outputFormat: {
            type: 'json_schema',
            schema: ReviewReportJSONSchema as Record<string, unknown>,
          },
        },
      });

      let finalReportData: unknown = null;

      for await (const message of responseStream) {
        const msg = message as any;

        if (msg.type === 'structured_output' && msg.output) {
          finalReportData = msg.output;
        } else if (msg.output && typeof msg.output === 'object') {
          finalReportData = msg.output;
        } else if (msg.structured_output) {
          finalReportData = msg.structured_output;
        } else if (msg.result && typeof msg.result === 'object') {
          finalReportData = msg.result;
        }
      }

      if (!finalReportData) {
        throw new Error('Review completed but no structured output was generated.');
      }

      const parseResult = ReviewReportSchema.safeParse(finalReportData);
      if (!parseResult.success) {
        throw new Error(
          `Review report validation failed: ${JSON.stringify(parseResult.error.format())}`
        );
      }

      return parseResult.data as ReviewReport;
    };

    return withTimeout(
      () => withRetry(runReview, { maxAttempts: 2, delayMs: 2000 }),
      600000
    );
  }
}