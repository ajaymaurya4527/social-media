import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Volume2, 
  VolumeX, 
  Send, 
  X, 
  UserPlus, 
  UserCheck,
  Loader2,
  MapPin
} from "lucide-react";

import { ShopContext } from "../context/ShopContext"; 

const ReelsPage = () => {
  const { backendUrl } = useContext(ShopContext);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [muted, setMuted] = useState(true);
  
  // लॉग्ड-इन यूज़र की वास्तविक जानकारी रखने के लिए स्टेट
  const [currentUser, setCurrentUser] = useState(null); 
  
  // Comments Side Drawer panel state
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [drawerComments, setDrawerComments] = useState([]); 
  const [drawerLoading, setDrawerLoading] = useState(false);  

  const token = localStorage.getItem("accessToken");
  const API_BASE = backendUrl;

  // 1. Fetch Home Feed & करंट यूज़र की रियल प्रोफाइल जानकारी लाएँ
  useEffect(() => {
    let isMounted = true;
    const cancelTokenSource = axios.CancelToken.source();

    const fetchVideosAndUser = async () => {
      if (!API_BASE || !token) return;
      try {
        setLoading(true);
        
        const [feedRes, userRes] = await Promise.all([
          axios.get(`${API_BASE}/post/feed`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
            cancelToken: cancelTokenSource.token
          }),
          axios.get(`${API_BASE}/users/current-user`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
            cancelToken: cancelTokenSource.token
          })
        ]);

        if (isMounted) {
          if (userRes.data.success) {
            const payload = userRes.data.data;
            setCurrentUser(payload?.user ? payload.user : payload);
          }

          if (feedRes.data.success) {
            const videoPosts = feedRes.data.data.filter(
              (post) => post.mediaType === "video" && post.mediaFiles?.length > 0
            );
            setReels(videoPosts);
          }
        }
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Error connecting with media endpoints:", err);
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load reels. Please try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVideosAndUser();

    return () => {
      isMounted = false;
      cancelTokenSource.cancel("Component unmounted, active requests torn down.");
    };
  }, [API_BASE, token]);

  // --- Dynamic Live Fetching Hook for Drawer Sync ---
  useEffect(() => {
    let isMounted = true;
    if (!activeCommentsPostId) return;
    
    const fetchDrawerComments = async () => {
      try {
        setDrawerLoading(true);
        setDrawerComments([]);
        
        const response = await axios.get(`${API_BASE}/post/getPostComment/${activeCommentsPostId}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });

        if (isMounted && response.data.success) {
          setDrawerComments(response.data.data);
        }
      } catch (err) {
        console.error("Failed loading comments for target reel drawer context:", err);
      } finally {
        if (isMounted) setDrawerLoading(false);
      }
    };

    fetchDrawerComments();

    return () => {
      isMounted = false;
    };
  }, [activeCommentsPostId, API_BASE, token]);

  // 2. Handle Like Counter State Synchronization (WITH NOTIFICATION TRIGGER)
  const handleLikeToggle = async (postId) => {
    try {
      const response = await axios.post(`${API_BASE}/post/like/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const { isLiked } = response.data.data;
        const myId = currentUser?._id || "current_user_placeholder";

        // नोटिफिकेशन के लिए टारगेट रील का पता लगाना
        const targetReel = reels.find(r => r._id === postId);

        // TRIGGER NOTIFICATION: अगर लाइक किया गया है और रील खुद की नहीं है
        if (isLiked && targetReel && targetReel.owner?._id !== currentUser?._id) {
          try {
            await axios.post(`${API_BASE}/notifications/create`, {
              targetUserId: targetReel.owner._id,
              type: "like",
              message: "liked your reel post."
            }, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            });
          } catch (notifErr) {
            console.error("Failed to send like notification from reels:", notifErr);
          }
        }

        setReels((prev) =>
          prev.map((reel) => {
            if (reel._id === postId) {
              const updatedLikes = isLiked
                ? [...(reel.likes || []), myId]
                : (reel.likes || []).filter((id) => id !== myId);
              return { ...reel, likes: updatedLikes, isLikedExplicitly: isLiked };
            }
            return reel;
          })
        );
      }
    } catch (err) {
      console.error("Error processing user like stream:", err);
    }
  };

  // 3. Handle Save Pipeline Trigger
  const handleSaveToggle = async (postId) => {
    try {
      const response = await axios.post(`${API_BASE}/post/save/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const isSavedNow = response.data.message.includes("Saved");
        setReels((prev) =>
          prev.map((reel) =>
            reel._id === postId ? { ...reel, isSavedByMe: isSavedNow } : reel
          )
        );
      }
    } catch (err) {
      console.error("Error setting save flags:", err);
    }
  };

  // 4. Handle Follow Trigger Interaction (WITH NOTIFICATION TRIGGER)
  const handleFollowToggle = async (userId, originalFollowState) => {
    try {
      const response = await axios.post(`${API_BASE}/post/follow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // TRIGGER NOTIFICATION: अगर यूजर ने अभी प्रोफाइल को फॉलो करना शुरू किया है
        if (!originalFollowState) {
          try {
            await axios.post(`${API_BASE}/notifications/create`, {
              targetUserId: userId,
              type: "follow",
              message: "started following you."
            }, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            });
          } catch (notifErr) {
            console.error("Failed to send follow notification from reels:", notifErr);
          }
        }

        setReels((prev) =>
          prev.map((reel) => {
            if (reel.owner?._id === userId) {
              return { ...reel, isOwnerFollowed: !originalFollowState };
            }
            return reel;
          })
        );
      }
    } catch (err) {
      console.error("Follow request pipeline dropped:", err);
    }
  };

  // 5. Submit Comments Trigger (WITH NOTIFICATION TRIGGER)
  const handleCommentSubmit = async (postId, textToSubmit) => {
    if (!textToSubmit.trim() || !postId) return;

    try {
      const response = await axios.post(`${API_BASE}/post/comment/${postId}`, {
        content: textToSubmit.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data.success) {
        let createdComment = response.data.data;
        const targetReel = reels.find(r => r._id === postId);

        // TRIGGER NOTIFICATION: अगर कमेंट करने वाला व्यक्ति रील का ओनर नहीं है
        if (targetReel && targetReel.owner?._id !== currentUser?._id) {
          try {
            await axios.post(`${API_BASE}/notifications/create`, {
              targetUserId: targetReel.owner._id,
              type: "comment",
              message: "commented on your reel post."
            }, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            });
          } catch (notifErr) {
            console.error("Failed to send comment notification from reels:", notifErr);
          }
        }

        if (!createdComment.owner || typeof createdComment.owner === "string") {
          createdComment.owner = {
            _id: currentUser?._id,
            username: currentUser?.username || "You",
            avatar: currentUser?.avatar
          };
        }

        // यदि वर्तमान में यही पोस्ट ड्रावर में खुली है तो ड्रावर स्टेट भी अपडेट करें
        if (activeCommentsPostId === postId) {
          setDrawerComments((prev) => [...prev, createdComment]);
        }

        // Reels की मुख्य फीड स्टेट में कमेंट काउंट +1 करें
        setReels((prev) =>
          prev.map((reel) => {
            if (reel._id === postId) {
              return { 
                ...reel, 
                commentCount: (reel.commentCount || 0) + 1 
              };
            }
            return reel;
          })
        );
      }
    } catch (err) {
      console.error("Error committing comment:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-white mb-2" size={32} />
        <p className="text-sm font-medium text-neutral-400">Loading Reels Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center px-4 text-center">
        <p className="text-red-400 font-medium mb-3">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-neutral-800 text-white text-sm font-medium rounded-md hover:bg-neutral-700 transition"
        >
          Reload Interface
        </button>
      </div>
    );
  }

  const myId = currentUser?._id || "current_user_placeholder";

  return (
    <div className="h-screen w-full bg-black text-white flex justify-center items-center overflow-hidden relative">
      
      {/* Scroll Snap Feed Viewport Layout Container */}
      <div className="h-full w-full max-w-[420px] overflow-y-scroll snap-y snap-mandatory scrollbar-none relative bg-neutral-950 flex flex-col items-center gap-4 py-4">
        {reels.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-neutral-400 font-medium">No video logs discovered in your feed list.</p>
          </div>
        ) : (
          reels.map((reel) => (
            <ReelVideoNode 
              key={reel._id}
              reel={postSchemaDataNormalizer(reel, myId)}
              muted={muted}
              setMuted={setMuted}
              currentUser={currentUser}
              onLike={() => handleLikeToggle(reel._id)}
              onSave={() => handleSaveToggle(reel._id)}
              onFollow={() => handleFollowToggle(reel.owner?._id, reel.isOwnerFollowed)}
              onOpenComments={() => setActiveCommentsPostId(reel._id)}
              onInlineCommentSubmit={(text) => handleCommentSubmit(reel._id, text)}
            />
          ))
        )}
      </div>

      {/* Slide-Up Comments Drawer Overlay Layer */}
      {activeCommentsPostId && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center z-50 transition-opacity duration-300">
          <div 
            className="absolute inset-0" 
            onClick={() => setActiveCommentsPostId(null)}
          />
          <div 
            className="w-full max-w-[420px] bg-neutral-900 border-t border-neutral-800/60 rounded-t-3xl flex flex-col h-[75vh] max-h-[75vh] z-10 shadow-2xl pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Drawer Header */}
            <div className="px-4 pb-3 border-b border-neutral-800/50 flex items-center justify-between shrink-0">
              <div>
                <span className="font-bold text-sm block">Comments</span>
                <p className="text-[10px] text-neutral-500 font-medium tracking-wide">Discussion Thread</p>
              </div>
              <button 
                onClick={() => setActiveCommentsPostId(null)} 
                className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comments Stream Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-center py-10">
                  <Loader2 className="animate-spin text-neutral-400 mb-2" size={20} />
                  <span className="text-xs text-neutral-500">Loading discussion...</span>
                </div>
              ) : drawerComments.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle size={28} className="text-neutral-700 mb-1.5" />
                  <p className="text-xs font-semibold text-neutral-500">No comments yet</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">Start the conversation below.</p>
                </div>
              ) : (
                drawerComments.map((comment) => (
                  <div key={comment._id} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 mt-0.5">
                      <img 
                        src={comment.owner?.avatar || "https://placehold.co/100x100?text=Avatar"} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 bg-neutral-800/40 rounded-2xl px-3.5 py-2.5 border border-neutral-800/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-neutral-200 text-xs">
                          {comment.owner?.username || "anonymous_user"}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : "Just now"}
                        </span>
                      </div>
                      <p className="text-neutral-300 text-[13px] mt-1 leading-relaxed break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Input Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleCommentSubmit(activeCommentsPostId, commentText);
                setCommentText("");
              }}
              className="p-3 border-t border-neutral-800/60 flex items-center gap-3 bg-neutral-900 shrink-0 relative z-20 pb-4"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-700 shrink-0 hidden sm:block">
                <img src={currentUser?.avatar || "https://placehold.co/100x100?text=User"} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <input 
                type="text" 
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-neutral-800 border border-neutral-700/50 outline-none text-sm px-4 py-2.5 rounded-xl text-white placeholder-neutral-500 focus:border-neutral-500 transition-colors"
              />
              <button 
                type="submit" 
                disabled={!commentText.trim()}
                className="p-2.5 bg-white text-black rounded-xl disabled:opacity-40 hover:scale-105 active:scale-95 transition shrink-0 shadow-sm"
              >
                <Send size={14} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   🎬 INDIVIDUAL SNAPPING REEL COMPONENT CHILD NODE WITH INLINE COMMENT UI
   ========================================================================== */
const ReelVideoNode = ({ reel, muted, setMuted, currentUser, onLike, onSave, onFollow, onOpenComments, onInlineCommentSubmit }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [localComment, setLocalComment] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch((err) => console.log("Playback interrupted:", err));
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            if (videoRef.current) videoRef.current.currentTime = 0;
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  const handleVideoPressToggle = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!localComment.trim()) return;
    onInlineCommentSubmit(localComment);
    setLocalComment(""); 
  };

  return (
    <div className="h-[80vh] w-[95%] shrink-0 snap-start snap-always relative flex items-center justify-center bg-black select-none rounded-2xl overflow-hidden shadow-xl border border-neutral-800/40">
      
      <video
        ref={videoRef}
        src={reel.mediaFiles[0]?.url}
        poster={reel.thumbnail || ""}
        onClick={handleVideoPressToggle}
        className="w-full h-full object-cover cursor-pointer"
        loop
        playsInline
        muted={muted}
      />

      <button 
        onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
        className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md text-white rounded-full transition-all z-30"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* RIGHT SIDEBAR ACTION CONTROLS */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-20">
        {/* Like Button */}
        <div className="flex flex-col items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            className={`p-3 rounded-full bg-black/40 backdrop-blur-md hover:scale-110 active:scale-95 transition-transform ${
              reel.isLikedByMe ? "text-red-500 fill-red-500" : "text-white"
            }`}
          >
            <Heart size={24} strokeWidth={reel.isLikedByMe ? 0 : 2} />
          </button>
          <span className="text-xs font-semibold mt-1 tracking-wider drop-shadow-md">
            {reel.likesCount.toLocaleString()}
          </span>
        </div>

        {/* Comment Drawer Activation Button */}
        <div className="flex flex-col items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenComments(); }}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:scale-110 active:scale-95 transition-transform"
          >
            <MessageCircle size={24} />
          </button>
          <span className="text-xs font-semibold mt-1 tracking-wider drop-shadow-md">
            {(reel.commentCount || 0).toLocaleString()}
          </span>
        </div>

        {/* Bookmark Option */}
        <div className="flex flex-col items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            className={`p-3 rounded-full bg-black/40 backdrop-blur-md hover:scale-110 active:scale-95 transition-transform ${
              reel.isSavedByMe ? "text-yellow-400 fill-yellow-400" : "text-white"
            }`}
          >
            <Bookmark size={24} strokeWidth={reel.isSavedByMe ? 0 : 2} />
          </button>
        </div>
      </div>

      {/* BOTTOM INLINE METADATA & NEW DIRECT COMMENT INPUT BOX */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 flex flex-col justify-end z-10 text-white">
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full border border-neutral-700 overflow-hidden bg-neutral-800 shrink-0">
            <img src={reel.owner?.avatar || "https://placehold.co/100x100?text=User"} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold truncate hover:underline cursor-pointer">
              {reel.owner?.username || "creator_node"}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onFollow(); }}
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition ${
                reel.isOwnerFollowed ? "bg-neutral-800/80 text-white" : "bg-white text-black"
              }`}
            >
              {reel.isOwnerFollowed ? <UserCheck size={10} /> : <UserPlus size={10} />}
              <span>{reel.isOwnerFollowed ? "Following" : "Follow"}</span>
            </button>
          </div>
        </div>

        {reel.caption && (
          <p className="text-xs leading-relaxed max-w-[85%] text-neutral-200 font-normal line-clamp-2 mb-1.5 drop-shadow-xs">
            {reel.caption}
          </p>
        )}

        {reel.location && (
          <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium mb-3">
            <MapPin size={10} />
            <span className="truncate">{reel.location}</span>
          </div>
        )}

        {/* 💬 जोड़ी गई इनलाइन कमेंट बॉक्स यूआई (Inline Comment Box UI) */}
        <form 
          onSubmit={handleLocalSubmit}
          onClick={(e) => e.stopPropagation()} 
          className="w-full flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-xl p-1.5 mt-1"
        >
          <input 
            type="text" 
            placeholder="Write a public comment..."
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white outline-none px-2 py-1.5 placeholder-neutral-500"
          />
          <button 
            type="submit"
            disabled={!localComment.trim()}
            className="p-2 bg-white text-black rounded-lg disabled:opacity-30 hover:scale-105 active:scale-95 transition shrink-0"
          >
            <Send size={12} strokeWidth={2.5} />
          </button>
        </form>
      </div>

    </div>
  );
};

/* Helper Utility: Normalizes data properties */
const postSchemaDataNormalizer = (post, currentUserId) => {
  return {
    ...post,
    likesCount: post.likes?.length || 0,
    commentCount: post.commentCount || 0,
    isLikedByMe: post.isLikedExplicitly || post.likes?.includes(currentUserId),
    isSavedByMe: post.isSavedByMe || false,
    isOwnerFollowed: post.isOwnerFollowed || false,
  };
};

export default ReelsPage;