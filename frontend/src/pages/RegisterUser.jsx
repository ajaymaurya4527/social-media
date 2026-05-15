import React, { useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from "react-router";
import { Loader2, Camera, Eye, EyeOff } from 'lucide-react'; // Added Eye icons
import { ShopContext } from '../context/ShopContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '', // Added confirmPassword
  });

  const [showPassword, setShowPassword] = useState(false); // Toggle state
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Toggle state

  const { backendUrl } = useContext(ShopContext);
  const endpoint = "/users/register";

  const [files, setFiles] = useState({ avatar: null, coverImage: null });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Password Match Validation ---
    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match!");
    }

    setLoading(true);

    const data = new FormData();
    data.append('username', formData.username);
    data.append('email', formData.email);
    data.append('fullName', formData.fullName);
    data.append('password', formData.password);
    data.append('avatar', files.avatar);
    if (files.coverImage) data.append('coverImage', files.coverImage);

    try {
      const response = await axios.post(backendUrl + endpoint, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        alert("Registration Successful!");
        navigate('/login');
      }
    } catch (error) {
      alert(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-4 border border-zinc-200">
        <h2 className="text-2xl font-bold text-center text-zinc-800 mb-6">Create Account</h2>

        <input name="fullName" placeholder="Full Name" onChange={handleInputChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        <input name="username" placeholder="Username" onChange={handleInputChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        <input name="email" type="email" placeholder="Email Address" onChange={handleInputChange} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />

        {/* Password Field */}
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            onChange={handleInputChange}
            required
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Confirm Password Field */}
        <div className="relative">
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            onChange={handleInputChange}
            required
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex gap-4">
          <label className="flex-1 cursor-pointer bg-zinc-100 p-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-zinc-200">
            <Camera size={16} /> {files.avatar ? "Avatar Selected" : "Avatar *"}
            <input type="file" name="avatar" hidden onChange={handleFileChange} required />
          </label>
          <label className="flex-1 cursor-pointer bg-zinc-100 p-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-zinc-200">
            <Camera size={16} /> {files.coverImage ? "Cover Selected" : "Cover (Opt)"}
            <input type="file" name="coverImage" hidden onChange={handleFileChange} />
          </label>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-black text-white p-3 rounded-lg font-semibold hover:bg-zinc-800 transition flex justify-center">
          {loading ? <Loader2 className="animate-spin" /> : "Register"}
        </button>

        <p className="text-center text-sm text-zinc-600">
          Already have an account? <Link to="/login" className="text-blue-600 font-bold">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;