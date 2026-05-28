import React, {
  useContext,
  useMemo,
  useState,
} from "react";

import axios from "../utils/axiosInstance"

import {
  useNavigate,
  Link,
} from "react-router-dom";

import {
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

import toast from "react-hot-toast";

import { ShopContext } from "../context/ShopContext";

const Login = () => {
  const navigate = useNavigate();

  const { backendUrl } =
    useContext(ShopContext);

  // ======================================================
  // STATE
  // ======================================================

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  // ======================================================
  // MEMOIZED ENDPOINT
  // ======================================================

  const endpoint = useMemo(
    () => `${backendUrl}/users/login`,
    [backendUrl]
  );

  // ======================================================
  // HANDLE INPUT CHANGE
  // ======================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ======================================================
  // HANDLE SUBMIT
  // ======================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate clicks
    if (loading) return;

    // ======================================================
    // VALIDATION
    // ======================================================

    const trimmedIdentifier =
      formData.identifier.trim();

    if (!trimmedIdentifier) {
      return toast.error(
        "Username or Email is required"
      );
    }

    if (!formData.password) {
      return toast.error("Password is required");
    }

    // ======================================================
    // BUILD PAYLOAD
    // ======================================================

    const payload = {
      password: formData.password,

      [
        trimmedIdentifier.includes("@")
          ? "email"
          : "username"
      ]: trimmedIdentifier,
    };

    try {
      setLoading(true);

      const response = await axios.post(
        endpoint,
        payload,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        // ======================================================
        // STORE TOKENS
        // ======================================================

        localStorage.setItem(
          "accessToken",
          response.data.accessToken
        );

        localStorage.setItem(
          "refreshToken",
          response.data.refreshToken
        );

        // Success Notification
        toast.success(
          response.data.message ||
            "Logged in successfully!"
        );

        // ======================================================
        // REDIRECT
        // ======================================================

        navigate("/");
      }
    } catch (error) {
      console.error("Login failed:", error);

      toast.error(
        error.response?.data?.message ||
          "Login failed"
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

      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm space-y-6 border border-zinc-200">

        {/* HEADER */}
        <div className="text-center">

          <h2 className="text-3xl font-bold text-zinc-900">
            Welcome Back
          </h2>

          <p className="text-zinc-500 mt-2">
            Please enter your details
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* USERNAME / EMAIL */}
          <div>

            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Username or Email
            </label>

            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              required
              autoComplete="username"
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none transition"
              onChange={handleInputChange}
            />
          </div>

          {/* PASSWORD */}
          <div>

            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Password
            </label>

            <div className="relative">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                value={formData.password}
                required
                autoComplete="current-password"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none transition pr-12"
                onChange={handleInputChange}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 flex justify-center items-center disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* REGISTER LINK */}
        <p className="text-center text-sm text-zinc-500">

          Don't have an account?{" "}

          <Link
            to="/register"
            className="text-black font-bold hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;