export const verifySpecialUser = async (req, res, next) => {
  const { contactId } = req.body;

  try {
    const targetUser = await User.findById(contactId);

    if (targetUser && targetUser.isBot === true) {
      req.isBotChat = true;
      return next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: This action is reserved for ChatApp_AI only.",
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error during bot verification" });
  }
};
