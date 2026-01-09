import axios from "axios";
import { LLM_CONFIG } from "../config/llm.config.js";
import dotenv from "dotenv";

dotenv.config();

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export const sendToClaude = async (userMessage, history = []) => {
  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: LLM_CONFIG.anthropic.model,
        max_tokens: LLM_CONFIG.anthropic.maxTokens,
        system: LLM_CONFIG.anthropic.systemPrompt,
        messages: [...history, { role: "user", content: userMessage }],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error("Claude API Error:", error.response?.data || error.message);
    throw new Error("Failed to get response from Claude");
  }
};
