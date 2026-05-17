import React, {
  useContext,
  useState,
  useMemo,
} from "react";

import axios from "axios";

import { useNavigate, Link } from "react-router";

import {
  Loader2,
  Camera,
  Eye,
  EyeOff,
} from "lucide-react";

import { ShopContext } from "../context/ShopContext";

const Register = () => {
  const { backendUrl } = useContext(ShopContext);

  const navigate = useNavigate();

  // ======================================================
  // FORM STATE
  // ======================================================

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });

  // ======================================================
  // FILE STATE
  // ======================================================

  const [files, setFiles] = useState({
    avatar: null,
    coverImage: null,
  });

  // ======================================================
  // UI STATE
  // ======================================================

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  // ======================================================
  // MEMOIZED ENDPOINT
  // ======================================================

  const endpoint = useMemo(
    () => `${backendUrl}/users/register`,
    [backendUrl]
  );

  // ======================================================
  // HANDLE INPUT
  // ======================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ======================================================
  // HANDLE FILE CHANGE
  // ======================================================

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;

    const file = selectedFiles[0];

    if (!file) return;

    // OPTIONAL FILE SIZE VALIDATION (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return alert("File size must be below 5MB");
    }

    setFiles((prev) => ({
      ...prev,
      [name]: file,
    }));
  };

  // ======================================================
  // HANDLE SUBMIT
  // ======================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate submit
    if (loading) return;

    // ======================================================
    // VALIDATIONS
    // ======================================================

    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match!");
    }

    if (formData.password.length < 6) {
      return alert(
        "Password must be at least 6 characters"
      );
    }

    if (!files.avatar) {
      return alert("Avatar is required");
    }

    try {
      setLoading(true);

      const data = new FormData();

      data.append("username", formData.username.trim());

      data.append("email", formData.email.trim());

      data.append(
        "fullName",
        formData.fullName.trim()
      );

      data.append("password", formData.password);

      data.append("avatar", files.avatar);

      if (files.coverImage) {
        data.append("coverImage", files.coverImage);
      }

      const response = await axios.post(
        endpoint,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        alert("Registration Successful!");

        navigate("/login");
      }
    } catch (error) {
      console.error("Registration error:", error);

      alert(
        error.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-4 border border-zinc-200"
      >

        {/* TITLE */}
        <h2 className="text-2xl font-bold text-center text-zinc-800 mb-6">
          Create Account
        </h2>

        {/* FULL NAME */}
        <input
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleInputChange}
          required
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />

        {/* USERNAME */}
        <input
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleInputChange}
          required
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />

        {/* EMAIL */}
        <input
          name="email"
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleInputChange}
          required
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />

        {/* PASSWORD */}
        <div className="relative">

          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword((prev) => !prev)
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="relative">

          <input
            name="confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                (prev) => !prev
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {showConfirmPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>

        {/* FILE UPLOADS */}
        <div className="flex gap-4">

          {/* AVATAR */}
          <label className="flex-1 cursor-pointer bg-zinc-100 p-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-zinc-200">

            <Camera size={16} />

            {files.avatar
              ? "Avatar Selected"
              : "Avatar *"}

            <input
              type="file"
              name="avatar"
              accept="image/*"
              hidden
              onChange={handleFileChange}
              required
            />
          </label>

          {/* COVER IMAGE */}
          <label className="flex-1 cursor-pointer bg-zinc-100 p-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-zinc-200">

            <Camera size={16} />

            {files.coverImage
              ? "Cover Selected"
              : "Cover (Opt)"}

            <input
              type="file"
              name="coverImage"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded-lg font-semibold hover:bg-zinc-800 transition flex justify-center items-center disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Register"
          )}
        </button>

        {/* LOGIN LINK */}
        <p className="text-center text-sm text-zinc-600">

          Already have an account?{" "}

          <Link
            to="/login"
            className="text-blue-600 font-bold"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;