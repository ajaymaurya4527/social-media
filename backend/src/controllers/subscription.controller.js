// controllers/subscription.controller.js
import { User } from "../model/user.model.js";
import mongoose from "mongoose";

export const toggleFollow = async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user?._id; // Populated by verifyJWT middleware

        if (!currentUserId) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized request" 
            });
        }

        // Find target account profile
        const targetUser = await User.findOne({ username: username.toLowerCase() });
        if (!targetUser) {
            return res.status(404).json({ 
                success: false, 
                message: "User profile target not found" 
            });
        }

        // Check if user is trying to follow themselves
        if (targetUser._id.toString() === currentUserId.toString()) {
            return res.status(400).json({ 
                success: false, 
                message: "You cannot follow your own profile" 
            });
        }

        // Verify existing relationship status
        const isAlreadyFollowing = targetUser.followers.includes(currentUserId);

        if (isAlreadyFollowing) {
            // Unfollow action: pull IDs from both documents
            await User.findByIdAndUpdate(targetUser._id, {
                $pull: { followers: currentUserId }
            });
            await User.findByIdAndUpdate(currentUserId, {
                $pull: { following: targetUser._id }
            });

            return res.status(200).json({
                success: true,
                isFollowing: false,
                message: `Unfollowed ${username} successfully`
            });
        } else {
            // Follow action: push IDs to both documents seamlessly
            await User.findByIdAndUpdate(targetUser._id, {
                $addToSet: { followers: currentUserId }
            });
            await User.findByIdAndUpdate(currentUserId, {
                $addToSet: { following: targetUser._id }
            });

            return res.status(200).json({
                success: true,
                isFollowing: true,
                message: `Followed ${username} successfully`
            });
        }
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Internal server error during follow action" 
        });
    }
};