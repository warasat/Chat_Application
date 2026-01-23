import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Voice Intent Parser
 * Detects if the user said a command or a normal message.
 */
export const analyzeVoiceIntent = async (transcript, userId) => {
  try {
    console.log("🎙️ Received voice transcript:", transcript);

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        system: `
        You are a Voice Intent Parser.
        Your job is to map the user transcript to a command.
        
        Rules:
        1️⃣ If user says "search", "find", "open chat", or "chat with" + name → commandId: "search_user".
        2️⃣ Otherwise → commandId: "normal_chat".
        3️⃣ Always return JSON only.

        Example:
        "search for Zeeshan" -> {"commandId": "search_user", "params": {"name": "Zeeshan"}}
        "hello" -> {"commandId": "normal_chat", "params": {}}
        `,
        messages: [{ role: "user", content: `Transcript: "${transcript}"` }],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const rawText = response.data?.content?.[0]?.text?.trim() || "{}";
    console.log("Claude Voice Raw:", rawText);

    const jsonMatch = rawText.match(/\{.*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        commandId: parsed.commandId || "normal_chat",
        params: parsed.params || {},
      };
    }

    return { commandId: "normal_chat", params: {} };
  } catch (error) {
    console.error(
      "❌ analyzeVoiceIntent Error:",
      error.response?.data || error.message
    );
    return { commandId: "normal_chat", params: {} };
  }
};
