import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config({path:"./.env"})


 const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));
app.get("/test", (req, res) => res.send("Server is alive!"));

app.use(express.json({limit:"16kb"}));

app.use(express.urlencoded({extended:true,limit:"16kb"}));

app.use(express.static("public"));

app.use(cookieParser());


//routes
import userRouter from "./routes/user.route.js";


//route decleration
app.use("/api/v1/users",userRouter);//url make http://localhost:7000/api/v1/user/rigister

export default app

