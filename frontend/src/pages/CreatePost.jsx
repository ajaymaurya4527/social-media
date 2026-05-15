import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { Image, X, MapPin, Hash, Loader2 } from 'lucide-react';
import axios from 'axios';
import { ShopContext } from '../context/ShopContext';

const CreatePost = () => {
    const [caption, setCaption] = useState("");
    const [location, setLocation] = useState("");
    const [tags, setTags] = useState("");
    const [mediaFiles, setMediaFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const {backendUrl}=useContext(ShopContext);


    // Handle file selection and generate previews
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + mediaFiles.length > 10) {
            alert("You can only upload up to 10 files.");
            return;
        }

        setMediaFiles((prev) => [...prev, ...files]);

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews((prev) => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        setMediaFiles(mediaFiles.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (mediaFiles.length === 0) return alert("Please select at least one image/video");

        setLoading(true);
        const formData = new FormData();
        formData.append("caption", caption);
        formData.append("location", location);
        formData.append("tags", tags);
        formData.append("mediaType", mediaFiles[0].type.startsWith('video') ? 'video' : 'image');

        // Append all files to "mediaFiles" to match backend upload.array("mediaFiles")
        mediaFiles.forEach((file) => {
            formData.append("mediaFiles", file);
        });

        try {
            const token = localStorage.getItem("accessToken");
            const response = await axios.post(`${backendUrl}/post/create-post`, formData, {
                headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
                withCredentials: true // Important for JWT cookies
            });

            if (response.data.success) {
                alert("Post created!");
                navigate("/");
            }
        } catch (error) {
            console.error("Upload error", error);
            alert(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-20 mb-20 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-center">Create New Post</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Media Preview Area */}
                <div className="grid grid-cols-3 gap-2">
                    {previews.map((src, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                            <img src={src} alt="preview" className="w-full h-full object-cover" />
                            <button 
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    
                    {mediaFiles.length < 10 && (
                        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <Image className="text-gray-400" />
                            <span className="text-xs text-gray-400 mt-1">Add Media</span>
                            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    )}
                </div>

                {/* Caption */}
                <textarea 
                    placeholder="Write a caption..." 
                    className="w-full p-3 border-none focus:ring-0 text-sm resize-none"
                    rows="4"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                />

                <hr className="border-gray-100" />

                {/* Location */}
                <div className="flex items-center space-x-2 px-2 text-gray-600">
                    <MapPin size={18} />
                    <input 
                        type="text" 
                        placeholder="Add location" 
                        className="flex-1 text-sm border-none focus:ring-0"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>

                {/* Tags */}
                <div className="flex items-center space-x-2 px-2 text-gray-600">
                    <Hash size={18} />
                    <input 
                        type="text" 
                        placeholder="Tags (comma separated)" 
                        className="flex-1 text-sm border-none focus:ring-0"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </div>

                <button 
                    disabled={loading}
                    className="w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300 flex justify-center items-center"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Share Post"}
                </button>
            </form>
        </div>
    );
};

export default CreatePost;