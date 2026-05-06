import dotenv from "dotenv";
import {DB_NAME} from "../constant.js";
import mongoose from "mongoose";

dotenv.config({path:"./.env"})

const connectDB=async () => {
    try {
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n mongoDB connected DB HOST:${connectionInstance.connection.host}`) 
        console.log(`${process.env.MONGODB_URI}/${DB_NAME}`) 
    } catch (error) {
        console.log("MONGODB connection failed",error)
        process.exit(1)
    }
}

export default connectDB;