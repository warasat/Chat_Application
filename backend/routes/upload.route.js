import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { uploadImageController } from "../services/upload.service.js";

const router = express.Router();

// POST /api/messages/upload-image
router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  uploadImageController
);

export default router;
