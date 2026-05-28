import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./db/index.js";
import app from "./app.js";

import { Message } from "./model/message.model.js";

dotenv.config({ path: "./.env" });

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  },
});

// Make io accessible inside controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Join user private notification room
  socket.on("join_private_room", (userId) => {
    if (!userId) return;

    socket.join(userId.toString());

    console.log(`User joined private room: ${userId}`);
  });

  // Join chat room between two users
  socket.on("join_chat", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;

    const roomId = [senderId.toString(), receiverId.toString()]
      .sort()
      .join("_");

    socket.join(roomId);

    console.log(`Joined chat room: ${roomId}`);
  });

  // Send message
  socket.on("send_message", async (data) => {
  try {
    const { senderId, receiverId, messageText } = data;

    if (!senderId || !receiverId || !messageText?.trim()) {
      return;
    }

    const roomId = [senderId, receiverId]
      .sort()
      .join("_");

    const message = await Message.create({
      senderId,
      receiverId,
      messageText: messageText.trim(),
      isRead: false,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "username avatar fullName")
      .populate("receiverId", "username avatar fullName");

    io.to(roomId).emit(
      "receive_message",
      populatedMessage
    );

    io.to(receiverId.toString()).emit(
      "new_message_notification",
      populatedMessage
    );
  } catch (error) {
    console.log(error);
  }
});
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Connect DB and start server
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 7000;

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed:", err);
  });