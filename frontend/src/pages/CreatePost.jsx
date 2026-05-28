import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Image,
  X,
  MapPin,
  Hash,
  Loader2,
  Video,
} from "lucide-react";

import axios from "../utils/axiosInstance"

import toast from "react-hot-toast"; // Imported react-hot-toast

import { ShopContext } from "../context/ShopContext";

const MAX_FILES = 10;

const CreatePost = () => {
  const navigate = useNavigate();

  const { backendUrl } =
    useContext(ShopContext);

  // ======================================================
  // STATE
  // ======================================================

  const [caption, setCaption] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [tags, setTags] = useState("");

  const [mediaFiles, setMediaFiles] =
    useState([]);

  const [previews, setPreviews] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  // ======================================================
  // TOKEN
  // ======================================================

  const token = localStorage.getItem(
    "accessToken"
  );

  // ======================================================
  // MEMOIZED HEADERS
  // ======================================================

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type":
        "multipart/form-data",
    }),
    [token]
  );

  // ======================================================
  // CLEANUP OBJECT URLS
  // ======================================================

  useEffect(() => {
    return () => {
      previews.forEach((preview) =>
        URL.revokeObjectURL(preview.url)
      );
    };
  }, [previews]);

  // ======================================================
  // HANDLE FILE CHANGE
  // ======================================================

  const handleFileChange = (e) => {
    const files = Array.from(
      e.target.files || []
    );

  if (!files.length) return;

    // Total file limit
    if (
      mediaFiles.length + files.length >
      MAX_FILES
    ) {
      toast.error(`You can upload maximum ${MAX_FILES} files`); // Replaced alert with toast
      return;
    }

    // Validate files
    const validFiles = files.filter(
      (file) => {
        const isValid =
          file.type.startsWith("image/") ||
          file.type.startsWith("video/");

        if (!isValid) {
          toast.error(`${file.name} is not supported`); // Replaced alert with toast
        }

        return isValid;
      }
    );

    // Create previews
    const newPreviews = validFiles.map(
      (file) => ({
        url: URL.createObjectURL(file),
        type: file.type,
      })
    );

    setMediaFiles((prev) => [
      ...prev,
      ...validFiles,
    ]);

    setPreviews((prev) => [
      ...prev,
      ...newPreviews,
    ]);
  };

  // ======================================================
  // REMOVE FILE
  // ======================================================

  const removeFile = (index) => {
    // Cleanup memory
    URL.revokeObjectURL(
      previews[index]?.url
    );

    setMediaFiles((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setPreviews((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // ======================================================
  // HANDLE SUBMIT
  // ======================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate clicks
    if (loading) return;

    // Validation
    if (!mediaFiles.length) {
      toast.error("Please select at least one image or video"); // Replaced alert with toast
      return;
    }

    if (!token) {
      toast.error("Please login first"); // Replaced alert with toast
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      // Append text fields
      formData.append(
        "caption",
        caption.trim()
      );

      formData.append(
        "location",
        location.trim()
      );

      formData.append(
        "tags",
        tags.trim()
      );

      // Detect media type
      const hasVideo = mediaFiles.some(
        (file) =>
          file.type.startsWith("video/")
      );

      formData.append(
        "mediaType",
        hasVideo ? "video" : "image"
      );

      // Append media files
      mediaFiles.forEach((file) => {
        formData.append(
          "mediaFiles",
          file
        );
      });

      // API CALL
      const response = await axios.post(
        `${backendUrl}/post/create-post`,
        formData,
        {
          headers,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("Post created successfully"); // Replaced alert with toast
        navigate("/");
      }
    } catch (error) {
      console.error(
        "Create post error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Something went wrong"
      ); // Replaced alert with toast
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="max-w-xl mx-auto mt-20 mb-20 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">

      {/* HEADER */}
      <h2 className="text-xl font-bold mb-4 text-center">
        Create New Post
      </h2>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >

        {/* PREVIEW GRID */}
        <div className="grid grid-cols-3 gap-2">

          {previews.map(
            (preview, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100"
              >

                {/* IMAGE */}
                {preview.type.startsWith(
                  "image/"
                ) ? (
                  <img
                    src={preview.url}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={preview.url}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* VIDEO ICON */}
                {preview.type.startsWith(
                  "video/"
                ) && (
                  <div className="absolute top-2 left-2 bg-black/50 p-1 rounded text-white">
                    <Video size={14} />
                  </div>
                )}

                {/* REMOVE BUTTON */}
                <button
                  type="button"
                  onClick={() =>
                    removeFile(index)
                  }
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )
          )}

          {/* ADD MEDIA */}
          {mediaFiles.length <
            MAX_FILES && (
            <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">

              <Image className="text-gray-400" />

              <span className="text-xs text-gray-400 mt-1">
                Add Media
              </span>

              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>

        {/* CAPTION */}
        <textarea
          placeholder="Write a caption..."
          className="w-full p-3 border-none focus:ring-0 text-sm resize-none outline-none"
          rows="4"
          value={caption}
          onChange={(e) =>
            setCaption(e.target.value)
          }
        />

        <hr className="border-gray-100" />

        {/* LOCATION */}
        <div className="flex items-center space-x-2 px-2 text-gray-600">

          <MapPin size={18} />

          <input
            type="text"
            placeholder="Add location"
            className="flex-1 text-sm border-none focus:ring-0 outline-none"
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
          />
        </div>

        {/* TAGS */}
        <div className="flex items-center space-x-2 px-2 text-gray-600">

          <Hash size={18} />

          <input
            type="text"
            placeholder="Tags (comma separated)"
            className="flex-1 text-sm border-none focus:ring-0 outline-none"
            value={tags}
            onChange={(e) =>
              setTags(e.target.value)
            }
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300 flex justify-center items-center"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            "Share Post"
          )}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;