import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getAllUsersService,
  addContact,
  getUserById,
} from "../services/user.service.js";
import User from "../models/user.model.js";

const router = express.Router();

// 1. Add Contact
router.post("/add-contact", addContact);

// 2. NEW: Get User by ID (Unknown Sender Discovery)
router.get("/:id", protect, getUserById);

// 3. Get My Contacts
router.get("/my-contacts/:userId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "contacts",
      "username phoneNumber profilePic bio"
    );
    if (!user) return res.status(404).json({ message: "User find nahi hua" });
    res.json(user.contacts || []);
  } catch (err) {
    res.status(500).json({ message: "Error fetching contacts" });
  }
});

// 4. All Users
router.get("/", protect, async (req, res) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Fetch error" });
  }
});

export default router;
