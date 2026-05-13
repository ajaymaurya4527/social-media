import jwt from "jsonwebtoken";
import { User } from "../model/user.model";

export const verifyJWT=async (req,res)=>{
    try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer")

        if(!token){
            return res.json({success:false,message:"Unauthorized request"})
        }

        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

        const user=await User.findById(decodedToken?._id)

        if(!user){
            return res.json({success:false,message:"invalid acessToken"})
        }

        req.user=user;
        next()
        
    } catch (error) {
        return res.json({success:false,message:error.message})
        
    }
}

