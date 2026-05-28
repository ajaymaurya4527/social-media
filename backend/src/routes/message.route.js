import { Router } from "express";

import {
  getChatHistory,
  markAsRead,
  getUnreadCount,
} from "../controllers/message.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/history/:receiverId", getChatHistory);

router.patch("/mark-as-read/:receiverId", markAsRead);

router.get("/unread-count", getUnreadCount);

export default router;