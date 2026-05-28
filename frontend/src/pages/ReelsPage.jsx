import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";

import axios from "../utils/axiosInstance";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Volume2,
  VolumeX,
  Send,
  UserPlus,
  UserCheck,
  Loader2,
  MapPin,
  X,
} from "lucide-react";

import { ShopContext } from "../context/ShopContext";

const ReelsPage = () => {
  const { backendUrl } =
    useContext(ShopContext);

  const [reels, setReels] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [muted, setMuted] =
    useState(true);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [
    activeCommentsPostId,
    setActiveCommentsPostId,
  ] = useState(null);

  const [drawerComments, setDrawerComments] =
    useState([]);

  const [drawerLoading, setDrawerLoading] =
    useState(false);

  const [commentText, setCommentText] =
    useState("");

  const token = localStorage.getItem(
    "accessToken"
  );

  const API_BASE = backendUrl;

  // ======================================================
  // FETCH REELS + USER
  // ======================================================

  useEffect(() => {
    let isMounted = true;

    const controller =
      new AbortController();

    const fetchVideosAndUser =
      async () => {
        if (!API_BASE || !token) return;

        try {
          setLoading(true);

          const [feedRes, userRes] =
            await Promise.all([
              axios.get(
                `${API_BASE}/post/feed`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  withCredentials: true,
                  signal:
                    controller.signal,
                }
              ),

              axios.get(
                `${API_BASE}/users/current-user`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  withCredentials: true,
                  signal:
                    controller.signal,
                }
              ),
            ]);

          if (isMounted) {
            if (
              userRes.data.success
            ) {
              const payload =
                userRes.data.data;

              setCurrentUser(
                payload?.user
                  ? payload.user
                  : payload
              );
            }

            if (
              feedRes.data.success
            ) {
              const videoPosts =
                feedRes.data.data.filter(
                  (post) =>
                    post.mediaType ===
                      "video" &&
                    post.mediaFiles
                      ?.length > 0
                );

              setReels(videoPosts);
            }
          }
        } catch (err) {
          if (
            err.name ===
              "CanceledError" ||
            err.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Error connecting with media endpoints:",
            err
          );

          if (isMounted) {
            setError(
              err.response?.data
                ?.message ||
                "Failed to load reels."
            );
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

    fetchVideosAndUser();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [API_BASE, token]);

  // ======================================================
  // FETCH COMMENTS
  // ======================================================

  useEffect(() => {
    let isMounted = true;

    if (!activeCommentsPostId)
      return;

    const fetchComments =
      async () => {
        try {
          setDrawerLoading(true);

          const response =
            await axios.get(
              `${API_BASE}/post/getPostComment/${activeCommentsPostId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
              }
            );

          if (
            isMounted &&
            response.data.success
          ) {
            setDrawerComments(
              response.data.data
            );
          }
        } catch (err) {
          console.error(
            "Failed loading comments:",
            err
          );
        } finally {
          if (isMounted) {
            setDrawerLoading(false);
          }
        }
      };

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [
    activeCommentsPostId,
    API_BASE,
    token,
  ]);

  // ======================================================
  // LIKE
  // ======================================================

  const handleLikeToggle =
    async (postId) => {
      try {
        const response =
          await axios.post(
            `${API_BASE}/post/like/${postId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (
          response.data.success
        ) {
          const { isLiked } =
            response.data.data;

          const myId =
            currentUser?._id;

          setReels((prev) =>
            prev.map((reel) => {
              if (
                reel._id ===
                postId
              ) {
                const updatedLikes =
                  isLiked
                    ? [
                        ...(reel.likes ||
                          []),
                        myId,
                      ]
                    : (
                        reel.likes ||
                        []
                      ).filter(
                        (id) =>
                          id !== myId
                      );

                return {
                  ...reel,
                  likes:
                    updatedLikes,
                  isLikedExplicitly:
                    isLiked,
                };
              }

              return reel;
            })
          );
        }
      } catch (err) {
        console.error(
          "Like failed:",
          err
        );
      }
    };

  // ======================================================
  // SAVE
  // ======================================================

  const handleSaveToggle =
    async (postId) => {
      try {
        const response =
          await axios.post(
            `${API_BASE}/post/save/${postId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (
          response.data.success
        ) {
          const isSavedNow =
            response.data.message.includes(
              "Saved"
            );

          setReels((prev) =>
            prev.map((reel) =>
              reel._id === postId
                ? {
                    ...reel,
                    isSavedByMe:
                      isSavedNow,
                  }
                : reel
            )
          );
        }
      } catch (err) {
        console.error(
          "Save failed:",
          err
        );
      }
    };

  // ======================================================
  // FOLLOW
  // ======================================================

  const handleFollowToggle =
    async (
      userId,
      currentState
    ) => {
      try {
        const response =
          await axios.post(
            `${API_BASE}/post/follow/${userId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (
          response.data.success
        ) {
          setReels((prev) =>
            prev.map((reel) => {
              if (
                reel.owner?._id ===
                userId
              ) {
                return {
                  ...reel,
                  isOwnerFollowed:
                    !currentState,
                };
              }

              return reel;
            })
          );
        }
      } catch (err) {
        console.error(
          "Follow failed:",
          err
        );
      }
    };

  // ======================================================
  // COMMENT SUBMIT
  // ======================================================

  const handleCommentSubmit =
    async (postId, text) => {
      if (!text.trim()) return;

      try {
        const response =
          await axios.post(
            `${API_BASE}/post/comment/${postId}`,
            {
              content:
                text.trim(),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            }
          );

        if (
          response.data.success
        ) {
          const createdComment =
            response.data.data;

          setDrawerComments(
            (prev) => [
              ...prev,
              createdComment,
            ]
          );

          setReels((prev) =>
            prev.map((reel) =>
              reel._id === postId
                ? {
                    ...reel,
                    commentCount:
                      (
                        reel.commentCount ||
                        0
                      ) + 1,
                  }
                : reel
            )
          );

          setCommentText("");
        }
      } catch (err) {
        console.error(
          "Comment failed:",
          err
        );
      }
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-white mb-3" />

        <p className="text-white">
          Loading Reels...
        </p>
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden">

      {/* REELS */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-none">

        {reels.map((reel) => (
          <ReelVideoNode
            key={reel._id}
            reel={postSchemaDataNormalizer(
              reel,
              currentUser?._id
            )}
            muted={muted}
            setMuted={setMuted}
            onLike={() =>
              handleLikeToggle(
                reel._id
              )
            }
            onSave={() =>
              handleSaveToggle(
                reel._id
              )
            }
            onFollow={() =>
              handleFollowToggle(
                reel.owner?._id,
                reel.isOwnerFollowed
              )
            }
            onOpenComments={() =>
              setActiveCommentsPostId(
                reel._id
              )
            }
            onInlineCommentSubmit={(
              text
            ) =>
              handleCommentSubmit(
                reel._id,
                text
              )
            }
          />
        ))}
      </div>

      {/* COMMENTS DRAWER */}
      {activeCommentsPostId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">

          <div className="bg-white text-black w-full h-[70vh] rounded-t-3xl flex flex-col">

            {/* HEADER */}
            <div className="flex items-center justify-between p-4 border-b">

              <h2 className="font-semibold">
                Comments
              </h2>

              <button
                onClick={() =>
                  setActiveCommentsPostId(
                    null
                  )
                }
              >
                <X size={22} />
              </button>
            </div>

            {/* COMMENTS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {drawerLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin" />
                </div>
              ) : drawerComments
                  ?.length === 0 ? (
                <p className="text-center text-zinc-500">
                  No comments yet
                </p>
              ) : (
                drawerComments.map(
                  (comment) => (
                    <div
                      key={
                        comment._id
                      }
                      className="flex gap-3"
                    >
                      <img
                        src={
                          comment
                            .owner
                            ?.avatar ||
                          "https://placehold.co/100x100"
                        }
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />

                      <div>
                        <p className="font-semibold text-sm">
                          {
                            comment
                              .owner
                              ?.username
                          }
                        </p>

                        <p className="text-sm text-zinc-700">
                          {
                            comment.content
                          }
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            {/* COMMENT INPUT */}
            <div className="p-4 border-t flex items-center gap-2">

              <input
                type="text"
                value={commentText}
                onChange={(e) =>
                  setCommentText(
                    e.target.value
                  )
                }
                placeholder="Add a comment..."
                className="flex-1 border rounded-full px-4 py-2 outline-none"
              />

              <button
                onClick={() =>
                  handleCommentSubmit(
                    activeCommentsPostId,
                    commentText
                  )
                }
                className="bg-black text-white p-3 rounded-full"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ======================================================
// REEL NODE
// ======================================================

const ReelVideoNode = ({
  reel,
  muted,
  setMuted,
  onLike,
  onSave,
  onFollow,
  onOpenComments,
  onInlineCommentSubmit,
}) => {
  const videoRef = useRef(null);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [localComment, setLocalComment] =
    useState("");

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                videoRef.current
                  ?.play()
                  .catch(() => {});

                setIsPlaying(
                  true
                );
              } else {
                videoRef.current?.pause();

                if (
                  videoRef.current
                ) {
                  videoRef.current.currentTime = 0;
                }

                setIsPlaying(
                  false
                );
              }
            }
          );
        },
        {
          threshold: 0.6,
        }
      );

    if (videoRef.current) {
      observer.observe(
        videoRef.current
      );
    }

    return () =>
      observer.disconnect();
  }, []);

  const handleVideoPressToggle =
    () => {
      if (!videoRef.current)
        return;

      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current
          .play()
          .catch(() => {});

        setIsPlaying(true);
      }
    };

  const handleLocalSubmit = (
    e
  ) => {
    e.preventDefault();

    if (!localComment.trim())
      return;

    onInlineCommentSubmit(
      localComment
    );

    setLocalComment("");
  };

  return (
    <div className="h-screen w-full shrink-0 snap-start relative flex items-center justify-center bg-black overflow-hidden">

      {/* VIDEO */}
      <video
        ref={videoRef}
        src={
          reel.mediaFiles?.[0]
            ?.url
        }
        poster={
          reel.thumbnail || ""
        }
        onClick={
          handleVideoPressToggle
        }
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
      />

      {/* MUTE BUTTON */}
      <button
        onClick={() =>
          setMuted(!muted)
        }
        className="absolute top-5 right-5 p-2 bg-black/40 rounded-full z-20"
      >
        {muted ? (
          <VolumeX size={18} />
        ) : (
          <Volume2 size={18} />
        )}
      </button>

      {/* RIGHT SIDE ACTIONS */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">

        {/* LIKE */}
        <button
          onClick={onLike}
          className="flex flex-col items-center"
        >
          <Heart
            size={28}
            className={
              reel.isLikedByMe
                ? "fill-red-500 text-red-500"
                : "text-white"
            }
          />

          <span className="text-xs mt-1 text-white">
            {reel.likesCount}
          </span>
        </button>

        {/* COMMENT */}
        <button
          onClick={
            onOpenComments
          }
          className="flex flex-col items-center"
        >
          <MessageCircle
            size={28}
            className="text-white"
          />

          <span className="text-xs mt-1 text-white">
            {
              reel.commentCount
            }
          </span>
        </button>

        {/* SAVE */}
        <button
          onClick={onSave}
          className="flex flex-col items-center"
        >
          <Bookmark
            size={28}
            className={
              reel.isSavedByMe
                ? "fill-white text-white"
                : "text-white"
            }
          />
        </button>
      </div>

      {/* BOTTOM CONTENT */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent z-20">

        {/* USER */}
        <div className="flex items-center gap-3 mb-3">

          <img
            src={
              reel.owner
                ?.avatar ||
              "https://placehold.co/100x100"
            }
            alt=""
            className="w-11 h-11 rounded-full object-cover"
          />

          <div className="flex-1">

            <div className="flex items-center gap-2">

              <p className="font-semibold text-sm text-white">
                {
                  reel.owner
                    ?.username
                }
              </p>

              {/* FOLLOW BUTTON */}
              <button
                onClick={
                  onFollow
                }
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  reel.isOwnerFollowed
                    ? "bg-zinc-700 text-white"
                    : "bg-white text-black"
                }`}
              >
                {reel.isOwnerFollowed ? (
                  <span className="flex items-center gap-1">
                    <UserCheck size={14} />
                    Following
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <UserPlus size={14} />
                    Follow
                  </span>
                )}
              </button>
            </div>

            {/* BIO */}
            {reel.owner?.bio && (
              <p className="text-xs text-zinc-300 mt-1">
                {
                  reel.owner
                    ?.bio
                }
              </p>
            )}

            {/* LOCATION */}
            {reel.location && (
              <div className="flex items-center gap-1 text-xs text-zinc-300 mt-1">
                <MapPin size={12} />
                {reel.location}
              </div>
            )}
          </div>
        </div>

        {/* CAPTION */}
        {reel.caption && (
          <p className="text-sm text-white mb-2">
            {reel.caption}
          </p>
        )}

        {/* VIEW COMMENTS */}
        <button
          onClick={
            onOpenComments
          }
          className="text-sm text-zinc-300 mb-3"
        >
          View all comments
        </button>

        {/* COMMENT INPUT */}
        <form
          onSubmit={
            handleLocalSubmit
          }
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={
              localComment
            }
            onChange={(e) =>
              setLocalComment(
                e.target.value
              )
            }
            placeholder="Add a comment..."
            className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white outline-none"
          />

          <button
            type="submit"
            className="p-2 bg-white text-black rounded-full"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

// ======================================================
// NORMALIZER
// ======================================================

const postSchemaDataNormalizer =
  (
    post,
    currentUserId
  ) => {
    return {
      ...post,

      likesCount:
        post.likes?.length ||
        0,

      commentCount:
        post.commentCount ||
        0,

      isLikedByMe:
        post.isLikedExplicitly ||
        post.likes?.includes(
          currentUserId
        ),

      isSavedByMe:
        post.isSavedByMe ||
        false,

      isOwnerFollowed:
        post.isOwnerFollowed ||
        false,
    };
  };

export default ReelsPage;