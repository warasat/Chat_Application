import express from "express";
import {
  registerUserService,
  loginUserService,
} from "../services/auth.service.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const result = await registerUserService(req.body);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ error: "Phone number is required" });

    const result = await loginUserService(phoneNumber);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
