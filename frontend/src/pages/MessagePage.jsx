import React, { useState, useEffect, useRef, useContext } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { 
  Send, 
  Image, 
  Smile, 
  ArrowLeft, 
  Loader2, 
  Search, 
  SquarePen, 
  Heart, 
  MessageCircle,
  X,
  Phone,
  Video,
  Info
} from "lucide-react";

const Messages = () => {
  const { backendUrl } = useContext(ShopContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null); 
  const [conversations, setConversations] = useState([]); 
  const [selectedUser, setSelectedUser] = useState(null); 
  const [messages, setMessages] = useState([]); 
  const [typedMessage, setTypedMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); 

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSendingImage, setIsSendingImage] = useState(false);

  const socket = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const selectedUserRef = useRef(null);
  const currentUserRef = useRef(null);

  const token = localStorage.getItem("accessToken");
  const API_BASE = backendUrl; 

  useEffect(() => { 
    selectedUserRef.current = selectedUser; 
    if (selectedUser?._id) {
      localStorage.setItem("activeChatUserId", selectedUser._id);
    } else {
      localStorage.removeItem("activeChatUserId");
    }
  }, [selectedUser]);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    return () => {
      localStorage.removeItem("activeChatUserId");
    };
  }, []);

  // 1. Initial State Engine Bootstrap Setup
  useEffect(() => {
    if (!backendUrl || !token) {
      setLoadingChats(false);
      return;
    }

    const initializeChatSystem = async () => {
      try {
        setLoadingChats(true);
        
        const userRes = await axios.get(`${API_BASE}/users/current-user`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        
        const payload = userRes.data.data;
        const userData = payload?.user ? payload.user : payload;
        setCurrentUser(userData);

        let initialContacts = [];
        try {
          const usersRes = await axios.get(`${API_BASE}/users/search`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          
          initialContacts = (usersRes.data.data || []).map(user => ({
            ...user,
            lastMessage: user.lastMessage || "", 
            unreadCount: Number(user.unreadCount || 0)
          }));
        } catch (searchErr) {
          console.warn("Suggested search endpoint initialization failure:", searchErr);
        }

        if (location.state?.chatTargetUser) {
          const target = location.state.chatTargetUser;
          const alreadyExists = initialContacts.some((c) => String(c._id) === String(target._id));
          if (!alreadyExists) {
            initialContacts = [{ ...target, lastMessage: "", unreadCount: 0 }, ...initialContacts];
          }
          setSelectedUser(target);
        }
        setConversations(initialContacts);

        const socketHost = backendUrl.replace("/api/v1", "");
        socket.current = io(socketHost, {
          withCredentials: true,
          transports: ["websocket"],
        });

        socket.current.on("connect", () => {
          if (userData?._id) {
            socket.current.emit("join_private_room", userData._id);
          }
        });

        socket.current.on("receive_message", (incomingMessage) => {
          const activeUser = selectedUserRef.current;
          const myUser = currentUserRef.current; 

          if (
            activeUser &&
            (String(incomingMessage.senderId) === String(activeUser._id) || 
             String(incomingMessage.receiverId) === String(activeUser._id))
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m._id === incomingMessage._id)) return prev;
              return [...prev, incomingMessage];
            });
            
            // If message received belongs to active screen view, notify backend database context via API
            axios.post(`${API_BASE}/messages/mark-as-read/${activeUser._id}`, {}, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }).catch(e => console.error(e));
          }
          
          setConversations((prevContacts) => {
            const senderOrReceiverId = String(incomingMessage.senderId) === String(myUser?._id) 
              ? incomingMessage.receiverId 
              : incomingMessage.senderId;

            const index = prevContacts.findIndex(c => String(c._id) === String(senderOrReceiverId));
            let updatedContacts = [...prevContacts];
            let targetUser;

            const previewText = incomingMessage.imageUrl ? "📷 Photo" : incomingMessage.messageText;

            if (index !== -1) {
              const [existingUser] = updatedContacts.splice(index, 1);
              
              const isChatOpen = activeUser && String(activeUser._id) === String(senderOrReceiverId);
              const isIncoming = String(incomingMessage.senderId) !== String(myUser?._id);

              targetUser = {
                ...existingUser,
                lastMessage: previewText,
                unreadCount: (isIncoming && !isChatOpen) ? (Number(existingUser.unreadCount || 0) + 1) : 0
              };
            } else {
              const isChatOpen = activeUser && String(activeUser._id) === String(senderOrReceiverId);
              const isIncoming = String(incomingMessage.senderId) !== String(myUser?._id);

              targetUser = {
                ...incomingMessage.senderDetails, 
                _id: senderOrReceiverId,
                username: incomingMessage.senderUsername || "New User",
                fullName: incomingMessage.senderFullName || "User Profile",
                avatar: incomingMessage.senderAvatar || "",
                lastMessage: previewText,
                unreadCount: (isIncoming && !isChatOpen) ? 1 : 0
              };
            }

            return [targetUser, ...updatedContacts];
          });
        });

      } catch (err) {
        console.error("Initialization Error across Message Thread Engine:", err);
      } opacity: { setLoadingChats(false); }
    };

    initializeChatSystem();

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, [backendUrl, token, location.state]);

  // 2. Chat Session Synchronization Hook
  useEffect(() => {
    if (!selectedUser || !currentUser || !token) return;

    // Reset local view context counters instantly
    setConversations(prev => 
      prev.map(c => String(c._id) === String(selectedUser._id) ? { ...c, unreadCount: 0 } : c)
    );

    // CRITICAL FIX: Trigger backend to clear tracking flags for selected account references
    const clearUnreadBannersOnBackend = async () => {
      try {
        await axios.post(`${API_BASE}/messages/mark-as-read/${selectedUser._id}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        
        // Dispatch local event context notification so footer automatically recalculates states
        window.dispatchEvent(new Event("unread_counts_reset"));
      } catch (err) {
        console.warn("Backend read flag updating failed or route not fully configured:", err);
      }
    };

    const fetchChatHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE}/messages/history/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setMessages(res.data.data || []);
      } catch (err) {
        console.error("Could not pull historical message arrays:", err);
        setMessages([]); 
      }
    };

    clearUnreadBannersOnBackend();
    fetchChatHistory();

    if (socket.current && socket.current.connected) {
      socket.current.emit("join_chat", {
        senderId: currentUser._id,
        receiverId: selectedUser._id,
      });
    }

    cancelImageAttachment();
  }, [selectedUser, currentUser, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const cancelImageAttachment = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser || !currentUser || !token) return;
    if (!typedMessage.trim() && !selectedImage) return;

    if (selectedImage) {
      try {
        setIsSendingImage(true);
        const formData = new FormData();
        formData.append("receiverId", selectedUser._id);
        formData.append("image", selectedImage);
        if (typedMessage.trim()) {
          formData.append("messageText", typedMessage.trim());
        }

        const res = await axios.post(`${API_BASE}/messages/send`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          },
          withCredentials: true,
        });

        if (res.data.success) {
          if (socket.current && socket.current.connected) {
            socket.current.emit("send_message", res.data.data);
          } else {
            setMessages((prev) => [...prev, res.data.data]);
          }
          cancelImageAttachment();
          setTypedMessage("");
        }
      } catch (err) {
        console.error("Image transmission operation fault:", err);
      } finally {
        setIsSendingImage(false);
      }
    } else {
      const textPayload = typedMessage.trim();
      setTypedMessage(""); 

      if (socket.current && socket.current.connected) {
        socket.current.emit("send_message", {
          senderId: currentUser._id,
          receiverId: selectedUser._id,
          messageText: textPayload,
        });
      } else {
        try {
          const res = await axios.post(
            `${API_BASE}/messages/send`,
            { receiverId: selectedUser._id, messageText: textPayload },
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            }
          );
          if (res.data.success) {
            setMessages((prev) => [...prev, res.data.data]);
          }
        } catch (err) {
          console.error("REST fallback message delivery failed:", err);
        }
      }
    }
  };

  if (loadingChats) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-neutral-800" size={28} />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-white font-sans antialiased overflow-hidden">
      
      {/* SIDEBAR VIEW CONTAINER */}
      <div className={`w-full md:w-[390px] border-r border-neutral-200 flex flex-col bg-white shrink-0 h-full ${selectedUser ? "hidden md:flex" : "flex"}`}>
        <div className="pt-6 px-5 pb-3 flex flex-col gap-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(-1)}>
              <h2 className="text-xl font-extrabold tracking-tight text-black truncate max-w-[200px]">
                {currentUser?.username || "messages"}
              </h2>
              <span className="text-xs font-semibold text-neutral-500">▼</span>
            </div>
            <button className="text-black hover:opacity-70 transition-opacity">
              <SquarePen size={22} strokeWidth={1.75} />
            </button>
          </div>
          <div className="relative flex items-center bg-neutral-100 rounded-xl px-3 py-2">
            <Search size={16} className="text-neutral-400 absolute left-3.5" />
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm pl-7 outline-none text-black placeholder-neutral-400" 
            />
          </div>
        </div>

        <div className="px-5 py-3 flex gap-4 overflow-x-auto border-b border-neutral-100 scrollbar-none shrink-0">
          <div className="flex flex-col items-center gap-1.5 min-w-[64px] relative cursor-pointer">
            <div className="w-14 h-14 rounded-full p-0.5 border border-dashed border-neutral-300 flex items-center justify-center">
              <img src={currentUser?.avatar || "https://placehold.co/100x100?text=Me"} alt="" className="w-full h-full rounded-full object-cover" />
            </div>
            <span className="text-[11px] text-neutral-400 text-center truncate w-14">Your note</span>
          </div>
          {conversations.slice(0, 3).map((user) => (
            <div key={`note-${user._id}`} className="flex flex-col items-center gap-1.5 min-w-[64px] relative cursor-pointer" onClick={() => setSelectedUser(user)}>
              <div className="w-14 h-14 rounded-full p-0.5 bg-linear-to-tr from-yellow-500 to-purple-600 flex items-center justify-center">
                <img src={user.avatar || "https://placehold.co/100x100?text=User"} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" />
              </div>
              <span className="text-[11px] text-neutral-700 text-center truncate w-14">{user.username}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations
            .filter((user) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                user.username?.toLowerCase().includes(query) || 
                user.fullName?.toLowerCase().includes(query)
              );
            })
            .map((user) => {
              const isSelected = selectedUser?._id === user._id;
              const hasUnread = Number(user.unreadCount) > 0; 
              return (
                <div
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center gap-3.5 px-5 py-3 cursor-pointer transition-colors select-none ${isSelected ? "bg-neutral-50" : "hover:bg-neutral-50/50"}`}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-neutral-100 relative">
                    <img src={user.avatar || "https://placehold.co/100x100?text=User"} alt={user.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${hasUnread ? "font-bold text-black" : "font-medium text-black"}`}>{user.username}</p>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? "font-semibold text-neutral-900" : "text-neutral-400"}`}>
                      {user.lastMessage || `${user.fullName} • Active now`}
                    </p>
                  </div>

                  {hasUnread && (
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0 ml-2">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse mb-0.5"></div>
                      <div className="bg-blue-500 text-white font-extrabold rounded-full min-w-[20px] h-[20px] px-1.5 flex items-center justify-center text-[10px] shadow-sm">
                        {user.unreadCount}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* MESSAGES CORE VIEWPORT FEED PLATFORM */}
      <div className={`flex-1 flex flex-col bg-white h-screen overflow-hidden relative ${!selectedUser ? "hidden md:flex items-center justify-center" : "flex"}`}>
        {selectedUser ? (
          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="h-[75px] px-6 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <button onClick={() => setSelectedUser(null)} className="md:hidden text-black hover:opacity-60 transition-opacity mr-1 shrink-0">
                  <ArrowLeft size={22} />
                </button>
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-neutral-100 cursor-pointer" onClick={() => navigate(`/user/${selectedUser.username}`)}>
                  <img src={selectedUser.avatar || "https://placehold.co/100x100?text=User"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/user/${selectedUser.username}`)}>
                  <h3 className="font-bold text-base text-black leading-tight hover:underline truncate">{selectedUser.username}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">Active now</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-black shrink-0">
                <button className="hover:opacity-60 transition-opacity"><Phone size={22} strokeWidth={1.75} /></button>
                <button className="hover:opacity-60 transition-opacity"><Video size={24} strokeWidth={1.75} /></button>
                <button className="hover:opacity-60 transition-opacity"><Info size={22} strokeWidth={1.75} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 bg-white flex flex-col min-h-0">
              <div className="flex flex-col items-center text-center py-8 border-b border-neutral-50 mb-4 shrink-0">
                <img src={selectedUser.avatar || "https://placehold.co/100x100?text=User"} alt="" className="w-24 h-24 rounded-full object-cover border border-neutral-100 shadow-xs mb-3" />
                <h4 className="font-extrabold text-xl text-black">{selectedUser.username}</h4>
                <p className="text-sm text-neutral-400 mt-1">{selectedUser.fullName} · Instagram</p>
              </div>

              <div className="w-full space-y-3.5 pb-2 flex-1">
                {messages.map((msg, index) => {
                  const isMe = String(msg.senderId) === String(currentUser?._id);
                  return (
                    <div key={msg._id || index} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-end gap-2 max-w-[70%] md:max-w-[55%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMe && (
                          <img src={selectedUser.avatar || "https://placehold.co/100x100?text=User"} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mb-0.5" />
                        )}
                        <div className="flex flex-col">
                          <div className={`rounded-2xl text-[14px] leading-relaxed select-text overflow-hidden ${isMe ? "bg-neutral-900 text-white rounded-br-md" : "bg-white text-black border border-neutral-200 rounded-bl-md"}`}>
                            {msg.imageUrl && (
                              <img src={msg.imageUrl} alt="Attachment" className="w-full max-h-[260px] object-cover" />
                            )}
                            {msg.messageText && (
                              <div className="px-4 py-2.5 break-words tracking-wide">
                                <p>{msg.messageText}</p>
                              </div>
                            )}
                          </div>
                          <span className={`text-[9px] text-neutral-400 mt-1 block px-1 ${isMe ? "text-right" : "text-left"}`}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just Now"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 bg-white shrink-0 border-t border-neutral-200 w-full mb-15">
              {imagePreview && (
                <div className="relative self-start border border-neutral-200 bg-neutral-50 p-1.5 rounded-xl flex items-center gap-2 mb-2 w-max">
                  <img src={imagePreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg" />
                  <button type="button" onClick={cancelImageAttachment} className="absolute -top-1.5 -right-1.5 bg-neutral-900 text-white rounded-full p-0.5">
                    <X size={12} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="border border-neutral-200 rounded-full min-h-[48px] px-4 py-2 flex items-center gap-3 bg-white focus-within:border-neutral-400 transition-colors w-full">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                
                <button type="button" className="text-black hover:opacity-60 transition-opacity shrink-0">
                  <Smile size={22} strokeWidth={1.75} />
                </button>
                
                <input
                  type="text"
                  placeholder={selectedImage ? "Add a caption..." : "Message..."}
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  disabled={isSendingImage}
                  className="flex-1 text-sm bg-transparent outline-none text-black placeholder-neutral-400 min-w-0"
                />

                {(typedMessage.trim() || selectedImage) ? (
                  <button type="submit" disabled={isSendingImage} className="text-indigo-600 font-bold text-sm hover:text-black transition-colors px-2 shrink-0">
                    Send
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-black shrink-0">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:opacity-60 transition-opacity">
                      <Image size={22} strokeWidth={1.75} />
                    </button>
                    <button type="button" className="hover:opacity-60 transition-opacity"><Heart size={22} strokeWidth={1.75} /></button>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 p-6 flex flex-col items-center justify-center h-full max-w-sm mx-auto select-none">
            <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center mb-2">
              <MessageCircle size={44} className="text-black" strokeWidth={1.2} />
            </div>
            <h2 className="text-xl font-extrabold text-black tracking-tight">Your messages</h2>
            <p className="text-sm text-neutral-400 leading-normal">
              Send private photos and messages to a friend or group. Select a user from your sidebar inbox network to start chatting instantly.
            </p>
            <button className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors">
              Send message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;