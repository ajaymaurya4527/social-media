import { Post } from "../model/post.model.js";
import fs from "fs";
import { User } from "../model/user.model.js"; 
import { uploadCloudinary ,deleteFromCloudinary } from "../utils/cloudinary.js";
import { Comment } from "../model/comment.model.js";
import mongoose from "mongoose";

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
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
            }
        }

        if (mediaFiles.length === 0) {
            return res.status(400).json({ success: false, message: "Failed to upload media" });
        }

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

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

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


// 4. Delete a Post
const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await Post.findById(postId);

        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        if (post.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this post" });
        }

        for (const file of post.mediaFiles) {
            await deleteFromCloudinary(file.public_id);
        }

        await Post.findByIdAndDelete(postId);

        return res.status(200).json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get Home Feed (Global Engine Configuration)
const getHomeFeed = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const rawPosts = await Post.find({ isPublished: true })
        .populate("owner", "username avatar followers") 
        .sort("-createdAt");

        const posts = rawPosts.map(post => {
            const postObj = post.toObject();
            
            postObj.isLikedExplicitly = post.likes ? post.likes.some(id => id.toString() === userId.toString()) : false;
            postObj.isSavedByMe = user.savedPosts ? user.savedPosts.some(id => id.toString() === post._id.toString()) : false;
            
            if (postObj.owner) {
                postObj.owner.isFollowing = post.owner.followers 
                    ? post.owner.followers.some(id => id.toString() === userId.toString()) 
                    : false;
            }
            
            return postObj;
        });

        return res.status(200).json({
            success: true,
            data: posts,
            message: "Global home feed parsed successfully"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Toggle Follow
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
            me.following.pull(userIdToFollow);
            userToFollow.followers.pull(myId);
        } else {
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

// 7. Toggle Save Post
const toggleSavePost = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const objectPostId = new mongoose.Types.ObjectId(postId);
    const user = await User.findById(userId);

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

// 8. Get Saved Posts
const getSavedPosts = async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: "savedPosts",
        options: { sort: { createdAt: -1 } } 
    });

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ 
        success: true, 
        data: user.savedPosts 
    });
};

// 9. Add Comment (MODIFIED: Returns populated comment object directly to Frontend)
const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: "Comment message trace is mandatory" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Target post document missing" });
        }

        let comment = await Comment.create({
            content,
            post: postId,
            owner: userId
        });

        // Populate owner metadata context before transmitting back to UI interface
        comment = await comment.populate("owner", "username avatar");

        post.commentCount = (post.commentCount || 0) + 1;
        await post.save();

        return res.status(201).json({
            success: true,
            data: comment,
            message: "Comment structural update saved successfully"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 10. NEW: Get Post Comments
const getPostComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const comments = await Comment.find({ post: postId })
            .populate("owner", "username avatar")
            .sort("createdAt"); // Oldest comments first

        return res.status(200).json({
            success: true,
            data: comments,
            message: "Comments fetched successfully"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


const getSinglePost = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post id"
            });
        }

        const post = await Post.findById(postId)
            .populate("owner", "username avatar");

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: post
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export { 
    createPost, 
    toggleLike, 
    getUserPosts, 
    deletePost, 
    getHomeFeed, 
    toggleFollow, 
    toggleSavePost, 
    getSavedPosts, 
    addComment,
    getPostComments ,
    getSinglePost
};