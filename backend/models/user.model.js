import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bio: { type: String, default: "Hey there! I am using WhatsApp." },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  profilePic: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
