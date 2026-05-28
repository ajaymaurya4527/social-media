import { Message } from "../model/message.model.js";



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
  getChatHistory,
  markAsRead,
  getUnreadCount,
};