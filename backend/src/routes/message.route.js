import { Router } from "express";

import {
  sendMessage,
  getChatHistory,
  markAsRead,
  getUnreadCount,
} from "../controllers/message.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/send", sendMessage);

router.get("/history/:receiverId", getChatHistory);

router.post("/mark-as-read/:receiverId", markAsRead);

router.get("/unread-count", getUnreadCount);

export default router;