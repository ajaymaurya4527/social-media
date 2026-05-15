import { Post } from "../model/post.model.js";
import fs from "fs";
import { User } from "../model/user.model.js"; // Import User for follow logic
import { uploadCloudinary ,deleteFromCloudinary } from "../utils/cloudinary.js";

// 1. Create a Post
const createPost = async (req, res) => {
    try {
        const { caption, location, mediaType, tags } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Media files are required"
            });
        }

        const mediaFiles = [];

        // Upload files to Cloudinary
        for (const file of req.files) {
            const localPath = file.path;
            try {
                const uploadedFile = await uploadCloudinary(localPath);

                if (uploadedFile) {
                    mediaFiles.push({
                        url: uploadedFile.url,
                        public_id: uploadedFile.public_id
                    });
                }
            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
            } finally {
                // Clean up local storage regardless of upload success
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
            }
        }

        if (mediaFiles.length === 0) {
            return res.status(400).json({ success: false, message: "Failed to upload media" });
        }

        // --- FIXED TAG LOGIC ---
        // 1. If tags is "tag1, tag2", it splits them.
        // 2. .filter(Boolean) removes empty strings if the input was empty.
        // 3. .map(t => t.trim()) removes accidental spaces.
        const processedTags = tags 
            ? tags.split(",").map(tag => tag.trim()).filter(tag => tag !== "") 
            : [];

        const post = await Post.create({
            caption,
            location,
            mediaType,
            mediaFiles,
            tags: processedTags,
            owner: req.user._id
        });

        return res.status(201).json({
            success: true,
            data: post,
            message: "Post created successfully"
        });

    } catch (error) {
        console.error("Create Post Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// 2. Toggle Like
const toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            post.likes.pull(userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();

        return res.status(200).json({
            success: true,
            data: { isLiked: !isLiked },
            message: isLiked ? "Unliked successfully" : "Liked successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error toggling like"
        });
    }
};

// 3. Get User Posts
const getUserPosts = async (req, res) => {
    try {
        const { username } = req.params;

        // 1. Find the user by username to get their ID
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 2. Fetch posts belonging to that user ID
        const posts = await Post.find({ owner: user._id }).sort("-createdAt");

        return res.status(200).json({
            success: true,
            data: posts,
            message: "User posts fetched successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error fetching posts"
        });
    }
};


// 4. Delete a Post (and clean up Cloudinary)
const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await Post.findById(postId);

        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        // Security: Check if the requester is the owner
        if (post.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this post" });
        }

        // Delete all media files from Cloudinary
        for (const file of post.mediaFiles) {
            await deleteFromCloudinary(file.public_id);
        }

        await Post.findByIdAndDelete(postId);

        return res.status(200).json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get Home Feed (Posts from people you follow)
const getHomeFeed = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Find posts where the owner is in the user's following list
        const posts = await Post.find({
            owner: { $in: user.following },
            isPublished: true
        })
        .populate("owner", "username avatar") // Attach user info to post
        .sort("-createdAt");

        return res.status(200).json({
            success: true,
            data: posts,
            message: "Home feed fetched successfully"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Toggle Follow (User follow logic)
const toggleFollow = async (req, res) => {
    try {
        const { userIdToFollow } = req.params;
        const myId = req.user._id;

        if (userIdToFollow === myId.toString()) {
            return res.status(400).json({ success: false, message: "You cannot follow yourself" });
        }

        const userToFollow = await User.findById(userIdToFollow);
        const me = await User.findById(myId);

        if (!userToFollow) return res.status(404).json({ success: false, message: "User not found" });

        const isFollowing = me.following.includes(userIdToFollow);

        if (isFollowing) {
            // Unfollow
            me.following.pull(userIdToFollow);
            userToFollow.followers.pull(myId);
        } else {
            // Follow
            me.following.push(userIdToFollow);
            userToFollow.followers.push(myId);
        }

        await me.save();
        await userToFollow.save();

        return res.status(200).json({ 
            success: true, 
            message: isFollowing ? "Unfollowed" : "Followed" 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
import mongoose from "mongoose";

const toggleSavePost = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    // 1. Convert string ID to ObjectId for reliable comparison
    const objectPostId = new mongoose.Types.ObjectId(postId);
    const user = await User.findById(userId);

    // 2. Use .some() with .equals() for ObjectId comparison
    const isSaved = user.savedPosts.some(id => id.equals(objectPostId));

    if (isSaved) {
        await User.findByIdAndUpdate(userId, { $pull: { savedPosts: objectPostId } });
    } else {
        await User.findByIdAndUpdate(userId, { $push: { savedPosts: objectPostId } });
    }

    res.status(200).json({ 
        success: true, 
        message: isSaved ? "Removed from saved" : "Saved to collection" 
    });
};

const getSavedPosts = async (req, res) => {
    // 3. Ensure you use .populate() so the frontend gets the full post object, not just the ID
    const user = await User.findById(req.user._id).populate({
        path: "savedPosts",
        options: { sort: { createdAt: -1 } } // Show newest saves first
    });

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ 
        success: true, 
        data: user.savedPosts // This is now an array of Post objects
    });
};
export { createPost, toggleLike, getUserPosts, deletePost, getHomeFeed, toggleFollow ,toggleSavePost,getSavedPosts };
