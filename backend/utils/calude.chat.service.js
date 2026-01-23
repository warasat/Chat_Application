import axios from "axios";
import dotenv from "dotenv";
import { LLM_CONFIG } from "../config/llm.config.js";

dotenv.config();

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Normal Chat with Claude (no tools)
 */
export const sendToClaudeChat = async (message, history = [], userId) => {
  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: LLM_CONFIG.anthropic.model,
        max_tokens: LLM_CONFIG.anthropic.maxTokens,
        system: `You are a friendly AI assistant. 
                 Answer user questions clearly and accurately.
                 If you don’t know, say you don’t know. 
                 Do not reference contacts or any tool.`,
        messages: [...history, { role: "user", content: message }],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const text = response.data?.content?.[0]?.text || "I'm here to help!";
    return { text };
  } catch (error) {
    console.error("Claude Chat Error:", error.response?.data || error.message);
    throw new Error("Failed to get Claude chat response");
  }
};
