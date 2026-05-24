import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";

import { io } from "socket.io-client";

import axios from "axios";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { ShopContext } from "../context/ShopContext";

import toast, {
  Toaster,
} from "react-hot-toast";

import {
  Send,
  Smile,
  ArrowLeft,
  Loader2,
  Search,
  SquarePen,
  MessageCircle,
} from "lucide-react";

const Messages = () => {
  const { backendUrl } =
    useContext(ShopContext);

  const location = useLocation();

  const navigate = useNavigate();

  const [currentUser, setCurrentUser] =
    useState(null);

  const [conversations, setConversations] =
    useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [messages, setMessages] = useState(
    []
  );

  const [typedMessage, setTypedMessage] =
    useState("");

  const [loadingChats, setLoadingChats] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState("");

  const socket = useRef(null);

  const messagesEndRef = useRef(null);

  const selectedUserRef = useRef(null);

  const currentUserRef = useRef(null);

  const token =
    localStorage.getItem("accessToken");

  const API_BASE = backendUrl;

  useEffect(() => {
    selectedUserRef.current = selectedUser;

    if (selectedUser?._id) {
      localStorage.setItem(
        "activeChatUserId",
        selectedUser._id
      );
    } else {
      localStorage.removeItem(
        "activeChatUserId"
      );
    }
  }, [selectedUser]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    return () => {
      localStorage.removeItem(
        "activeChatUserId"
      );
    };
  }, []);

  useEffect(() => {
    if (!backendUrl || !token) {
      setLoadingChats(false);
      return;
    }

    const initializeChatSystem =
      async () => {
        try {
          setLoadingChats(true);

          const userRes = await axios.get(
            `${API_BASE}/users/current-user`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            }
          );

          const payload =
            userRes.data.data;

          const userData = payload?.user
            ? payload.user
            : payload;

          setCurrentUser(userData);

          let initialContacts = [];

          try {
            const usersRes = await axios.get(
              `${API_BASE}/users/search`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
              }
            );

            initialContacts = (
              usersRes.data.data || []
            ).map((user) => ({
              ...user,
              lastMessage:
                user.lastMessage || "",
              unreadCount: Number(
                user.unreadCount || 0
              ),
            }));
          } catch (searchErr) {
            console.warn(searchErr);
          }

          if (location.state?.chatTargetUser) {
            const target =
              location.state.chatTargetUser;

            const alreadyExists =
              initialContacts.some(
                (c) =>
                  String(c._id) ===
                  String(target._id)
              );

            if (!alreadyExists) {
              initialContacts = [
                {
                  ...target,
                  lastMessage: "",
                  unreadCount: 0,
                },
                ...initialContacts,
              ];
            }

            setSelectedUser(target);
          }

          setConversations(initialContacts);

          const socketHost =
            backendUrl.replace("/api/v1", "");

          socket.current = io(socketHost, {
            withCredentials: true,
            transports: ["websocket"],
          });

          socket.current.on(
            "connect",
            () => {
              if (userData?._id) {
                socket.current.emit(
                  "join_private_room",
                  userData._id
                );
              }
            }
          );

          socket.current.on(
            "receive_message",
            async (incomingMessage) => {
              const activeUser =
                selectedUserRef.current;

              const myUser =
                currentUserRef.current;

              const senderId =
                incomingMessage.senderId
                  ?._id ||
                incomingMessage.senderId;

              const receiverId =
                incomingMessage.receiverId
                  ?._id ||
                incomingMessage.receiverId;

              const isIncoming =
                String(senderId) !==
                String(myUser?._id);

              const isChatOpen =
                activeUser &&
                (String(senderId) ===
                  String(activeUser._id) ||
                  String(receiverId) ===
                    String(
                      activeUser._id
                    ));

              if (isChatOpen) {
                setMessages((prev) => {
                  if (
                    prev.some(
                      (m) =>
                        m._id ===
                        incomingMessage._id
                    )
                  )
                    return prev;

                  return [
                    ...prev,
                    incomingMessage,
                  ];
                });

                try {
                  await axios.post(
                    `${API_BASE}/messages/mark-as-read/${activeUser._id}`,
                    {},
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                      withCredentials: true,
                    }
                  );

                  window.dispatchEvent(
                    new Event(
                      "unread_reset"
                    )
                  );
                } catch (e) {
                  console.error(e);
                }
              }

              setConversations(
                (prevContacts) => {
                  const senderOrReceiverId =
                    String(senderId) ===
                    String(myUser?._id)
                      ? receiverId
                      : senderId;

                  const index =
                    prevContacts.findIndex(
                      (c) =>
                        String(c._id) ===
                        String(
                          senderOrReceiverId
                        )
                    );

                  let updatedContacts = [
                    ...prevContacts,
                  ];

                  let targetUser;

                  const previewText =
                    incomingMessage.messageText;

                  if (
                    isIncoming &&
                    !isChatOpen
                  ) {
                    toast.custom(
                      (t) => (
                        <div
                          className={`${
                            t.visible
                              ? "animate-enter"
                              : "animate-leave"
                          } max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex border border-neutral-200 overflow-hidden`}
                        >
                          <div className="flex-1 p-4">
                            <div className="flex items-start gap-3">
                              <img
                                src={
                                  incomingMessage
                                    .senderId
                                    ?.avatar ||
                                  "https://placehold.co/100x100"
                                }
                                alt=""
                                className="w-12 h-12 rounded-full object-cover"
                              />

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-black">
                                  {incomingMessage
                                    .senderId
                                    ?.username ||
                                    "New Message"}
                                </p>

                                <p className="text-xs text-neutral-500 mt-1 truncate">
                                  {
                                    incomingMessage.messageText
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={() => {
                                  setSelectedUser(
                                    incomingMessage.senderId
                                  );

                                  toast.dismiss(
                                    t.id
                                  );
                                }}
                                className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg font-semibold"
                              >
                                Open
                              </button>

                              <button
                                onClick={() =>
                                  toast.dismiss(
                                    t.id
                                  )
                                }
                                className="px-3 py-1.5 bg-neutral-100 text-black text-xs rounded-lg font-semibold"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      ),
                      {
                        duration: 5000,
                      }
                    );
                  }

                  if (index !== -1) {
                    const [existingUser] =
                      updatedContacts.splice(
                        index,
                        1
                      );

                    targetUser = {
                      ...existingUser,
                      lastMessage:
                        previewText,
                      unreadCount:
                        isIncoming &&
                        !isChatOpen
                          ? Number(
                              existingUser.unreadCount ||
                                0
                            ) + 1
                          : 0,
                    };
                  } else {
                    targetUser = {
                      ...(incomingMessage.senderId ||
                        {}),
                      _id:
                        senderOrReceiverId,
                      username:
                        incomingMessage
                          .senderId
                          ?.username ||
                        "New User",
                      avatar:
                        incomingMessage
                          .senderId
                          ?.avatar || "",
                      lastMessage:
                        previewText,
                      unreadCount:
                        isIncoming &&
                        !isChatOpen
                          ? 1
                          : 0,
                    };
                  }

                  return [
                    targetUser,
                    ...updatedContacts,
                  ];
                }
              );

              if (
                isIncoming &&
                !isChatOpen
              ) {
                window.dispatchEvent(
                  new Event(
                    "unread_reset"
                  )
                );
              }
            }
          );
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingChats(false);
        }
      };

    initializeChatSystem();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [backendUrl, token, location.state]);

  useEffect(() => {
    if (
      !selectedUser ||
      !currentUser ||
      !token
    )
      return;

    setConversations((prev) =>
      prev.map((c) =>
        String(c._id) ===
        String(selectedUser._id)
          ? {
              ...c,
              unreadCount: 0,
            }
          : c
      )
    );

    const fetchChatHistory =
      async () => {
        try {
          const res = await axios.get(
            `${API_BASE}/messages/history/${selectedUser._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            }
          );

          setMessages(
            res.data.data || []
          );

          await axios.post(
            `${API_BASE}/messages/mark-as-read/${selectedUser._id}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            }
          );

          window.dispatchEvent(
            new Event("unread_reset")
          );
        } catch (err) {
          console.error(err);

          setMessages([]);
        }
      };

    fetchChatHistory();

    if (
      socket.current &&
      socket.current.connected
    ) {
      socket.current.emit(
        "join_chat",
        {
          senderId: currentUser._id,
          receiverId:
            selectedUser._id,
        }
      );
    }
  }, [selectedUser, currentUser, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (
      !typedMessage.trim() ||
      !selectedUser
    )
      return;

    const textPayload =
      typedMessage.trim();

    setTypedMessage("");

    socket.current.emit("send_message", {
      senderId: currentUser._id,
      receiverId: selectedUser._id,
      messageText: textPayload,
    });
  };

  const filteredConversations =
    conversations.filter((user) => {
      const query =
        searchQuery.toLowerCase();

      return (
        user.username
          ?.toLowerCase()
          .includes(query) ||
        user.fullName
          ?.toLowerCase()
          .includes(query)
      );
    });

  if (loadingChats) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden">
      <Toaster position="top-right" />

      <div
        className={`w-full md:w-[390px] border-r border-neutral-200 flex flex-col bg-white ${
          selectedUser
            ? "hidden md:flex"
            : "flex"
        }`}
      >
        <div className="pt-6 px-5 pb-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {currentUser?.username}
            </h2>

            <button>
              <SquarePen size={22} />
            </button>
          </div>

          <div className="relative flex items-center bg-neutral-100 rounded-xl px-3 py-2">
            <Search
              size={16}
              className="absolute left-3.5 text-neutral-400"
            />

            <input
              type="text"
              placeholder="Search user..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              className="w-full bg-transparent text-sm pl-7 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(
            (user) => {
              const hasUnread =
                Number(
                  user.unreadCount
                ) > 0;

              return (
                <div
                  key={user._id}
                  onClick={() =>
                    setSelectedUser(user)
                  }
                  className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-all duration-200 border-b border-neutral-100 hover:bg-neutral-50 ${
                    selectedUser?._id ===
                    user._id
                      ? "bg-neutral-100"
                      : ""
                  }`}
                >
                  <div className="relative">
                    <img
                      src={
                        user.avatar ||
                        "https://placehold.co/100x100"
                      }
                      alt=""
                      className={`w-14 h-14 rounded-full object-cover border-2 ${
                        hasUnread
                          ? "border-blue-500"
                          : "border-transparent"
                      }`}
                    />

                    {hasUnread && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm truncate ${
                          hasUnread
                            ? "font-bold text-black"
                            : "font-medium text-black"
                        }`}
                      >
                        {user.username}
                      </p>

                      {hasUnread && (
                        <span className="text-[10px] text-blue-500 font-bold">
                          NEW
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs truncate mt-1 ${
                        hasUnread
                          ? "text-black font-semibold"
                          : "text-neutral-400"
                      }`}
                    >
                      {user.lastMessage}
                    </p>
                  </div>

                  {hasUnread && (
                    <div className="bg-blue-500 text-white rounded-full min-w-[22px] h-[22px] text-[11px] flex items-center justify-center font-bold shadow-md">
                      {user.unreadCount}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="h-[75px] border-b border-neutral-200 px-6 flex items-center">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden"
                  onClick={() =>
                    setSelectedUser(null)
                  }
                >
                  <ArrowLeft size={22} />
                </button>

                <img
                  src={
                    selectedUser.avatar ||
                    "https://placehold.co/100x100"
                  }
                  alt=""
                  className="w-11 h-11 rounded-full object-cover"
                />

                <div>
                  <h3 className="font-bold">
                    {selectedUser.username}
                  </h3>

                  <p className="text-xs text-neutral-400">
                    Active now
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 pb-28">
              <div className="space-y-4">
                {messages.map(
                  (msg, index) => {
                    const senderId =
                      msg.senderId?._id ||
                      msg.senderId;

                    const isMe =
                      String(senderId) ===
                      String(
                        currentUser?._id
                      );

                    return (
                      <div
                        key={
                          msg._id ||
                          index
                        }
                        className={`flex ${
                          isMe
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            isMe
                              ? "bg-black text-white"
                              : "bg-neutral-100 text-black"
                          }`}
                        >
                          {
                            msg.messageText
                          }

                          <div className="text-[10px] opacity-70 mt-1">
                            {msg.createdAt
                              ? new Date(
                                  msg.createdAt
                                ).toLocaleTimeString(
                                  [],
                                  {
                                    hour:
                                      "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )
                              : ""}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}

                <div
                  ref={messagesEndRef}
                />
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 mb-15 bg-white">
              <form
                onSubmit={
                  handleSendMessage
                }
                className="border border-neutral-200 rounded-full px-4 py-2 flex items-center gap-3"
              >
                <button type="button">
                  <Smile size={22} />
                </button>

                <input
                  type="text"
                  placeholder="Message..."
                  value={typedMessage}
                  onChange={(e) =>
                    setTypedMessage(
                      e.target.value
                    )
                  }
                  className="flex-1 bg-transparent outline-none text-sm"
                />

                <button type="submit">
                  <Send
                    size={22}
                    className="text-blue-500"
                  />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center mb-4">
              <MessageCircle size={44} />
            </div>

            <h2 className="text-xl font-bold">
              Your messages
            </h2>

            <p className="text-sm text-neutral-400 mt-2 max-w-sm">
              Send private photos and
              messages to a friend or
              group.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;