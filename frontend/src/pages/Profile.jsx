import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
} from "react";

import {
  Grid,
  Bookmark,
  LogOut,
  Edit3,
  Heart,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";

import { ShopContext } from "../context/ShopContext";
import axios from "axios";

const ProfilePage = () => {
  const { backendUrl, setUserAvatar } = useContext(ShopContext);

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);

  const [activeTab, setActiveTab] = useState("posts");
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- EDIT STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    bio: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);

  // --- TOKEN ---
  const token = localStorage.getItem("accessToken");

  // --- MEMOIZED HEADERS ---
  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // --- SAVED POSTS SET (FASTER LOOKUP) ---
  const savedPostIds = useMemo(() => {
    return new Set(savedPosts.map((post) => post._id));
  }, [savedPosts]);

  // ======================================================
  // FETCH INITIAL DATA
  // ======================================================

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // 1. Fetch current user
        const userRes = await axios.get(
          `${backendUrl}/users/current-user`,
          {
            headers,
            withCredentials: true,
          }
        );

        if (!userRes.data.success) return;

        const userData = userRes.data.data;

        if (!isMounted) return;

        setProfileData(userData);

        // Update global avatar
        setUserAvatar(userData.avatar);

        // Set edit form
        setEditForm({
          fullName: userData.fullName || "",
          bio: userData.bio || "",
        });

        // 2. Fetch posts + saved posts together
        const [postsRes, savedRes] = await Promise.all([
          axios.get(`${backendUrl}/post/u/${userData.username}`, {
            headers,
            withCredentials: true,
          }),

          axios.get(`${backendUrl}/post/saved-posts`, {
            headers,
            withCredentials: true,
          }),
        ]);

        if (!isMounted) return;

        if (postsRes.data.success) {
          setUserPosts(postsRes.data.data);
        }

        if (savedRes.data.success) {
          setSavedPosts(savedRes.data.data);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (backendUrl && token) {
      fetchInitialData();
    }

    return () => {
      isMounted = false;
    };
  }, [backendUrl, headers, setUserAvatar, token]);

  // ======================================================
  // UPDATE PROFILE
  // ======================================================

  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);

      const response = await axios.patch(
        `${backendUrl}/users/update-account`,
        {
          fullName: editForm.fullName,
          bio: editForm.bio,
        },
        {
          headers,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setProfileData(response.data.data);

        setIsEditing(false);
      }
    } catch (err) {
      console.error("Update failed:", err);

      alert(
        err.response?.data?.message || "Could not update profile."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // ======================================================
  // TOGGLE SAVE POST
  // ======================================================

  const handleToggleSave = async (postId, e) => {
    e.stopPropagation();

    try {
      const response = await axios.post(
        `${backendUrl}/post/save/${postId}`,
        {},
        {
          headers,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setSavedPosts((prev) => {
          const alreadySaved = prev.some(
            (post) => post._id === postId
          );

          // Remove from saved
          if (alreadySaved) {
            return prev.filter((post) => post._id !== postId);
          }

          // Add to saved
          const allPosts = [...userPosts, ...savedPosts];

          const postToAdd = allPosts.find(
            (post) => post._id === postId
          );

          if (!postToAdd) return prev;

          return [...prev, postToAdd];
        });
      }
    } catch (err) {
      console.error("Error toggling save status:", err);
    }
  };

  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout = async () => {
    try {
      await axios.post(
        `${backendUrl}/users/logout`,
        {},
        {
          headers,
          withCredentials: true,
        }
      );

      localStorage.clear();

      window.location.href = "/login";
    } catch (error) {
      console.error(error);

      alert("Logout failed");
    }
  };

  // ======================================================
  // LOADING UI
  // ======================================================

  if (loading || !profileData) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // ======================================================
  // ACTIVE POSTS
  // ======================================================

  const activePosts =
    activeTab === "posts" ? userPosts : savedPosts;

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20 font-sans antialiased">

      {/* COVER IMAGE */}
      <div className="relative h-48 md:h-64 w-full bg-slate-100">
        <img
          src={
            profileData.coverImage ||
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=2574&auto=format&fit=crop"
          }
          className="w-full h-full object-cover"
          alt="cover"
        />

        <div className="absolute inset-0 bg-black/5" />
      </div>

      <div className="max-w-4xl mx-auto px-6">

        {/* HEADER */}
        <div className="relative flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 mb-12">

          {/* AVATAR */}
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg bg-white">
              <img
                src={profileData.avatar}
                className="w-full h-full object-cover"
                alt="avatar"
              />
            </div>
          </div>

          {/* USER INFO */}
          <div className="flex-1 pb-2">

            <div className="flex flex-wrap items-center gap-4 mb-3">

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {profileData.username}
              </h1>

              <div className="flex items-center gap-2">

                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    <Edit3 size={16} />
                    Edit Profile
                  </button>
                )}

                {/* SETTINGS */}
                <div className="relative">

                  <button
                    onClick={() =>
                      setShowSettings(!showSettings)
                    }
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <MoreHorizontal
                      size={20}
                      className="text-slate-500"
                    />
                  </button>

                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 shadow-xl rounded-xl py-2 z-50">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="flex gap-8 border-t border-slate-100 pt-4">

              <div className="flex gap-1.5 items-baseline">
                <span className="font-bold text-slate-900">
                  {userPosts.length}
                </span>

                <span className="text-sm text-slate-500">
                  posts
                </span>
              </div>

              <div className="flex gap-1.5 items-baseline">
                <span className="font-bold text-slate-900">
                  {profileData.followingCount || 0}
                </span>

                <span className="text-sm text-slate-500">
                  following
                </span>
              </div>

              <div className="flex gap-1.5 items-baseline">
                <span className="font-bold text-slate-900">
                  {profileData.subscribersCount || 0}
                </span>

                <span className="text-sm text-slate-500">
                  followers
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BIO SECTION */}
        <div className="mb-10 max-w-2xl">

          {isEditing ? (
            <div className="space-y-4 p-4 border border-slate-100 rounded-2xl bg-slate-50">

              {/* FULL NAME */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                  Full Name
                </label>

                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full mt-1 p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* BIO */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                  Bio
                </label>

                <textarea
                  rows="3"
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      bio: e.target.value,
                    })
                  }
                  className="w-full mt-1 p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2 pt-2">

                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isUpdating
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  onClick={() => {
                    setIsEditing(false);

                    setEditForm({
                      fullName: profileData.fullName,
                      bio: profileData.bio || "",
                    });
                  }}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-bold text-slate-900 text-lg mb-1">
                {profileData.fullName}
              </p>

              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {profileData.bio ||
                  "No bio yet. Tap 'Edit Profile' to add one."}
              </p>
            </>
          )}
        </div>

        {/* TABS */}
        <div className="flex border-t border-slate-100">

          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 mx-auto py-4 px-8 text-xs font-bold uppercase tracking-widest relative transition-all ${
              activeTab === "posts"
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Grid size={14} />
            Posts

            {activeTab === "posts" && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 mx-auto py-4 px-8 text-xs font-bold uppercase tracking-widest relative transition-all ${
              activeTab === "saved"
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Bookmark size={14} />
            Saved

            {activeTab === "saved" && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        </div>

        {/* POSTS GRID */}
        <div className="grid grid-cols-3 gap-1 md:gap-4 mt-6">

          {activePosts.map((post) => {
            const isPostSaved =
              savedPostIds.has(post._id);

            return (
              <div
                key={post._id}
                className="group relative aspect-square bg-slate-100 overflow-hidden cursor-pointer rounded-sm md:rounded-lg"
              >

                <img
                  src={
                    post.mediaFiles?.[0]?.url ||
                    post.thumbnail
                  }
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  alt="post"
                />

                {/* HOVER OVERLAY */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white font-bold">

                  {/* SAVE BUTTON */}
                  <div className="flex justify-end">

                    <button
                      onClick={(e) =>
                        handleToggleSave(post._id, e)
                      }
                      className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-all"
                    >
                      <Bookmark
                        size={18}
                        className={
                          isPostSaved
                            ? "fill-white text-white"
                            : "text-white"
                        }
                      />
                    </button>
                  </div>

                  {/* STATS */}
                  <div className="flex items-center justify-center gap-6 pb-4">

                    <span className="flex items-center gap-1.5">
                      <Heart
                        size={20}
                        className="fill-white"
                      />
                      {post.likes?.length || 0}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <MessageCircle
                        size={20}
                        className="fill-white"
                      />
                      {post.commentCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* EMPTY STATE */}
        {activePosts.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No {activeTab} available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;