import { Router } from "express";
import { 
  createNotification, 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  clearAllNotifications
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"; // आपका वर्किंग JWT मिडिलवेयर

const router = Router();

// सभी राउट्स को सुरक्षित रखने के लिए मिडिलवेयर लागू करें
router.use(verifyJWT); 

// http://localhost:7000/api/v1/notifications/create
router.route("/create").post(createNotification);

// http://localhost:7000/api/v1/notifications/getNotifications
router.route("/getNotifications").get(getNotifications);
router.route("/read-all").put(markAllAsRead);
router.route("/read/:id").put(markAsRead);
router.route("/clear").delete(clearAllNotifications);

export default router;