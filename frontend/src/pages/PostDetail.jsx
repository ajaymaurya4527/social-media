
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";

import axios from "../utils/axiosInstance";

import { ShopContext } from "../context/ShopContext";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

const PostDetail = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const { backendUrl } = useContext(ShopContext);

  const [post, setPost] = useState(null);

  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");

  const [isLiked, setIsLiked] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  // FETCH POST
  const fetchPost = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await axios.get(
        `${backendUrl}/post/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setPost(response.data.data);
      }

    } catch (error) {
      //console.log(error);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  // FETCH COMMENTS
  const fetchComments = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const res = await axios.get(
        `${backendUrl}/post/getPostComment/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        setComments(res.data.data);
      }

    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (backendUrl && id) {
      fetchPost();
      fetchComments();
    }
  }, [backendUrl, id]);

  // LIKE
  const handleLike = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await axios.post(
        `${backendUrl}/post/like/${post._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const liked = response.data.data.isLiked;

        setIsLiked(liked);

        setPost((prev) => ({
          ...prev,
          likes: liked
            ? [...prev.likes, "temp"]
            : prev.likes.slice(0, -1),
        }));
      }

    } catch (error) {
      toast.error("Like failed");
    }
  };

  // SAVE
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await axios.post(
        `${backendUrl}/post/save/${post._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setIsSaved(!isSaved);

        toast.success(
          isSaved
            ? "Removed from saved"
            : "Saved successfully"
        );
      }

    } catch (error) {
      toast.error("Save failed");
    }
  };

  // COMMENT
  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      const token = localStorage.getItem("accessToken");

      const res = await axios.post(
        `${backendUrl}/post/comment/${id}`,
        {
          content: commentText,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        setComments((prev) => [...prev, res.data.data]);

        setCommentText("");

        setPost((prev) => ({
          ...prev,
          commentCount: (prev.commentCount || 0) + 1,
        }));
      }

    } catch (error) {
      toast.error("Comment failed");
    }
  };

  if (loading || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 md:p-6">

      <div className="bg-white w-full max-w-6xl h-[95vh] rounded-2xl overflow-hidden flex flex-col md:flex-row">

        {/* LEFT MEDIA */}
        <div className="flex-1 bg-black flex items-center justify-center relative">

          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-full text-white"
          >
            <X size={20} />
          </button>

          {post.mediaType === "video" ? (
            <video
              src={post.mediaFiles?.[0]?.url}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={post.mediaFiles?.[0]?.url}
              alt="post"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full md:w-[420px] border-l border-zinc-200 flex flex-col bg-white">

          {/* HEADER */}
          <div className="p-4 border-b flex items-center gap-3">

            <img
              src={post.owner?.avatar}
              className="w-10 h-10 rounded-full object-cover"
              alt=""
            />

            <div>
              <p className="font-bold text-sm">
                {post.owner?.username}
              </p>

              <p className="text-xs text-zinc-400">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* COMMENTS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* CAPTION */}
            <div className="flex gap-3">

              <img
                src={post.owner?.avatar}
                className="w-8 h-8 rounded-full"
                alt=""
              />

              <div>
                <p className="text-sm leading-relaxed">
                  <span className="font-bold mr-2">
                    {post.owner?.username}
                  </span>

                  {post.caption}
                </p>
              </div>
            </div>

            {/* COMMENTS */}
            {comments.map((comment) => (
              <div
                key={comment._id}
                className="flex gap-3"
              >
                <img
                  src={comment.owner?.avatar}
                  className="w-8 h-8 rounded-full object-cover"
                  alt=""
                />

                <div>
                  <p className="text-sm">
                    <span className="font-bold mr-2">
                      {comment.owner?.username}
                    </span>

                    {comment.content}
                  </p>
                </div>
              </div>
            ))}

          </div>

          {/* ACTIONS */}
          <div className="border-t">

            <div className="p-4 flex items-center gap-4">

              <Heart
                onClick={handleLike}
                className={`cursor-pointer transition ${
                  isLiked
                    ? "fill-red-500 text-red-500"
                    : "hover:text-red-500"
                }`}
              />

              <MessageCircle className="cursor-pointer" />

              <Send className="cursor-pointer" />

              <Bookmark
                onClick={handleSave}
                className={`ml-auto cursor-pointer ${
                  isSaved
                    ? "fill-black"
                    : ""
                }`}
              />
            </div>

            <div className="px-4 pb-3">
              <p className="font-semibold text-sm">
                {post.likes?.length || 0} likes
              </p>

              <p className="text-xs text-zinc-400 mt-1">
                {post.commentCount || 0} comments
              </p>
            </div>

            {/* COMMENT INPUT */}
            <div className="border-t p-3 flex gap-2">

              <input
                type="text"
                value={commentText}
                onChange={(e) =>
                  setCommentText(e.target.value)
                }
                placeholder="Add a comment..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={handleAddComment}
                className="text-indigo-600 font-semibold"
              >
                Post
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default PostDetail;

