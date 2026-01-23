import express from "express";
import { sendToClaudeChat } from "../utils/calude.chat.service.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  sendMessageService,
  getMessagesService,
} from "../services/message.service.js";
import { CHAT_AI_USER } from "../constants/constants.js";
import { analyzeVoiceIntent } from "../utils/claude.voice.service.js";

const router = express.Router();

router.post("/chat", protect, async (req, res) => {
  const { message } = req.body;
  const userId = req.user._id.toString();

  // Consistent ID format: ai_65a123...
  const aiChatId = `ai_${userId}`;

  if (!message) return res.status(400).json({ error: "Message required" });

  try {
    // 1. User ka message Cassandra mein save karein
    await sendMessageService({
      chatId: aiChatId,
      senderId: userId,
      content: message,
      type: "text",
    });

    const historyRows = await getMessagesService(aiChatId);

    const formattedHistory = historyRows.map((m) => ({
      role: m.sender_id === userId ? "user" : "assistant",
      content: m.content,
    }));

    // 3. AI se reply lein
    const result = await sendToClaudeChat(message, formattedHistory, userId);

    if (result.text && result.text.trim() !== "") {
      await sendMessageService({
        chatId: aiChatId,
        senderId: CHAT_AI_USER.id,
        content: result.text,
        type: "text",
      });
    }

    res.status(200).json({
      reply: result.text,
      action: result.action,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:userId", protect, async (req, res) => {
  const userId = req.params.userId;

  const aiChatId = `ai_${userId}`;

  try {
    const messages = await getMessagesService(aiChatId);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch AI messages" });
  }
});

router.post("/voice-intent", protect, async (req, res) => {
  const { transcript, commands } = req.body;
  const userId = req.user._id.toString();

  if (!transcript)
    return res.status(400).json({ error: "Transcript required" });

  try {
    const result = await analyzeVoiceIntent(transcript, commands, userId);

    // Frontend (VoiceController) ko commandId aur params chahiye
    res.status(200).json({
      commandId: result.commandId,
      params: result.params,
    });
  } catch (error) {
    console.error("Voice Intent Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
