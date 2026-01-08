import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import {
  uploadImageController,
  uploadAudioController,
} from "../services/upload.service.js";

const router = express.Router();

router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  uploadImageController
);

router.post(
  "/upload-audio",
  protect,
  upload.single("audio"),
  uploadAudioController
);

export default router;
