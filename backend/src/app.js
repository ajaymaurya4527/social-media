import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({limit:"16kb"}));

app.use(express.urlencoded({extended:true,limit:"16kb"}));

app.use(express.static("public"));

app.use(cookieParser());


//routes
import userRouter from "./routes/user.route.js";


//route decleration
app.use("/api/v1/user",userRouter);//url make http://localhost:7000/api/v1/user/rigister



export {app};