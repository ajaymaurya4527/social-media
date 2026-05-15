import React, { useState, useEffect, useContext } from 'react';
import { Search, X, User as UserIcon, CheckCircle } from 'lucide-react';
import { ShopContext } from '../context/ShopContext';
import { useNavigate } from 'react-router'; // or 'react-router-dom' depending on your setup
import axios from 'axios';

const SearchPage = () => {
  const { backendUrl } = useContext(ShopContext);
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]); // Stores all profiles or suggestions
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("accessToken");
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch initial user recommendations / all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Replace this endpoint with your actual backend route that returns user profiles
        const response = await axios.get(`${backendUrl}/users/all-users`, { headers, withCredentials: true });
        if (response.data.success) {
          setUsers(response.data.data);
          setFilteredUsers(response.data.data); // Initialize list
        }
      } catch (err) {
        console.error("Error fetching users for search", err);
      } finally {
        setLoading(false);
      }
    };

    if (backendUrl) fetchUsers();
  }, [backendUrl]);

  // Handle client-side filtering as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users); // Reset to default suggestions if search is clear
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(query) || 
        user.fullName.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleClearInput = () => {
    setSearchQuery('');
  };

  const handleUserClick = (username) => {
    // Navigate to the respective user's profile view
    navigate(`/user/${username}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24 font-sans antialiased">
      
      {/* --- INSTAGRAM STYLED HEADER SEARCH BAR --- */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-40 px-4 py-3 max-w-md mx-auto">
        <div className="relative flex items-center bg-slate-100 rounded-xl px-3.5 py-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white border border-transparent focus-within:border-slate-200">
          <Search size={18} className="text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button 
              onClick={handleClearInput}
              className="p-0.5 hover:bg-slate-200 rounded-full transition-colors ml-1"
            >
              <X size={14} className="text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-md mx-auto px-4 mt-4">
        
        {/* Section Title */}
        <h2 className="text-sm font-bold text-slate-900 mb-3 px-1">
          {searchQuery ? "Search Results" : "Suggested Profiles"}
        </h2>

        {/* --- LOADING SPINNER --- */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div 
                key={user._id}
                onClick={() => handleUserClick(user.username)}
                className="flex items-center justify-between p-1 rounded-xl hover:bg-slate-50/80 cursor-pointer transition-all duration-150 active:scale-[0.99]"
              >
                {/* User Info Group */}
                <div className="flex items-center gap-3">
                  {/* Avatar Frame */}
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm text-slate-900 tracking-tight leading-none mb-0.5">
                        {user.username}
                      </span>
                      {/* Optional Verified badge feature logic */}
                      {user.isVerified && (
                        <CheckCircle size={14} className="text-blue-500 fill-blue-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-normal">
                      {user.fullName}
                    </span>
                  </div>
                </div>

                {/* View Profile Action Link Arrow */}
                <div className="text-xs font-semibold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  View
                </div>
              </div>
            ))}

            {/* --- EMPTY RESULT FALLBACK --- */}
            {filteredUsers.length === 0 && (
              <div className="text-center py-16 text-slate-400 text-sm">
                No users found matching "<span className="font-semibold text-slate-700">{searchQuery}</span>"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;