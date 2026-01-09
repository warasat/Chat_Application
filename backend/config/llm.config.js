import { CONSTANTS } from "../constants/constants.js";

const LLM_CONFIG = {
  anthropic: {
    model: CONSTANTS.LLM_CONFIG.model,
    maxTokens: CONSTANTS.LLM_CONFIG.max_tokens,
    systemPrompt: CONSTANTS.LLM_CONFIG.prompt,
  },
};

export { LLM_CONFIG };
