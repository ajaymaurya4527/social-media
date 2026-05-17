// routes/subscription.route.js
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleFollow } from "../controllers/subscription.controller.js";

const router = Router();

// Streamlined path routing to match clean endpoint conventions
router.route("/toggle/:username").post(verifyJWT, toggleFollow);

export default router;