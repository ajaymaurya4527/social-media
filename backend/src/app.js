import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config({path:"./.env"})


 const app=express();


app.use(cors({
    // Replace with your actual frontend URL (no trailing slash)
    origin: "http://localhost:5173", 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({limit:"16kb"}));

app.use(express.urlencoded({extended:true,limit:"16kb"}));

app.use(express.static("public"));

app.use(cookieParser());


//routes
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";


//route decleration
app.use("/api/v1/users",userRouter);//url make http://localhost:7000/api/v1/user/rigister
app.use("/api/v1/post",postRouter)

export default app

