import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
} from "react";

import {
  Search,
  X,
  User as UserIcon,
  CheckCircle,
} from "lucide-react";

import { ShopContext } from "../context/ShopContext";

import { useNavigate } from "react-router";

import axios from "axios";

const SearchPage = () => {
  const { backendUrl } = useContext(ShopContext);

  const navigate = useNavigate();

  // ======================================================
  // STATE
  // ======================================================

  const [searchQuery, setSearchQuery] = useState("");

  const [filteredUsers, setFilteredUsers] = useState([]);

  const [loading, setLoading] = useState(false);

  // ======================================================
  // TOKEN + HEADERS
  // ======================================================

  const token = localStorage.getItem("accessToken");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // ======================================================
  // SEARCH USERS
  // ======================================================

  useEffect(() => {
    // Don't search if backend missing
    if (!backendUrl || !token) return;

    // Trim query
    const trimmedQuery = searchQuery.trim();

    // Empty query handling
    if (!trimmedQuery) {
      setFilteredUsers([]);
      return;
    }

    // Abort controller
    const controller = new AbortController();

    // Debounce timer
    const debounceTimer = setTimeout(async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `${backendUrl}/users/search`,
          {
            params: {
              q: trimmedQuery,
            },

            headers,

            withCredentials: true,

            signal: controller.signal,
          }
        );

        if (response.data.success) {
          setFilteredUsers(response.data.data);
        }
      } catch (err) {
        // Ignore cancelled requests
        if (
          err.name !== "CanceledError" &&
          err.code !== "ERR_CANCELED"
        ) {
          console.error(
            "Error retrieving search results:",
            err
          );
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    // Cleanup
    return () => {
      clearTimeout(debounceTimer);

      controller.abort();
    };
  }, [searchQuery, backendUrl, headers, token]);

  // ======================================================
  // CLEAR INPUT
  // ======================================================

  const handleClearInput = () => {
    setSearchQuery("");
    setFilteredUsers([]);
  };

  // ======================================================
  // NAVIGATE TO USER
  // ======================================================

  const handleUserClick = (username) => {
    navigate(`/user/${username}`);
  };

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24 font-sans antialiased">

      {/* SEARCH HEADER */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-40 px-4 py-3 max-w-md mx-auto">

        <div className="relative flex items-center bg-slate-100 rounded-xl px-3.5 py-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white border border-transparent focus-within:border-slate-200">

          <Search
            size={18}
            className="text-slate-400 mr-2.5 shrink-0"
          />

          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
          />

          {searchQuery && (
            <button
              onClick={handleClearInput}
              className="p-0.5 hover:bg-slate-200 rounded-full transition-colors ml-1"
            >
              <X
                size={14}
                className="text-slate-500"
              />
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-md mx-auto px-4 mt-4">

        <h2 className="text-sm font-bold text-slate-900 mb-3 px-1">
          {searchQuery
            ? "Search Results"
            : "Search Users"}
        </h2>

        {/* LOADING */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">

            {/* USERS */}
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                onClick={() =>
                  handleUserClick(user.username)
                }
                className="flex items-center justify-between p-1 rounded-xl hover:bg-slate-50/80 cursor-pointer transition-all duration-150 active:scale-[0.99]"
              >

                {/* LEFT SIDE */}
                <div className="flex items-center gap-3">

                  {/* AVATAR */}
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

                  {/* USER INFO */}
                  <div className="flex flex-col">

                    <div className="flex items-center gap-1">

                      <span className="font-semibold text-sm text-slate-900 tracking-tight leading-none mb-0.5">
                        {user.username}
                      </span>

                      {user.isVerified && (
                        <CheckCircle
                          size={14}
                          className="text-blue-500 fill-blue-500 shrink-0"
                        />
                      )}
                    </div>

                    <span className="text-xs text-slate-500 font-normal">
                      {user.fullName}
                    </span>
                  </div>
                </div>

                {/* VIEW BUTTON */}
                <div className="text-xs font-semibold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  View
                </div>
              </div>
            ))}

            {/* EMPTY STATE */}
            {!loading &&
              searchQuery &&
              filteredUsers.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-sm">

                  No users found matching{" "}

                  <span className="font-semibold text-slate-700">
                    "{searchQuery}"
                  </span>
                </div>
              )}

            {/* INITIAL STATE */}
            {!searchQuery && (
              <div className="text-center py-16 text-slate-400 text-sm">
                Start typing to search users.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;