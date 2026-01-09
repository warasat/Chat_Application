import express from "express";
import { sendToClaude } from "../services/ai.service.js";
import { protect } from "../middlewares/auth.middleware.js";
import { verifySpecialUser } from "../middlewares/verifySpecialUser.middleware.js";

const router = express.Router();

router.post("/chat", protect, async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const reply = await sendToClaude(message, history || []);
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
