import cloudinary from "../config/cloudinary.js";

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

    const buffer = req.file.buffer;
    const base64 = buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "chat_audios",
      resource_type: "video",
    });

    return res.status(200).json({
      message: "Audio uploaded successfully",
      url: result.secure_url,
    });
  } catch (err) {
    console.error("Audio upload failed:", err);
    return res.status(500).json({
      message: "Audio upload failed",
      error: err.message,
    });
  }
};
