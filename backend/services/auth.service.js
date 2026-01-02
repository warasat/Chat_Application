import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { formatAndValidatePhone } from "../utils/phone.utils.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

export const registerUserService = async ({ username, phoneNumber }) => {
  const formattedNumber = formatAndValidatePhone(phoneNumber);
  let user = await User.findOne({ phoneNumber: formattedNumber });
  if (user) return { status: 200, data: user, message: "User exists" };

  user = await User.create({ username, phoneNumber: formattedNumber });
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
