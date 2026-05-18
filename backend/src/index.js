import dotenv from "dotenv"; 
import { createServer } from "http"; 
import { Server } from "socket.io"; 
import connectDB from "./db/index.js";
import app from "./app.js";
import { Message } from "./model/message.model.js"; 

dotenv.config({ path: "./.env" });

const httpServer = createServer(app);

// Initialize Socket.io cluster attached onto the native platform port instances
const io = new Server(httpServer, {
  cors: {
    origin: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  },
});

app.set("io", io);

const activeUsers = new Map();

io.on("connection", (socket) => {
  console.log(`⚡ Socket Active Connection Hooked: ${socket.id}`);

  // Map tracking variables to active user connections
  socket.on("join_private_room", (userId) => {
    if (userId) {
      socket.join(userId.toString());
      activeUsers.set(userId.toString(), socket.id); 
      console.log(`👥 Context registration completed for user room ID: ${userId}`);
    }
  });

  // Dual sorted keys generation mapping conversational bridges
  socket.on("join_chat", ({ senderId, receiverId }) => {
    if (senderId && receiverId) {
      const roomId = [senderId.toString(), receiverId.toString()].sort().join("_");
      socket.join(roomId);
      console.log(`💬 Conversational bridge attached over virtual room ID: ${roomId}`);
    }
  });

  // Transaction delivery engine pipeline
  socket.on("send_message", async (data) => {
    const { senderId, receiverId, messageText } = data;
    if (!senderId || !receiverId || !messageText?.trim()) return;

    const roomId = [senderId.toString(), receiverId.toString()].sort().join("_");

    try {
      const savedMessage = await Message.create({
        senderId,
        receiverId,
        messageText: messageText.trim(),
      });

      // Transmit directly into the synchronized virtual channel room
      io.to(roomId).emit("receive_message", savedMessage);

      // Trigger standard banner notification payload if the recipient is online but navigating another screen area
      const receiverSocketId = activeUsers.get(receiverId.toString());
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("new_message_notification", savedMessage);
      }
    } catch (error) {
      console.error("❌ Mongoose transaction delivery cluster execution error:", error.message);
    }
  });

  socket.on("disconnect", () => {
    for (let [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    console.log(`❌ Socket link closed: ${socket.id}`);
  });
});

connectDB()
  .then(() => {
    httpServer.listen(process.env.PORT || 7000, () => {
      console.log(`Server is running at port : ${process.env.PORT || 7000}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });