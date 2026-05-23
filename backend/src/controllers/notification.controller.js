import { Notification } from "../model/notification.model.js";

// 1. नया नोटिफिकेशन बनाएँ (Create Notification)
export const createNotification = async (req, res) => {
  try {
    const { targetUserId, type, message } = req.body;
    const senderId = req.user?._id; // आपके Auth Middleware से प्राप्त लॉग्ड-इन यूज़र ID

    if (!targetUserId || !type || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // यदि यूज़र खुद को ही फॉलो/लाइक कर रहा है, तो नोटिफिकेशन न बनाएं
    if (targetUserId.toString() === senderId.toString()) {
      return res.status(200).json({ success: true, message: "Self action, no notification created" });
    }

    const notification = await Notification.create({
      targetUserId,
      sender: senderId,
      type,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 2. लॉग्ड-इन यूज़र के सारे नोटिफिकेशन लाएँ (Get All Notifications)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;

    // यूज़र के सारे नोटिफिकेशन्स लाएँ और सेंडर की प्रोफाइल (username, avatar) को populate करें
    const notifications = await Notification.find({ targetUserId: userId })
      .populate("sender", "username avatar fullName") // केवल ज़रूरी फ़ील्ड्स लाएँ
      .sort({ createdAt: -1 }); // नए नोटिफिकेशन सबसे ऊपर दिखेंगे

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 3. किसी एक नोटिफिकेशन को Read मार्क करें
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, targetUserId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 4. सभी नोटिफिकेशन्स को एक साथ Read मार्क करें
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;

    await Notification.updateMany(
      { targetUserId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 5. सारे नोटिफिकेशन्स डिलीट करें (Clear All)
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;

    await Notification.deleteMany({ targetUserId: userId });

    return res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};