import User from "../models/user.model.js";
import { getIO } from "./socket.service.js";

// 1. Get Single User Details
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(
      req.params.id,
      "username phoneNumber profilePic bio _id"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Error in getUserById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 2. Add Contact with Two-Way Synchronization
export const addContact = async (req, res) => {
  let { phoneNumber, currentUserId } = req.body;
  try {
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    const userToAdd = await User.findOne({ phoneNumber: formattedPhone });

    if (!userToAdd) {
      return res
        .status(404)
        .json({ message: `User with ${formattedPhone} not found` });
    }

    const currentUser = await User.findById(currentUserId);
    if (currentUser.contacts.includes(userToAdd._id)) {
      return res.status(400).json({ message: "Already in contacts" });
    }

    // C. MUTUAL UPDATE: Dono users ki array update karein ($addToSet is safer)

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { contacts: userToAdd._id },
    });

    // Update User B (Recipient - Auto Sync)
    await User.findByIdAndUpdate(userToAdd._id, {
      $addToSet: { contacts: currentUserId },
    });

    // D. SOCKET REAL-TIME TRIGGER: User B ko foran notify karein
    const io = getIO();
    if (io) {
      io.to(userToAdd._id.toString()).emit("new_contact_added", {
        _id: currentUser._id,
        username: currentUser.username,
        phoneNumber: currentUser.phoneNumber,
        profilePic: currentUser.profilePic,
        bio: currentUser.bio,
      });
    }

    res.status(200).json({
      message: "Contact added for both users successfully!",
      contact: userToAdd,
    });
  } catch (err) {
    console.error("Error in addContact:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Get All Users (Fixed naming to match your route import)
export const getAllUsersService = async (req, res) => {
  try {
    const users = await User.find(
      {},
      "username phoneNumber _id profilePic bio"
    );
    if (res) {
      return res.status(200).json(users);
    }
    return users;
  } catch (err) {
    console.error("Error in getAllUsersService:", err);
    if (res) return res.status(500).json({ message: "Server error" });
    throw err;
  }
};
