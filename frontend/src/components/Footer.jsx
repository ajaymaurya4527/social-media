import React, { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from "react-router-dom"; 
import { Home, Search, Film, Send } from 'lucide-react';
import { ShopContext } from '../context/ShopContext';
import { io } from "socket.io-client";
import axios from "axios";

const Footer = () => {
  const { userAvatar, backendUrl } = useContext(ShopContext);
  const [totalUnread, setTotalUnread] = useState(0);
  const socket = useRef(null);
  const location = useLocation();

  // References to solve socket closure scope limitations
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const token = localStorage.getItem("accessToken");
  const API_BASE = backendUrl;

  const fetchLatestUnreadCount = async () => {
    if (!API_BASE || !token) return;
    try {
      const res = await axios.get(`${API_BASE}/users/search`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const contacts = res.data.data || [];
      const initialSum = contacts.reduce((acc, curr) => acc + Number(curr.unreadCount || 0), 0);
      setTotalUnread(initialSum);
    } catch (err) {
      console.error("Failed to sync initial badge statistics on footer navigation:", err);
    }
  };

  // Sync on location context routing triggers
  useEffect(() => {
    fetchLatestUnreadCount();
  }, [location.pathname, API_BASE, token]);

  // Realtime Connection Context Loop
  useEffect(() => {
    if (!backendUrl || !token) return;

    let userId = null;

    const setupRealtimeNotificationEngine = async () => {
      try {
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

        socket.current.on("receive_message", (incomingMessage) => {
          const activeChatUserId = localStorage.getItem("activeChatUserId");
          const currentPath = locationRef.current;
          
          const isCurrentlyOnChatScreen = currentPath.includes("/messages");
          const isFromMe = String(incomingMessage.senderId) === String(userId);
          const isWithActiveUser = activeChatUserId && String(incomingMessage.senderId) === String(activeChatUserId);

          // If the message is incoming, add to overall badge if not currently chatting with them
          if (!isFromMe) {
            if (!isCurrentlyOnChatScreen || !isWithActiveUser) {
              setTotalUnread((prev) => prev + 1);
            }
          }
        });

      } catch (error) {
        console.error("Notification pipeline error within footer module context:", error);
      }
    };

    setupRealtimeNotificationEngine();

    // Listen to manual read reset triggers dispatched from Messages screen
    const handleManualReset = () => fetchLatestUnreadCount();
    window.addEventListener("unread_counts_reset", handleManualReset);

    return () => {
      if (socket.current) socket.current.disconnect();
      window.removeEventListener("unread_counts_reset", handleManualReset);
    };
  }, [backendUrl, token]);

  const navLinkClasses = ({ isActive }) => 
    `flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 relative ${
      isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
    }`;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 pb-safe shadow-sm">
      <nav className="flex justify-around items-center h-full max-w-md mx-auto">
        
        <NavLink to="/" className={navLinkClasses}>
          <Home size={26} strokeWidth={2.5} />
        </NavLink>

        <NavLink to="/reels" className={navLinkClasses}>
          <Film size={26} strokeWidth={2.5} />
        </NavLink>

        {/* Messaging Icon Nav Target Frame */}
        <NavLink to="/messages" className={navLinkClasses}>
          <div className="relative p-1 flex items-center justify-center">
            <Send size={26} strokeWidth={2.5} className="-rotate-12 mb-0.5" />
            
            {/* DYNAMIC RED COUNTER INJECTION LAYER */}
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white font-extrabold text-[10px] min-w-[18px] h-[18px] rounded-full px-1 flex items-center justify-center border-2 border-white animate-pulse">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
        </NavLink>

        <NavLink to="/search" className={navLinkClasses}>
          <Search size={26} strokeWidth={2.5} />
        </NavLink>

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