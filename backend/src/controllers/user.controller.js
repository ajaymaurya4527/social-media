import { User } from "../model/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { subscribe } from "diagnostics_channel";

const registerUser = async (req, res) => {
    try {
        const { username, email, fullName, password } = req.body

        // 1. Validation (Empty fields)
        if ([username, email, fullName, password].some((field) => field?.trim() === "")) {
            return res.status(400).json({ success: false, message: "All fields are required" })
        }

        // 2. Check if user already exists
        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })
        if (existedUser) {
            return res.status(409).json({ success: false, message: "User with email or username already exists" })
        }

        // 3. Check for Avatar (Local Path)
        const avatarLocalPath = req.files?.avatar?.[0]?.path
        if (!avatarLocalPath) {
            return res.status(400).json({ success: false, message: "Avatar file is required" })
        }

        // 4. Check for Cover Image (Optional)
        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }

        // 5. Upload to Cloudinary
        const avatar = await uploadCloudinary(avatarLocalPath);
        const coverImage = await uploadCloudinary(coverImageLocalPath);

        if (!avatar) {
            return res.status(400).json({ success: false, message: "Avatar upload failed" })
        }

        // 6. Create User in DB
        const user = await User.create({
            fullName,
            username: username.toLowerCase(),
            email,
            password,
            avatar: avatar.url,
            coverImage: coverImage?.url || ""
        })

        // 7. Remove sensitive fields from response
        const createdUser = await User.findById(user._id).select("-password -refreshToken")

        if (!createdUser) {
            return res.status(500).json({ success: false, message: "Something went wrong while registering user" })
        }

        const accessToken = createdUser.generateAccessToken();
        const refreshToken = createdUser.generateRefreshToken();

        // 9. Refresh Token ko DB mein save karein
        createdUser.refreshToken = refreshToken;
        await createdUser.save({ validateBeforeSave: false });

        const options = {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 Hours
        };

        // 10. Success Response with Tokens
        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                success: true,
                data: createdUser,
                accessToken, // Frontend ke liye
                refreshToken, // Frontend ke liye
                message: "User registered and logged in successfully"
            });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message
        })
    }
}
const loginUser = async (req, res) => {
    try {
        // 1. Data lene ka (email or username, aur password)
        const { email, username, password } = req.body;

        // 2. Validation
        if (!(username || email)) {
            return res.status(400).json({ message: "Username or email is required" });
        }

        // 3. User ko find karo DB mein
        const user = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        // 4. Password check karo (aapka custom method)
        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid user credentials" });
        }

        // 5. Access and Refresh token generate karo
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // 6. Refresh token ko DB mein save karo
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // 7. Cookie options set karo (Security ke liye)
        const options = {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000
        };

        // 8. Response bhejo tokens ke saath
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                success: true,
                user: loggedInUser,
                accessToken,
                refreshToken,
                message: "User logged in successfully"
            });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const lagoutUser=async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {//In our backend controller, const options = { httpOnly: true, secure: true } is used to configure security flags for cookies (like session IDs or JWTs) to protect them from common web attacks
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({success:true,message:"logged out successfully"})
}

const refreshAccessToken = async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized request"
        })
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            })
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is expired or used"
            })
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json({
                success: true,
                accessToken,
                refreshToken: newRefreshToken,
                message: "Access token refreshed"
            })

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error?.message || "Invalid refresh token"
        })
    }
}
const changeCurrentPassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body

    try {
        const user = await User.findById(req.user?._id)
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Old password is incorrect"
            })
        }

        user.password = newPassword
        await user.save({ validateBeforeSave: false })

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while changing password"
        })
    }
}

const getCurrentUser = async (req, res) => {
    try {
        

        return res.status(200).json({
            success: true,
            data: req.user,
            message: "Current user fetched successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while fetching user"
        })
    }
}
const updateAccount = async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        return res.status(400).json({
            success: false,
            message: "All fields (fullName and email) are required"
        })
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName: fullName,
                    email: email
                }
            },
            {
                new: true
            }
        ).select("-password")

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.status(200).json({
            success: true,
            data: user,
            message: "Account updated successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while updating account"
        })
    }
}

const updateUserAvatar = async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        return res.status(400).json({
            success: false,
            message: "Avatar file is missing"
        })
    }

    try {
        // 1. Upload new avatar to Cloudinary
        const avatar = await uploadOnCloudinary(avatarLocalPath)

        if (!avatar?.url) {
            return res.status(400).json({
                success: false,
                message: "Error while uploading avatar to Cloudinary"
            })
        }

        // 2. Update user document with the new avatar URL
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url
                }
            },
            { new: true }
        ).select("-password")

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.status(200).json({
            success: true,
            data: user,
            message: "Avatar updated successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while updating avatar"
        })
    }
}

const updateUserCoverImage = async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        return res.status(400).json({
            success: false,
            message: "Cover image file is required"
        })
    }

    try {
        // 1. Upload new image to Cloudinary
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if (!coverImage?.url) {
            return res.status(400).json({
                success: false,
                message: "Failed to upload cover image to Cloudinary"
            })
        }

        // 2. Update the user document with the new URL
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            { new: true }
        ).select("-password")

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.status(200).json({
            success: true,
            data: user,
            message: "Cover image updated successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while updating cover image"
        })
    }
}
const getUserChannelProfile = async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        return res.status(400).json({
            success: false,
            message: "Username is missing"
        })
    }

    try {
        const channel = await User.aggregate([
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber", // Fixed typo: 'suscriber' to 'subscriber'
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ])

        if (!channel?.length) {
            return res.status(404).json({
                success: false,
                message: "Channel does not exist"
            })
        }

        return res.status(200).json({
            success: true,
            data: channel[0],
            message: "User channel fetched successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while fetching channel profile"
        })
    }
}
const getWatchHistory = async (req, res) => {
    try {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        if (!user || user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.status(200).json({
            success: true,
            data: user[0].watchHistory,
            message: "Watch history fetched successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while fetching watch history"
        })
    }
}


export { registerUser, loginUser,lagoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccount,updateUserAvatar,updateUserCoverImage };