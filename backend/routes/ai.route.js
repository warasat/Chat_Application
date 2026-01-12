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

    // 2. Sirf last 10-20 messages fetch karein history ke liye (for tokens saving)
    const historyRows = await getMessagesService(aiChatId);

    // Cassandra rows ko Claude ke format mein convert karein
    const formattedHistory = historyRows.map((m) => ({
      role: m.sender_id === userId ? "user" : "assistant",
      content: m.content,
    }));

    // 3. AI se reply lein
    const aiReply = await sendToClaude(message, formattedHistory);

    // 4. AI ka reply Cassandra mein save karein
    await sendMessageService({
      chatId: aiChatId,
      senderId: CHAT_AI_USER.id, // Bot ki constant ID
      content: aiReply,
      type: "text",
    });

    res.status(200).json({ reply: aiReply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:userId", protect, async (req, res) => {
  const userId = req.params.userId;
  // FIX: Wahi ID use karein jo POST mein create ki thi
  const aiChatId = `ai_${userId}`;

  try {
    const messages = await getMessagesService(aiChatId);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch AI messages" });
  }
});

export default router;
