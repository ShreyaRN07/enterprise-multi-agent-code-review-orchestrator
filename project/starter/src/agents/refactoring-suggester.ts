import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies opportunities for code modularization, modernization, and design pattern improvements. Use this agent to suggest structural code improvements.',
  model: 'inherit',
  tools: [],
  prompt: REFACTORING_SUGGESTER_PROMPT,
};