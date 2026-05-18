import { Router } from "express";
import { sendMessage, getChatHistory } from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"; // Standard JWT validation middleware

const router = Router();

router.use(verifyJWT); // Secure all messaging endpoints

router.route("/send").post(sendMessage);
router.route("/history/:receiverId").get(getChatHistory);

export default router;