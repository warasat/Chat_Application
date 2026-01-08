import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { formatAndValidatePhone } from "../utils/phone.utils.js";
import cloudinary from "../config/cloudinary.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

export const registerUserService = async ({ username, phoneNumber, file }) => {
  const formattedNumber = formatAndValidatePhone(phoneNumber);
  let user = await User.findOne({ phoneNumber: formattedNumber });

  if (user) return { status: 200, data: user, message: "User exists" };

  let profilePicUrl = "";

  // Agar frontend se file aayi hai toh Cloudinary par bhejein
  if (file) {
    try {
      const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString(
        "base64"
      )}`;
      const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
        folder: "profile_pics",
      });
      profilePicUrl = uploadResponse.secure_url;
    } catch (uploadError) {
      console.error("Cloudinary Upload Error:", uploadError);
      // Agar image fail ho jaye toh default blank rakhen ya error throw karein
    }
  }

  user = await User.create({
    username,
    phoneNumber: formattedNumber,
    profilePic: profilePicUrl, // Model mein ye field honi chahiye
  });

  return { status: 201, data: user, message: "Registered in MongoDB" };
};

export const loginUserService = async (phoneNumber) => {
  const formattedNumber = formatAndValidatePhone(phoneNumber);
  const user = await User.findOne({ phoneNumber: formattedNumber });

  if (!user)
    return { status: 404, message: "User not found. Please register first." };

  return {
    status: 200,
    data: { user, token: generateToken(user._id) },
    message: "Login successful",
  };
};
