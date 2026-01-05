import express from "express";
import Notification from "../models/notification.model.js";

const router = express.Router();

//  Get all notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ receiverId: userId })
      .sort({ createdAt: -1 })
      .populate("senderId", "username phoneNumber");
    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

//  Mark all as read
router.put("/mark-read/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany(
      { receiverId: userId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: "Notifications marked as read" });
  } catch (err) {
    console.error("Mark as read error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
// 🟢 Mark one notification as read
router.put("/read/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!notif)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    res.json({ success: true, data: notif });
  } catch (err) {
    console.error("Mark one read error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 🗑️ Delete one notification
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
