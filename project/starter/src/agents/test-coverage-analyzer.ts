import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Evaluates test coverage, identifies untested edge cases, and provides concrete test assertions. Use this agent to analyze test adequacy.',
  model: 'inherit',
  tools: [],
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
};