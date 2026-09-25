import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes code for security vulnerabilities, performance bottlenecks, and best practices. Use this agent to review code quality and identify anti-patterns.',
  model: 'inherit',
  tools: ['Skill'],
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
};