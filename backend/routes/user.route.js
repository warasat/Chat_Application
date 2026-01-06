import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import {
  getAllUsersService,
  addContact,
  getUserById,
} from "../services/user.service.js";
import User from "../models/user.model.js";
import stream from "stream";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Add Contact
router.post("/add-contact", addContact);

// 2. Get User by ID

router.get("/:id", protect, getUserById);

// 3. Get My Contacts

router.get("/my-contacts/:userId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "contacts",
      "username phoneNumber profilePic bio"
    );
    if (!user)
      return res.status(404).json({ message: "User not found in database" });
    res.json(user.contacts || []);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ message: "Error fetching contacts" });
  }
});

// 4. Get All Users

router.get("/", protect, async (req, res) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ error: "Fetch error" });
  }
});

// 5. Upload Profile Picture

router.post(
  "/upload-profile",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No image provided" });

      // Create a buffer stream from multer file
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      // Upload to Cloudinary using upload_stream
      const uploadResult = await new Promise((resolve, reject) => {
        const cloudStream = cloudinary.uploader.upload_stream(
          { folder: "profile_images" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        bufferStream.pipe(cloudStream);
      });

      // Update user profile with new profilePic
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { profilePic: uploadResult.secure_url },
        { new: true }
      );

      res.status(200).json({ url: updatedUser.profilePic });
    } catch (err) {
      console.error("Upload-profile error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
