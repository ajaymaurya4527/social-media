import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ShopContext } from "../context/ShopContext";
import { Heart, MessageCircle, Loader2, ArrowLeft, Bookmark } from "lucide-react";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(ShopContext);
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        
        const token = localStorage.getItem("accessToken");

        const response = await axios.get(`${backendUrl}/post/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`, // <-- Pass Auth Header to prevent 401 Unauthorized
          },
          withCredentials: true,
        });

        if (response.data.success) {
          // Fallback chain: Extract data safely regardless of your backend syntax structure
          const postData = response.data.data || response.data.post || response.data;
          setPost(postData);
        } else {
          setErrorMsg("Could not retrieve post records.");
        }
      } catch (error) {
        console.error("Error fetching post detail:", error);
        
        // Capture direct error explanations from your server configuration if they exist
        const backendMessage = error.response?.data?.message;
        const fallbackMessage = error.response?.status === 404 
          ? "Post not found. Please verify the URL endpoint route configuration on your backend."
          : "An error occurred while loading this post.";
          
        setErrorMsg(backendMessage || fallbackMessage);
      } finally {
        setLoading(false);
      }
    };

    if (backendUrl && id) {
      fetchPost();
    }
  }, [backendUrl, id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={36} />
          <p className="text-zinc-500 text-sm font-medium">Loading post details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm max-w-sm w-full text-center space-y-4">
          <div className="text-red-500 bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <h3 className="text-zinc-800 font-bold text-lg">Post Unreachable</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">
            {errorMsg || "The requested post post details could not be found."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* BACK NAVIGATION BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-semibold text-sm mb-4 group transition-colors"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Profile
        </button>

        {/* POST CONTAINER */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          
          {/* POST OWNER/HEADER INFO */}
          <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-200 overflow-hidden">
              <img 
                src={post.owner?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150"} 
                alt="avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-zinc-800 text-sm">
                {post.owner?.username || "vibe_user"}
              </p>
              {post.createdAt && (
                <p className="text-[11px] text-zinc-400">
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </p>
              )}
            </div>
          </div>

          {/* MAIN POST IMAGERY */}
          <div className="bg-zinc-900 flex items-center justify-center max-h-[550px] overflow-hidden aspect-video sm:aspect-auto">
            <img
              src={post.mediaFiles?.[0]?.url || post.thumbnail}
              alt="Post content visualization"
              className="w-full h-full object-contain max-h-[550px]"
            />
          </div>

          {/* ACTIONS AND CAPTIONS */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
              <div className="flex items-center gap-5 text-zinc-700 font-semibold text-sm">
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-red-500 transition-colors">
                  <Heart size={22} /> {post.likes?.length || 0}
                </span>
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                  <MessageCircle size={22} /> {post.commentCount || 0}
                </span>
              </div>
              <button className="text-zinc-400 hover:text-zinc-700 transition-colors">
                <Bookmark size={22} />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-zinc-800 leading-relaxed">
                <span className="font-bold text-zinc-900 mr-2">
                  {post.owner?.username || "vibe_user"}
                </span>
                {post.caption || "No description provided."}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PostDetail;