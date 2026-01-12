import express from "express";
import { sendToClaude } from "../services/ai.service.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  sendMessageService,
  getMessagesService,
} from "../services/message.service.js";
import { CHAT_AI_USER } from "../constants/constants.js";

const router = express.Router();

router.post("/chat", protect, async (req, res) => {
  const { message } = req.body;
  const userId = req.user._id.toString();
  const aiChatId = `ai_${userId}`;

  if (!message) return res.status(400).json({ error: "Message required" });

  try {
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

    const aiReply = await sendToClaude(message, formattedHistory);

    await sendMessageService({
      chatId: aiChatId,
      senderId: CHAT_AI_USER.id,
      content: aiReply,
      type: "text",
    });

    res.status(200).json({ reply: aiReply });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
});
router.get("/:userId", protect, async (req, res) => {
  const userId = req.params.userId;
  const chatId = CHAT_AI_USER.chatId; // fixed AI chat room

  try {
    const messages = await getMessagesService(chatId);

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch AI messages" });
  }
});

export default router;
