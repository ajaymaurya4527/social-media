import dotenv from "dotenv"; // 1. Sabse pehle import
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: './.env' // 2. Phir config
});

connectDB()
.then(() => {
    app.listen(process.env.PORT || 7000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})