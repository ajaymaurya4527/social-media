import { Message } from "../model/message.model.js";

// Traditional Controller HTTP transaction validation fallback
const sendMessage = async (req, res) => {
  try {
    const { receiverId, messageText } = req.body;
    const senderId = req.user?._id;

    if (!receiverId || !messageText?.trim()) {
      return res.status(400).json({ success: false, message: "Missing content fields" });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      messageText: messageText.trim(),
    });

    const io = req.app.get("io");
    if (io) {
      const roomId = [senderId.toString(), receiverId.toString()].sort().join("_");
      io.to(roomId).emit("receive_message", message);
      io.to(receiverId.toString()).emit("new_message_notification", message);
    }

    return res.status(201).json({
      success: true,
      data: message,
      message: "Message archived and emitted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Pulls conversation text blocks filtered by timestamps 
const getChatHistory = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user?._id;

    const history = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { sendMessage, getChatHistory };