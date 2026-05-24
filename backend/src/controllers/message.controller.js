import { Message } from "../model/message.model.js";

const sendMessage = async (req, res) => {
  try {
    const { receiverId, messageText } = req.body;

    const senderId = req.user?._id;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver required",
      });
    }

    if (!messageText?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message required",
      });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      messageText: messageText.trim(),
      isRead: false,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "username avatar fullName")
      .populate("receiverId", "username avatar fullName");

    const io = req.app.get("io");

    const roomId = [senderId.toString(), receiverId.toString()]
      .sort()
      .join("_");

    io.to(roomId).emit("receive_message", populatedMessage);

    io.to(receiverId.toString()).emit(
      "new_message_notification",
      populatedMessage
    );

    return res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { receiverId } = req.params;

    const senderId = req.user?._id;

    const messages = await Message.find({
      $or: [
        {
          senderId,
          receiverId,
        },
        {
          senderId: receiverId,
          receiverId: senderId,
        },
      ],
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const senderId = req.params.receiverId;

    const currentUserId = req.user?._id;

    await Message.updateMany(
      {
        senderId,
        receiverId: currentUserId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user?._id;

    const unreadMessages = await Message.find({
      receiverId: currentUserId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count: unreadMessages.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  sendMessage,
  getChatHistory,
  markAsRead,
  getUnreadCount,
};