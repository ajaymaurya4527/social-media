import React, { useContext, useEffect } from 'react';
import { NavLink } from 'react-router';
import { Heart, PlusSquare } from 'lucide-react';
import { ShopContext } from "../context/ShopContext";
import axios from "axios";

const Header = () => {
  const { backendUrl, notifications, setNotifications } = useContext(ShopContext);
  const token = localStorage.getItem("accessToken");

  // बैकग्राउंड में नोटिफिकेशन सिंक करने के लिए ताकि होम पेज पर भी काउंट अपडेट रहे
  useEffect(() => {
    if (!backendUrl || !token || notifications.length > 0) return;

    const getUnreadCountOnLoad = async () => {
      try {
        const response = await axios.get(`${backendUrl}/notifications/getNotifications`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        if (response.data.success) {
          setNotifications(response.data.data || []);
        }
      } catch (err) {
        console.error("Error syncing header notifications:", err);
      }
    };

    getUnreadCountOnLoad();
  }, [backendUrl, token, setNotifications, notifications.length]);

  // बिना पढ़े हुए (isRead === false) नोटिफिकेशन्स का काउंट निकालना
  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 px-4">
      <div className="flex items-center justify-between h-full max-w-5xl mx-auto">
        
        {/* Left: Create Post/Messages (IG Mobile Style) */}
        <div className="flex items-center space-x-4 flex-1">
           <NavLink to="/create" className="hover:scale-105 transition-transform">
            <PlusSquare size={24} />
          </NavLink>
        </div>

        {/* Middle: Brand Name */}
        <div className="flex justify-center flex-1">
          <NavLink to="/" className="text-2xl font-bold tracking-tighter font-serif italic">
            Spotlight
          </NavLink>
        </div>

        {/* Right: Notifications & Messages */}
        <div className="flex items-center justify-end space-x-4 flex-1">
          <NavLink to="/notifications" className="relative hover:scale-105 transition-transform p-1">
            <Heart size={24} />
            
            {/* UNREAD COUNT BADGE INDICATOR */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
        </div>

      </div>
    </nav>
  );
};

export default Header;