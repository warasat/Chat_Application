import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { getAllUsersService, addContact } from "../services/user.service.js"; // Service import karein
import User from "../models/user.model.js"; // Model import karein warna populate 500 error dega

const router = express.Router();

// Add Contact Route
router.post("/add-contact", addContact);

// Get My Contacts
router.get("/my-contacts/:userId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "contacts",
      "username phoneNumber profilePic bio"
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.contacts || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching contacts" });
  }
});

// Saare users (Purana route)
router.get("/", protect, async (req, res) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Users fetch nahi ho sakay" });
  }
});

export default router;
