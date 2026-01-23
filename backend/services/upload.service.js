import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

// === Image Upload Controller  ===
export const uploadImageController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const buffer = req.file.buffer;
    const base64 = buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "chat_images",
      resource_type: "image",
    });

    return res.status(200).json({
      message: "Image uploaded successfully",
      url: result.secure_url,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({
      message: "Image upload failed",
      error: err.message,
    });
  }
};

// ===  Audio Upload Controller ===
export const uploadAudioController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    // Cloudinary upload using stream
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "chat_audios",
          resource_type: "auto", // <--- "video" ki jagah "auto" karein taake Cloudinary khud handle kare
          public_id: `voice-${Date.now()}`,
          // Hum format force nahi karenge, balki transformation se MP3 mangwayenge
          transformation: [{ fetch_format: "mp3", codec: "mp3" }],
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Stream Error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Create readable stream from buffer and pipe to cloudinary
      const bufferStream = new Readable();
      bufferStream.push(req.file.buffer);
      bufferStream.push(null); // Signal end of stream
      bufferStream.pipe(uploadStream);
    });

    const result = await uploadPromise;

    return res.status(200).json({
      message: "Audio uploaded successfully",
      url: result.secure_url,
    });
  } catch (err) {
    console.error("Full Backend Error:", err);
    return res.status(500).json({
      message: "Audio upload failed",
      error: err.message,
    });
  }
};
