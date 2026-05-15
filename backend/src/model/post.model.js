import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema = new Schema(
    {
        mediaType: {
            type: String,
            enum: ["image", "video"],
            required: true
        },
        // Using mediaFiles as an array allows for "Carousel" posts (multiple images/videos)
        mediaFiles: [
            {
                url: {
                    type: String, // Cloudinary URL
                    required: true
                },
                public_id: {
                    type: String, // Useful for deleting from Cloudinary later
                    required: true
                }
            }
        ],
        thumbnail: {
            type: String, // Required for videos, optional for images
            default: ""
        },
        caption: {
            type: String,
            trim: true,
            maxlength: 2200 // Instagram's caption limit
        },
        location: {
            type: String,
            default: ""
        },
        // To store user tags/mentions within the post
        tags: [
            {
                type: String,
                trim: true
            }
        ],
        // Likes: Stores User IDs to quickly check if a user liked a post
        likes: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        // Count of views or video plays
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        // Comments count (Optional: You can also use a separate Comment model)
        commentCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Plugin for advanced pagination (for infinite scroll feeds)
postSchema.plugin(mongooseAggregatePaginate);

// Indexing for faster searching of captions and tags
// This allows full-text search across both the caption and the words inside the tags array
postSchema.index({ caption: "text", tags: "text" });

export const Post = mongoose.model("Post", postSchema);