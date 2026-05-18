import React, { useContext, useState, useEffect, useRef } from 'react';
import { NavLink } from "react-router-dom"; // Fixed 'react-hyper' routing paths to default
import { Home, Search, Film, Send } from 'lucide-react';
import { ShopContext } from '../context/ShopContext';
import { io } from "socket.io-client";
import axios from "axios";

const Footer = () => {
  const { userAvatar, backendUrl } = useContext(ShopContext);
  const [totalUnread, setTotalUnread] = useState(0);
  const socket = useRef(null);

  const token = localStorage.getItem("accessToken");
  const API_BASE = backendUrl;

  // 1. Initial State Engine: Fetch Unread Counts from API upon mounting
  useEffect(() => {
    if (!API_BASE || !token) return;

    const fetchInitialUnreadCount = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users/search`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        const contacts = res.data.data || [];
        // Calculate sum total of unread counts across all active instances
        const initialSum = contacts.reduce((acc, curr) => acc + Number(curr.unreadCount || 0), 0);
        setTotalUnread(initialSum);
      } catch (err) {
        console.error("Failed to sync initial badge statistics on footer navigation:", err);
      }
    };

    fetchInitialUnreadCount();
  }, [API_BASE, token]);

  // 2. Realtime Socket Interface System Pipeline
  useEffect(() => {
    if (!backendUrl || !token) return;

    let userId = null;

    const setupRealtimeNotificationEngine = async () => {
      try {
        // Find current context id matrix
        const userRes = await axios.get(`${API_BASE}/users/current-user`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        const payload = userRes.data.data;
        const userData = payload?.user ? payload.user : payload;
        userId = userData?._id;

        if (!userId) return;

        const socketHost = backendUrl.replace("/api/v1", "");
        socket.current = io(socketHost, {
          withCredentials: true,
          transports: ["websocket"],
        });

        socket.current.on("connect", () => {
          socket.current.emit("join_private_room", userId);
        });

        // Listen for new messages coming over the gateway node stream
        socket.current.on("receive_message", (incomingMessage) => {
          // Check whether current window is looking at messages screen or elsewhere
          const isCurrentlyOnChatScreen = window.location.pathname.includes("/messages");
          
          // Increment if user is reading outside message viewport and text comes from outside
          if (!isCurrentlyOnChatScreen && String(incomingMessage.senderId) !== String(userId)) {
            setTotalUnread((prev) => prev + 1);
          }
        });
      } catch (error) {
        console.error("Notification thread initial failure within footer component context:", error);
      }
    };

    setupRealtimeNotificationEngine();

    // Cleanup connection socket interface on route mutation tree changes
    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, [backendUrl, token]);

  // Reset counters immediately when a user navigates to the core communication tab
  const handleMessageIconClick = () => {
    setTotalUnread(0);
  };

  // Common styles for the NavLinks
  const navLinkClasses = ({ isActive }) => 
    `flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
      isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
    }`;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 pb-safe shadow-sm">
      <nav className="flex justify-around items-center h-full max-w-md mx-auto">
        
        {/* 1. Home */}
        <NavLink to="/" className={navLinkClasses}>
          <Home size={26} strokeWidth={2.5} />
        </NavLink>

        {/* 2. Reels */}
        <NavLink to="/reels" className={navLinkClasses}>
          <Film size={26} strokeWidth={2.5} />
        </NavLink>

        {/* 3. Messages with Notification Badge Layer */}
        <NavLink to="/messages" className={navLinkClasses} onClick={handleMessageIconClick}>
          <div className="relative p-1">
            <Send size={26} strokeWidth={2.5} className="-rotate-12 mb-0.5" />
            
            {/* INSTAGRAM STYLE RED NOTIFICATION BADGE COUNTER */}
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-red-500 text-white font-extrabold text-[10px] min-w-[18px] h-[18px] rounded-full px-1 flex items-center justify-center border-2 border-white animate-pulse">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
        </NavLink>

        {/* 4. Search */}
        <NavLink to="/search" className={navLinkClasses}>
          <Search size={26} strokeWidth={2.5} />
        </NavLink>

        {/* 5. Profile */}
        <NavLink to="/profile" className={navLinkClasses}>
          {({ isActive }) => (
            <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${
              isActive ? 'border-black' : 'border-transparent'
            }`}>
              <img 
                src={userAvatar || "https://via.placeholder.com/150"}
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </NavLink>

      </nav>
    </footer>
  );
};

export default Footer;