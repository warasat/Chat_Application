import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { getAllUsersService } from "../services/auth.service.js";

const router = express.Router();

// Saare users fetch karne ka route (Protected)
router.get("/", protect, async (req, res) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Users fetch nahi ho sakay" });
  }
});

export default router;
