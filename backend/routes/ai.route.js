import express from "express";
import { sendToClaude } from "../services/ai.service.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  sendMessageService,
  getMessagesService,
} from "../services/message.service.js";
import { CHAT_AI_USER } from "../constants/constants.js";
import { analyzeVoiceIntent } from "../services/ai.service.js";

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
    const result = await sendToClaude(message, formattedHistory, userId);

    if (result.text && result.text.trim() !== "") {
      await sendMessageService({
        chatId: aiChatId,
        senderId: CHAT_AI_USER.id,
        content: result.text,
        type: "text",
      });
    }

    // Response hamesha bhejien, chahe reply khali ho
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
  // FIX: Wahi ID use karein jo POST mein create ki thi
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
    /* Aapko apne ai.service.js mein ek naya function 'analyzeVoiceIntent' banana hoga 
       jo transcript aur available commands ko Claude ko bhej kar matching commandId nikale.
    */
    const result = await analyzeVoiceIntent(transcript, commands, userId);

    // Frontend (VoiceController) ko commandId aur params chahiye
    res.status(200).json({
      commandId: result.commandId, // e.g., "search_user"
      params: result.params, // e.g., { name: "Zeeshan" }
    });
  } catch (error) {
    console.error("Voice Intent Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
