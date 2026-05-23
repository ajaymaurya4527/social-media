import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config({ path: "./.env" });

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import messageRouter from "./routes/message.route.js";
import notificationRouter from "./routes/notification.route.js"


// route declaration
app.use("/api/v1/users", userRouter); // url make http://localhost:7000/api/v1/user/register
app.use("/api/v1/post", postRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/notifications",notificationRouter);

export default app;