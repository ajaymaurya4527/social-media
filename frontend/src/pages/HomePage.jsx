import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  MoreHorizontal,
  Loader2,
  Send,
  UserPlus,
  UserCheck,
  X
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

import { ShopContext } from "../context/ShopContext"; 

const HomeFeed = () => {
  const { backendUrl } = useContext(ShopContext);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [commentInputs, setCommentInputs] = useState({});
  const [activeMediaIndex, setActiveMediaIndex] = useState({});
  const [videoMuted, setVideoMuted] = useState(true);

  // --- Modal State Tracking Framework ---
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);
  const [modalComments, setModalComments] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalCommentInput, setModalCommentInput] = useState("");

  const token = localStorage.getItem("accessToken");
  const API_BASE = backendUrl;

  // 1. Fetch Feed & Logged-In User Profile Data
  useEffect(() => {
    const fetchFeedAndUser = async () => {
      try {
        setLoading(true);
        
        const [feedRes, userRes] = await Promise.all([
          axios.get(`${API_BASE}/post/feed`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }),
          axios.get(`${API_BASE}/users/current-user`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          })
        ]);

        if (feedRes.data.success) {
          setPosts(feedRes.data.data);
        }
        
        if (userRes.data.success) {
          const payload = userRes.data.data;
          setCurrentUser(payload?.user ? payload.user : payload);
        }
      } catch (err) {
        console.error("Error pulling home feed dashboard data:", err);
        setError(err.response?.data?.message || "Failed to load feed. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (backendUrl && token) {
      fetchFeedAndUser();
    }
  }, [backendUrl, token, API_BASE]);

  // 2. Handle Follow / Unfollow Actions
  const handleFollowToggle = async (postOwnerId, originalFollowState) => {
    try {
      const response = await axios.post(`${API_BASE}/post/follow/${postOwnerId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data.success) {
        toast.success(originalFollowState ? "Unfollowed user" : "Following user");
        
        if (!originalFollowState) {
          try {
            await axios.post(`${API_BASE}/notifications/create`, {
              targetUserId: postOwnerId,
              type: "follow",
              message: "started following you."
            }, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            });
          } catch (notifErr) {
            console.error("Failed to send follow notification:", notifErr);
          }
        }

        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.owner?._id === postOwnerId) {
              return { ...post, isOwnerFollowed: !originalFollowState };
            }
            return post;
          })
        );
      }
    } catch (err) {
      toast.error("Action failed");
      console.error("Follow framework interaction failure:", err);
    }
  };

  // 3. Handle Like Interaction
  const handleLikeToggle = async (postId) => {
    try {
      const response = await axios.post(`${API_BASE}/post/like/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data.success) {
        const { isLiked } = response.data.data;
        const myId = currentUser?._id || "current_user_placeholder_id";
        const targetPost = posts.find(p => p._id === postId);

        if (isLiked && targetPost && targetPost.owner?._id !== currentUser?._id) {
          try {
            await axios.post(`${API_BASE}/notifications/create`, {
              targetUserId: targetPost.owner._id,
              type: "like",
              message: "liked your post."
            }, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            });
          } catch (notifErr) {
            console.error("Failed to send like notification:", notifErr);
          }
        }

        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post._id === postId) {
              return {
                ...post,
                likes: isLiked ? [...(post.likes || []), myId] : (post.likes || []).filter(id => id !== myId),
                isLikedExplicitly: isLiked 
              };
            }
            return post;
          })
        );
      }
    } catch (err) {
      toast.error("Like action failed");
      console.error("Like toggle exception intercept:", err);
    }
  };

  // 4. Handle Save Post Trigger
  const handleSaveToggle = async (postId) => {
    try {
      const response = await axios.post(`${API_BASE}/post/save/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data.success) {
        const msg = response.data.message;
        const isNowSaved = msg.includes("Saved");
        toast.success(isNowSaved ? "Saved to collection" : "Removed from collection");

        setPosts((prevPosts) =>
          prevPosts.map((post) => post._id === postId ? { ...post, isSavedByMe: isNowSaved } : post)
        );
      }
    } catch (err) {
      toast.error("Save action failed");
      console.error("Error calling save collection endpoint:", err);
    }
  };

  // 5. Open Comments Overlay
  const openCommentsModal = async (post) => {
    setSelectedPostForComments(post);
    setModalComments([]);
    setModalLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/post/getPostComment/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      if (response.data.success) {
        setModalComments(response.data.data);
      }
    } catch (err) {
      console.error("Failed loading comments:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // 6. Handle Comment Submission
  const handleCommentSubmit = async (e, postId, fallbackText = null) => {
    e.preventDefault();
    const commentText = fallbackText ? fallbackText.trim() : commentInputs[postId]?.trim();
    if (!commentText) return;

    try {
      const response = await axios.post(`${API_BASE}/post/comment/${postId}`, {
        content: commentText
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data.success) {
        toast.success("Comment posted");
        const createdComment = response.data.data;
        const targetPost = posts.find(p => p._id === postId);

        if (targetPost && targetPost.owner?._id !== currentUser?._id) {
          try {
            await axios.post(`${API_BASE}/notifications/create`, {
              targetUserId: targetPost.owner._id,
              type: "comment",
              message: "commented on your post."
            }, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            });
          } catch (notifErr) {
            console.error("Failed to send comment notification:", notifErr);
          }
        }

        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post._id === postId) {
              return { ...post, commentCount: (post.commentCount || 0) + 1 };
            }
            return post;
          })
        );

        if (selectedPostForComments && selectedPostForComments._id === postId) {
          setModalComments((prev) => [...prev, createdComment]);
        }

        setModalCommentInput("");
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {
      toast.error("Failed to post comment");
      console.error("Error committing comment:", err);
    }
  };

  // 7. Carousel Slider Index Shifter
  const shiftCarouselIndex = (postId, direction, maxFiles) => {
    const currentIndex = activeMediaIndex[postId] || 0;
    let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < maxFiles) {
      setActiveMediaIndex((prev) => ({ ...prev, [postId]: nextIndex }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-50/50">
        <Loader2 className="animate-spin text-neutral-800 mb-2" size={28}/>
        <p className="text-xs font-semibold text-neutral-500 tracking-wide uppercase">Updating Feed</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-neutral-900 font-medium mb-3">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-5 py-2.5 bg-neutral-900 text-white text-xs font-semibold tracking-wide rounded-xl hover:bg-neutral-800 transition-all shadow-sm active:scale-98"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50/30 text-neutral-900 flex flex-col items-center overflow-y-auto pb-24">
      <Toaster position="top-center" />
      
      <header className="w-full max-w-[620px] h-16 border-b border-neutral-100 flex items-center justify-between px-4 sm:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-base font-bold tracking-tight text-neutral-900">Home Feed</h1>
          <p className="text-[10px] text-neutral-400 font-medium tracking-wide uppercase -mt-0.5">Latest Activity</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200/60 p-0.5 overflow-hidden transition-transform hover:scale-105 cursor-pointer">
          <img 
            src={currentUser?.avatar || "https://placehold.co/100x100?text=User"} 
            alt="Profile" 
            className="w-full h-full rounded-full object-cover" 
          />
        </div>
      </header>

      <main className="w-full max-w-[490px] px-3 md:px-0 mt-6 space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-20 border border-neutral-200/60 bg-white rounded-2xl p-8 shadow-sm">
            <p className="text-neutral-500 font-medium text-sm">Your feed space is currently empty.</p>
            <p className="text-xs text-neutral-400 mt-1">New community updates will populate here natively.</p>
          </div>
        ) : (
          posts.map((post) => {
            const currentMediaIndex = activeMediaIndex[post._id] || 0;
            const totalMediaFiles = post.mediaFiles?.length || 0;
            const activeMediaNode = post.mediaFiles?.[currentMediaIndex];
            
            const myId = currentUser?._id || "current_user_placeholder_id";
            const isLikedByMe = post.isLikedExplicitly || post.likes?.includes(myId);
            const isMyOwnPost = currentUser && post.owner?._id === currentUser._id;
            const isOwnerFollowed = post.isOwnerFollowed || false;

            return (
              <article key={post._id} className="w-full bg-white border border-neutral-200/70 rounded-2xl overflow-hidden shadow-xs transition-shadow hover:shadow-sm">
                
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-200/60 overflow-hidden shrink-0">
                      <img 
                        src={post.owner?.avatar || "https://placehold.co/100x100?text=Avatar"} 
                        alt={post.owner?.username || "owner"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-neutral-900 hover:text-neutral-600 transition-colors cursor-pointer truncate">
                          {post.owner?.username || "anonymous_user"}
                        </span>
                        
                        {!isMyOwnPost && post.owner && (
                          <>
                            <span className="text-neutral-300 text-xs select-none">•</span>
                            <button
                              onClick={() => handleFollowToggle(post.owner._id, isOwnerFollowed)}
                              className={`text-xs font-bold transition-all flex items-center gap-1 ${
                                isOwnerFollowed 
                                  ? "text-neutral-400 hover:text-neutral-600" 
                                  : "text-neutral-900 hover:text-neutral-700"
                              }`}
                            >
                              {isOwnerFollowed ? (
                                <>
                                  <UserCheck size={12} className="opacity-80"/>
                                  <span>Following</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus size={12}/>
                                  <span className="underline underline-offset-2">Follow</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                      {post.location && (
                        <span className="text-[11px] text-neutral-400 flex items-center gap-0.5 truncate mt-0.5 font-medium">
                          <MapPin size={10} className="text-neutral-300"/> {post.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="text-neutral-400 hover:text-neutral-900 transition-colors ml-2 shrink-0 p-1 rounded-lg hover:bg-neutral-50">
                    <MoreHorizontal size={18}/>
                  </button>
                </div>

                <div className="relative w-full aspect-square bg-neutral-50 flex items-center justify-center overflow-hidden select-none group border-y border-neutral-100">
                  {totalMediaFiles > 0 && activeMediaNode && (
                    post.mediaType === "video" ? (
                      <div className="w-full h-full relative bg-neutral-950">
                        <video 
                          src={activeMediaNode.url}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted={videoMuted}
                          playsInline
                        />
                        <button 
                          onClick={() => setVideoMuted(!videoMuted)}
                          className="absolute bottom-3 right-3 p-2 bg-neutral-900/70 text-white rounded-full hover:bg-neutral-900 backdrop-blur-md transition-all z-20"
                        >
                          {videoMuted ? <VolumeX size={13}/> : <Volume2 size={13}/>}
                        </button>
                      </div>
                    ) : (
                      <img 
                        src={activeMediaNode.url} 
                        alt="Feed display grid" 
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )
                  )}

                  {totalMediaFiles > 1 && (
                    <>
                      {currentMediaIndex > 0 && (
                        <button 
                          onClick={() => shiftCarouselIndex(post._id, "prev", totalMediaFiles)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 text-neutral-800 rounded-xl hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100 backdrop-blur-xs z-20 active:scale-95"
                        >
                          <ChevronLeft size={14} strokeWidth={3}/>
                        </button>
                      )}
                      {currentMediaIndex < totalMediaFiles - 1 && (
                        <button 
                          onClick={() => shiftCarouselIndex(post._id, "next", totalMediaFiles)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 text-neutral-800 rounded-xl hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100 backdrop-blur-xs z-20 active:scale-95"
                        >
                          <ChevronRight size={14} strokeWidth={3}/>
                        </button>
                      )}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/20 px-2 py-1 rounded-full backdrop-blur-xs">
                        {post.mediaFiles.map((_, dotIdx) => (
                          <div 
                            key={dotIdx} 
                            className={`w-1 h-1 rounded-full transition-all duration-200 ${dotIdx === currentMediaIndex ? "bg-white scale-125 w-2" : "bg-white/50"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-3.5 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-neutral-800">
                    <button 
                      onClick={() => handleLikeToggle(post._id)}
                      className={`hover:scale-105 active:scale-90 transition-all ${isLikedByMe ? "text-red-500 fill-red-500" : "hover:text-neutral-500"}`}
                    >
                      <Heart size={22} strokeWidth={isLikedByMe ? 0 : 2}/>
                    </button>
                    
                    <button 
                      onClick={() => openCommentsModal(post)}
                      className="hover:text-neutral-500 hover:scale-105 active:scale-90 transition-all"
                    >
                      <MessageCircle size={22}/>
                    </button>
                  </div>
                  <button 
                    onClick={() => handleSaveToggle(post._id)}
                    className={`hover:scale-105 active:scale-90 transition-all ${post.isSavedByMe ? "text-neutral-900 fill-neutral-900" : "text-neutral-800 hover:text-neutral-500"}`}
                  >
                    <Bookmark size={22} strokeWidth={post.isSavedByMe ? 0 : 2}/>
                  </button>
                </div>

                <div className="px-3.5 pb-3.5 space-y-2 text-sm">
                  <p className="font-bold text-neutral-900 tracking-tight text-[13px]">
                    {(post.likes?.length || 0).toLocaleString()} likes
                  </p>
                  
                  {post.caption && (
                    <p className="text-neutral-700 text-[13px] leading-relaxed break-words">
                      <span className="font-semibold text-neutral-900 mr-2 cursor-pointer hover:underline">
                        {post.owner?.username || "user"}
                      </span>
                      {post.caption}
                    </p>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {post.tags.map((tag, idx) => (
                        <span key={idx} className="text-[12px] text-neutral-500 font-medium cursor-pointer hover:text-neutral-900 transition-colors">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.commentCount > 0 && (
                    <button 
                      onClick={() => openCommentsModal(post)}
                      className="text-neutral-400 text-xs font-medium block pt-1 hover:underline underline-offset-2"
                    >
                      View all {post.commentCount} comments
                    </button>
                  )}
                </div>

                <form 
                  onSubmit={(e) => handleCommentSubmit(e, post._id)} 
                  className="p-3 border-t border-neutral-100 flex items-center justify-between gap-3 bg-neutral-50/40"
                >
                  <input
                    type="text"
                    placeholder="Add an update expression..."
                    value={commentInputs[post._id] || ""}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })}
                    className="flex-1 bg-transparent border-none outline-none text-[13px] text-neutral-900 placeholder-neutral-400"
                  />
                  <button
                    type="submit"
                    disabled={!commentInputs[post._id]?.trim()}
                    className="text-neutral-900 hover:text-neutral-600 p-1.5 rounded-lg disabled:opacity-20 transition-all active:scale-95 shrink-0"
                  >
                    <Send size={15} strokeWidth={2.5}/>
                  </button>
                </form>

              </article>
            );
          })
        )}
      </main>

      {selectedPostForComments && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-end justify-center z-50 animate-fade-in">
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedPostForComments(null)}
          />

          <div className="relative bg-white w-full max-w-[490px] h-[75vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-10 transition-transform duration-300 ease-out transform translate-y-0">
            
            <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto my-3 shrink-0" />

            <div className="px-4 pb-3 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-neutral-900">Comments</h3>
                <p className="text-[11px] text-neutral-400 font-medium">Discussion Thread</p>
              </div>
              <button 
                onClick={() => setSelectedPostForComments(null)}
                className="p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-neutral-900 transition-all"
              >
                <X size={16}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {modalLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-neutral-400 mb-2" size={22}/>
                  <span className="text-xs text-neutral-400 font-medium">Loading conversation...</span>
                </div>
              ) : modalComments.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center py-20 text-center">
                  <MessageCircle size={32} className="text-neutral-200 mb-2"/>
                  <p className="text-xs font-semibold text-neutral-500">No comments yet</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Start the conversation below.</p>
                </div>
              ) : (
                modalComments.map((comment) => (
                  <div key={comment._id} className="flex items-start gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-neutral-50 border border-neutral-200/40 overflow-hidden shrink-0 mt-0.5">
                      <img 
                        src={comment.owner?.avatar || "https://placehold.co/100x100?text=Avatar"} 
                        alt="Comment user avatar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 bg-neutral-50/60 rounded-2xl px-3.5 py-2.5 border border-neutral-100/50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-neutral-900 text-xs">
                          {comment.owner?.username || "anonymous_user"}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ""}
                        </span>
                      </div>
                      <p className="text-neutral-700 text-[13px] mt-1 leading-relaxed break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form 
              onSubmit={(e) => handleCommentSubmit(e, selectedPostForComments._id, modalCommentInput)}
              className="p-4 border-t border-neutral-100 bg-white flex items-center justify-between gap-3 safe-bottom"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200/60 shrink-0 hidden sm:block">
                <img 
                  src={currentUser?.avatar || "https://placehold.co/100x100?text=User"} 
                  alt="Current profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                type="text"
                placeholder="Share your thoughts..."
                value={modalCommentInput}
                onChange={(e) => setModalCommentInput(e.target.value)}
                className="flex-1 bg-neutral-50 border border-neutral-200/50 outline-none rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:bg-transparent focus:border-neutral-900 transition-all"
              />
              <button
                type="submit"
                disabled={!modalCommentInput.trim()}
                className="bg-neutral-900 text-white p-2.5 rounded-xl disabled:opacity-30 disabled:hover:bg-neutral-900 hover:bg-neutral-800 transition-all active:scale-95 shrink-0 shadow-xs"
              >
                <Send size={14}/>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default HomeFeed;