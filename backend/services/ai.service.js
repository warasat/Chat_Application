import { sendToClaudeChat } from "../utils/calude.chat.service.js";
import { analyzeVoiceIntent } from "../utils/claude.voice.service.js";

// Example usage:
export const handleAIRequest = async (req, res) => {
  const { message, userId, mode } = req.body;

  try {
    if (mode === "voice") {
      const intent = await analyzeVoiceIntent(message, userId);
      return res.json(intent);
    } else {
      const chatReply = await sendToClaudeChat(message, [], userId);
      return res.json(chatReply);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
