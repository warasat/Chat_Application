import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  sendMessageService,
  getMessagesService,
} from "../services/message.service.js";

const router = express.Router();

router.post("/send", protect, async (req, res) => {
  try {
    const result = await sendMessageService(req.body);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:chatId", protect, async (req, res) => {
  try {
    const messages = await getMessagesService(req.params.chatId);
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
