import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
} from "react";

import {
  User as UserIcon,
  Grid,
  Bookmark,
  CheckCircle,
  ArrowLeft,
  Video,
} from "lucide-react";

import { useParams, useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import axios from "../utils/axiosInstance"


// 1. Import toast configuration
import toast from "react-hot-toast";

const UserProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(ShopContext);

  // State
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const token = localStorage.getItem("accessToken");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // Fetch Profile Data
  useEffect(() => {
    if (!backendUrl || !username || !token) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchUserProfileData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${backendUrl}/users/c/${username}`,
          {
            headers,
            withCredentials: true,
            signal: controller.signal,
          }
        );

        if (response.data.success && isMounted) {
          const userData = response.data.data.user;
          setProfile(userData);
          setPosts(response.data.data.posts || []);
          setIsFollowing(userData.isFollowing || false);
        }
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error("Error loading user profile:", err);
          
          // 2. Alert on profile query breakdown
          toast.error("Failed to load user profile configuration.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserProfileData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [username, backendUrl, headers, token]);

  // Toggle Follow Action & Trigger Notification
  const handleFollowToggle = async () => {
    if (!token || !backendUrl || followLoading) return;

    const previousIsFollowing = isFollowing;
    const previousFollowersCount = profile?.followersCount || 0;

    // Optimistic UI Update
    setIsFollowing(!previousIsFollowing);
    setProfile((prev) => ({
      ...prev,
      followersCount: previousIsFollowing
        ? previousFollowersCount - 1
        : previousFollowersCount + 1,
    }));

    try {
      setFollowLoading(true);
      const response = await axios.post(
        `${backendUrl}/subscription/toggle/${username}`,
        {},
        { headers }
      );

      if (response.data.success) {
        const currentFollowState = response.data.isFollowing;
        setIsFollowing(currentFollowState);

        // 3. Status notice context updates on success
        if (currentFollowState) {
          toast.success(`Following @${username}`);
        } else {
          toast.success(`Unfollowed @${username}`);
        }

        // 🔔 यदि यूज़र ने अभी फॉलो किया है (Unfollow नहीं किया), तो नोटिफिकेशन भेजें
        if (currentFollowState) {
          await axios.post(
            `${backendUrl}/notifications/create`,
            {
              targetUserId: profile._id, // जिस यूज़र को फॉलो किया गया है
              type: "follow",
              message: "started following you.",
            },
            { headers }
          ).catch(err => {
            console.error("Notification trigger failed:", err);
          });
        }
      }
    } catch (err) {
      console.error("Failed handling connection shift action:", err);
      
      // 4. Alert user on failure fallback
      toast.error(err.response?.data?.message || "Action failed. Restoring data state.");
      
      setIsFollowing(previousIsFollowing);
      setProfile((prev) => ({
        ...prev,
        followersCount: previousFollowersCount,
      }));
    } finally {
      setFollowLoading(false);
    }
  };

  // Navigates to the chat page
  const handleIssueChat = () => {
    if (!profile) return;
    navigate("/messages", {
      state: {
        chatTargetUser: {
          _id: profile._id,
          username: profile.username,
          fullName: profile.fullName,
          avatar: profile.avatar,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white text-center py-20 px-4">
        <p className="text-slate-500 font-medium">User not found or profile is private.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm font-bold text-indigo-600">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20 font-sans antialiased max-w-md mx-auto border-x border-slate-50">
      {/* HEADER */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-40 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={22} className="text-slate-800" />
        </button>
        <div className="flex items-center gap-1.5">
          <h1 className="font-bold text-base tracking-tight text-slate-900">{profile.username}</h1>
          {profile.isVerified && <CheckCircle size={15} className="text-blue-500 fill-blue-500" />}
        </div>
      </div>

      {/* PROFILE INFO */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.target.src = "https://placehold.co/200x200?text=User";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                <UserIcon size={32} />
              </div>
            )}
          </div>

          <div className="flex justify-around items-center flex-1 text-center">
            <div>
              <div className="font-bold text-base text-slate-900">{posts.length}</div>
              <div className="text-xs text-slate-500 font-normal">Posts</div>
            </div>
            <div>
              <div className="font-bold text-base text-slate-900">{profile.followersCount || 0}</div>
              <div className="text-xs text-slate-500 font-normal">Followers</div>
            </div>
            <div>
              <div className="font-bold text-base text-slate-900">{profile.followingCount || 0}</div>
              <div className="text-xs text-slate-500 font-normal">Following</div>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 mb-5 px-1">
          <h2 className="text-sm font-bold text-slate-900">{profile.fullName}</h2>
          {profile.bio ? (
            <p className="text-sm text-slate-700 font-normal whitespace-pre-wrap leading-snug">{profile.bio}</p>
          ) : (
            <p className="text-xs text-slate-400 italic font-normal">No bio text provided yet.</p>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2 px-1">
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all active:scale-[0.98] ${
              isFollowing
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>

          <button
            onClick={handleIssueChat}
            className="flex-1 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 text-sm font-semibold py-2 rounded-lg transition-all"
          >
            Message
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-t border-slate-100 mt-2">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 flex justify-center py-3.5 border-b-2 transition-colors ${
            activeTab === "posts" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
          }`}
        >
          <Grid size={20} strokeWidth={activeTab === "posts" ? 2.5 : 2} />
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 flex justify-center py-3.5 border-b-2 transition-colors ${
            activeTab === "saved" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
          }`}
        >
          <Bookmark size={20} strokeWidth={activeTab === "saved" ? 2.5 : 2} />
        </button>
      </div>

      {/* POSTS GRID */}
      {activeTab === "posts" ? (
        posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">No posts shared yet</div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 bg-white p-0.5">
            {posts.map((post) => (
              <div
                key={post._id}
                onClick={() => navigate(`/post/${post._id}`)}
                className="aspect-square bg-slate-100 relative group overflow-hidden cursor-pointer"
              >
                <img
                  src={post.image || post.thumbnail || "https://placehold.co/400x400?text=No+Media"}
                  alt="User shared content"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "https://placehold.co/400x400?text=No+Media";
                  }}
                />
                {post.mediaType === "video" && (
                  <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-xs p-1 rounded-sm text-white">
                    <Video size={14} className="fill-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-20 text-slate-400 text-sm">Saved posts collection is private</div>
      )}
    </div>
  );
};

export default UserProfilePage;