import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // वह यूज़र जिसे नोटिफिकेशन मिलेगा (जैसे आप)
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // तेजी से सर्च करने के लिए इंडेक्सिंग
    },
    // वह यूज़र जिसने एक्शन ट्रिगर किया (जिसने फॉलो या लाइक किया)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // नोटिफिकेशन का प्रकार
    type: {
      type: String,
      enum: ["follow", "like", "comment", "general"],
      required: true,
    },
    // दिखने वाला मैसेज (जैसे: "started following you.")
    message: {
      type: String,
      required: true,
    },
    // पढ़ा गया या नहीं
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // इससे createdAt और updatedAt अपने आप मिल जाएंगे
);

export const Notification = mongoose.model("Notification", notificationSchema);