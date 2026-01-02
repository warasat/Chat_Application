import User from "../models/user.model.js"; // Import add karein

export const addContact = async (req, res) => {
  let { phoneNumber, currentUserId } = req.body;

  try {
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    console.log("Searching for:", formattedPhone);

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

    currentUser.contacts.push(userToAdd._id);
    await currentUser.save();

    res
      .status(200)
      .json({ message: "Contact added successfully!", contact: userToAdd });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsersService = async () => {
  return await User.find({}, "username phoneNumber _id profilePic bio");
};
