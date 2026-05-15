import React, { useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from "react-router";
import { Loader2, Eye, EyeOff } from 'lucide-react'; // Added Eye icons
import { ShopContext } from '../context/ShopContext';

const Login = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State for visibility
  const navigate = useNavigate();
  const { backendUrl } = useContext(ShopContext);
  const endpoint = "/users/login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      password: formData.password,
      [formData.identifier.includes('@') ? 'email' : 'username']: formData.identifier
    };

    try {
      const response = await axios.post(backendUrl + endpoint, payload);

      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        navigate('/');
      }
    } catch (error) {
      alert(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm space-y-6 border border-zinc-200">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-900">Welcome Back</h2>
          <p className="text-zinc-500 mt-2">Please enter your details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Username or Email</label>
            <input 
              type="text" 
              required
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none transition"
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <div className="relative"> {/* Container for absolute positioning */}
              <input 
                type={showPassword ? "text" : "password"} // Dynamic type
                required
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none transition pr-12"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button" // Important: prevents form submission
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Don't have an account? <Link to="/register" className="text-black font-bold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;