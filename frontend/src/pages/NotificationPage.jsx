import React, { useEffect, useContext } from "react";
import { ArrowLeft, Bell, UserPlus, Heart, MessageCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import axios from "axios";

const NotificationPage = () => {
  const navigate = useNavigate();
  
  // `notifications`, `setNotifications`, और `loading` अब Context से आ रहे हैं
  const { backendUrl, notifications, setNotifications, loading, setLoading } = useContext(ShopContext);

  const token = localStorage.getItem("accessToken");
  const API_BASE = `${backendUrl}/notifications`;

  // Fetch all notifications for the logged-in user
  useEffect(() => {
    if (!backendUrl || !token) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/getNotifications`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        if (response.data.success) {
          setNotifications(response.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [backendUrl, token, API_BASE, setNotifications, setLoading]);

  // Mark a single or all notifications as read
  const handleMarkAsRead = async (id = null) => {
    try {
      const url = id 
        ? `${API_BASE}/read/${id}` 
        : `${API_BASE}/read-all`;
      
      const response = await axios.put(url, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            id === null || notif._id === id ? { ...notif, isRead: true } : notif
          )
        );
      }
    } catch (err) {
      console.error("Failed to update read status:", err);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to delete all notifications?")) {
      try {
        const response = await axios.delete(`${API_BASE}/clear`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });

        if (response.data.success) {
          setNotifications([]);
        }
      } catch (err) {
        console.error("Failed to clear notifications:", err);
      }
    }
  };

  // Helper function to render specific action icons based on notification type
  const renderNotificationIcon = (type) => {
    switch (type) {
      case "follow":
        return <UserPlus size={14} className="text-white" />;
      case "like":
        return <Heart size={14} className="text-white fill-white" />;
      case "comment":
        return <MessageCircle size={14} className="text-white fill-white" />;
      default:
        return <Bell size={14} className="text-white" />;
    }
  };

  // Helper function to render background color for icon container
  const getIconBgColor = (type) => {
    switch (type) {
      case "follow": return "bg-indigo-600";
      case "like": return "bg-rose-500";
      case "comment": return "bg-emerald-500";
      default: return "bg-slate-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center max-w-md mx-auto">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20 font-sans antialiased max-w-md mx-auto border-x border-slate-50">
      
      {/* STICKY HEADER */}
      <div className="sticky top-0 bg-white border-b border-slate-100 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={22} className="text-slate-800" />
          </button>
          <h1 className="font-bold text-lg tracking-tight text-slate-900">Notifications</h1>
        </div>
        
        {notifications.length > 0 && (
          <button 
            onClick={handleClearAll} 
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
            title="Clear all"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* QUICK ACTIONS BAR */}
      {notifications.some(n => !n.isRead) && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">
            You have unread notifications
          </span>
          <button 
            onClick={() => handleMarkAsRead(null)}
            className="text-indigo-600 font-bold hover:underline"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* NOTIFICATIONS STREAM */}
      <div className="divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="text-center py-24 px-4 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <Bell size={28} />
            </div>
            <p className="text-slate-500 font-medium text-sm">All caught up!</p>
            <p className="text-xs text-slate-400 mt-1">When people follow you or interact with your posts, they'll show up here.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id}
              onClick={() => {
                if (!notif.isRead) handleMarkAsRead(notif._id);
                if (notif.sender?.username) navigate(`/user/${notif.sender.username}`);
              }}
              className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                !notif.isRead ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-slate-50"
              }`}
            >
              {/* AVATAR & TYPE BADGE CONTAINER */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 bg-slate-100">
                  <img 
                    src={notif.sender?.avatar || "https://placehold.co/100x100?text=User"} 
                    alt={notif.sender?.username} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${getIconBgColor(notif.type)}`}>
                  {renderNotificationIcon(notif.type)}
                </div>
              </div>

              {/* TEXT CONTENT CONTAINER */}
              <div className="flex-1 space-y-0.5 min-w-0">
                <p className="text-xs text-slate-800 leading-normal break-words">
                  <span className="font-bold text-slate-900 mr-1.5 hover:underline">
                    {notif.sender?.username || "Someone"}
                  </span>
                  {notif.message || "interacted with your profile."}
                </p>
                
                <span className="text-[10px] text-slate-400 block font-medium">
                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : "Just now"}
                </span>
              </div>

              {/* UNREAD BLUE DOT INDICATOR */}
              {!notif.isRead && (
                <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default NotificationPage;