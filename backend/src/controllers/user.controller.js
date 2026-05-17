import { User } from "../model/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { subscribe } from "diagnostics_channel";
import { Post } from "../model/post.model.js";
import { Subscription } from "../model/subscription.model.js";



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
        console.log(error)
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
                accessToken,
                refreshToken,
                message: "User logged in successfully"
            });

    } catch (error) {
        console.log(error)
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


// Add this updated function inside your user.controller.js
const getUserChannelProfile = async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        return res.status(400).json({
            success: false,
            message: "Username is missing"
        });
    }

    try {
        // Find the target profile user first to access their ID easily
        const targetUser = await User.findOne({ username: username.toLowerCase() });
        
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Channel does not exist"
            });
        }

        // Fetch posts created by this specific user
        const userPosts = await Post.find({ owner: targetUser._id }).sort({ createdAt: -1 });

        // Build the active user relationship verification safely
        const loggedInUserId = req.user?._id;
        let isFollowingUser = false;

        if (loggedInUserId) {
            // Check if logged-in user's ID is present in the target user's followers array
            isFollowingUser = targetUser.followers.some(
                (followerId) => followerId.toString() === loggedInUserId.toString()
            );
        }

        // Send back organized response payload matching your exact frontend expectations
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    _id: targetUser._id,
                    fullName: targetUser.fullName,
                    username: targetUser.username,
                    email: targetUser.email,
                    avatar: targetUser.avatar,
                    coverImage: targetUser.coverImage,
                    bio: targetUser.bio,
                    isVerified: targetUser.isVerified,
                    followersCount: targetUser.followers ? targetUser.followers.length : 0,
                    followingCount: targetUser.following ? targetUser.following.length : 0,
                    isFollowing: isFollowingUser
                },
                posts: userPosts // Injected actual posts array instead of hardcoded empty bracket []
            },
            message: "User channel fetched successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error?.message || "Internal server error while fetching channel profile"
        });
    }
};

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
const updateAccountDetails = async (req, res) => {
    try {
        const { fullName, bio } = req.body;

        // Validation: Ensure at least one field is provided
        if (!fullName && !bio) {
            return res.status(400).json({ 
                success: false, 
                message: "Nothing to update" 
            });
        }

        // Find user by ID (from auth middleware) and update
        const updatedUser = await User.findByIdAndUpdate(
            req.user?._id, // Assumes your auth middleware attaches user to req
            {
                $set: {
                    fullName: fullName,
                    bio: bio,
                    email: req.user.email
                }
            },
            { new: true, runValidators: true} // Returns the updated object rather than the old one
        ).select("-password"); // Don't send the password back

        return res.status(200).json({
            success: true,
            data: updatedUser,
            message: "Account details updated successfully"
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};
const searchUsers = async (req, res) => {
    try {
        // Get the search query from the URL (e.g., /api/v1/users/search?q=john)
        const { q } = req.query;

        // If no query parameter is provided, return default suggested users (e.g., latest 10 users)
        if (!q || q.trim() === "") {
            const suggestions = await User.find()
                .select("username fullName avatar isVerified")
                .limit(10)
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                data: suggestions
            });
        }

        // Clean the query string
        const searchRegex = new RegExp(q.trim(), "i"); // "i" makes it case-insensitive

        // Find users where username OR fullName matches the regex search pattern
        const matchedUsers = await User.find({
            $or: [
                { username: { $regex: searchRegex } },
                { fullName: { $regex: searchRegex } }
            ]
        })
        .select("username fullName avatar isVerified") // Only send necessary fields
        .limit(20); // Limit results for better performance

        return res.status(200).json({
            success: true,
            data: matchedUsers
        });

    } catch (error) {
        console.error("Backend search error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Server error occurred while searching profiles." 
        });
    }
};
const getUserPublicProfile = async (req, res) => {
    try {
        const { username } = req.params;

        // 1. Find the target user by their unique username
        const user = await User.findOne({ username })
            .select("username fullName avatar bio followers following");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "This user profile does not exist."
            });
        }

        // 2. Fetch all published posts linked to this specific user ID
        const posts = await Post.find({ 
            owner: new mongoose.Types.ObjectId(user._id),
            isPublished: true 
        })
        .sort({ createdAt: -1 })
        .select("mediaType mediaFiles thumbnail caption likes commentCount views createdAt");

        // 3. Format the user object to send explicit length counts to the frontend
        const profileData = {
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
            bio: user.bio,
            followersCount: user.followers ? user.followers.length : 0,
            followingCount: user.following ? user.following.length : 0,
        };

        // 4. Map posts to explicitly calculate structural parameters like likesCount
        const formattedPosts = posts.map(post => ({
            _id: post._id,
            mediaType: post.mediaType,
            // Fallback map: if mediaFiles exist, extract the first asset URL for the profile preview grid
            image: post.mediaFiles && post.mediaFiles.length > 0 ? post.mediaFiles[0].url : post.thumbnail,
            caption: post.caption,
            likesCount: post.likes ? post.likes.length : 0,
            commentsCount: post.commentCount || 0,
            views: post.views,
            createdAt: post.createdAt
        }));

        return res.status(200).json({
            success: true,
            message: "Public profile loaded successfully.",
            data: {
                user: profileData,
                posts: formattedPosts
            }
        });

    } catch (error) {
        console.error("Profile endpoint error details:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error loading profile view dashboards.",
            error: error.message
        });
    }
};



export { registerUser, loginUser,lagoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccount,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory,updateAccountDetails,searchUsers,getUserPublicProfile};