import express from "express";
import {
  registerUserService,
  loginUserService,
} from "../services/auth.service.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/register", upload.single("profilePic"), async (req, res) => {
  try {
    // req.body ke saath req.file bhi service ko bhej rahe hain
    const result = await registerUserService({ ...req.body, file: req.file });
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
