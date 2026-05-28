import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";

import { io } from "socket.io-client";

import axios from "axios";

import { useLocation } from "react-router-dom";

import { ShopContext } from "../context/ShopContext";

import toast, { Toaster } from "react-hot-toast";

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

  const token =
    localStorage.getItem("accessToken");

  const API_BASE = backendUrl;

  const socket = useRef(null);

  const messagesEndRef = useRef(null);

  const selectedUserRef = useRef(null);

  const currentUserRef = useRef(null);

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

  // -----------------------------
  // refs sync
  // -----------------------------

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // -----------------------------
  // auto scroll
  // -----------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // -----------------------------
  // initialize
  // -----------------------------

  useEffect(() => {
    if (!backendUrl || !token) {
      setLoadingChats(false);
      return;
    }

    const initialize = async () => {
      try {
        setLoadingChats(true);

        // CURRENT USER
        const userRes = await axios.get(
          `${API_BASE}/users/current-user`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        const userData =
          userRes.data?.data?.user ||
          userRes.data?.data;

        setCurrentUser(userData);

        // USERS
        const usersRes = await axios.get(
          `${API_BASE}/users/search`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        let contacts = (
          usersRes.data.data || []
        ).map((user) => ({
          ...user,

          unreadCount: Number(
            user.unreadCount || 0
          ),

          lastMessage:
            user.lastMessage || "",

          lastMessageTime:
            user.lastMessageTime || null,
        }));

        // ROUTE TARGET USER
        if (location.state?.chatTargetUser) {
          const target =
            location.state.chatTargetUser;

          const exists = contacts.some(
            (u) =>
              String(u._id) ===
              String(target._id)
          );

          if (!exists) {
            contacts.unshift({
              ...target,
              unreadCount: 0,
              lastMessage: "",
              lastMessageTime: null,
            });
          }

          setSelectedUser(target);
        }

        setConversations(contacts);

        // SOCKET
        const socketHost =
          backendUrl.replace("/api/v1", "");

        socket.current = io(socketHost, {
          withCredentials: true,
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 5,
        });

        socket.current.on(
          "connect",
          () => {
            console.log(
              "Socket Connected"
            );

            socket.current.emit(
              "join_private_room",
              userData._id
            );
          }
        );

        // RECEIVE MESSAGE
        socket.current.on(
          "receive_message",
          async (incomingMessage) => {
            const activeUser =
              selectedUserRef.current;

            const current =
              currentUserRef.current;

            const senderId =
              incomingMessage.senderId
                ?._id ||
              incomingMessage.senderId;

            const receiverId =
              incomingMessage.receiverId
                ?._id ||
              incomingMessage.receiverId;

            const isMe =
              String(senderId) ===
              String(current?._id);

            const isChatOpen =
              activeUser &&
              (String(senderId) ===
                String(activeUser._id) ||
                String(receiverId) ===
                  String(
                    activeUser._id
                  ));

            // prevent duplicates
            setMessages((prev) => {
              const exists = prev.some(
                (m) =>
                  m._id ===
                  incomingMessage._id
              );

              if (exists) return prev;

              if (isChatOpen) {
                return [
                  ...prev,
                  incomingMessage,
                ];
              }

              return prev;
            });

            // UPDATE CONVERSATIONS
            setConversations((prev) => {
              const targetId = isMe
                ? receiverId
                : senderId;

              const existingIndex =
                prev.findIndex(
                  (c) =>
                    String(c._id) ===
                    String(targetId)
                );

              let updated = [...prev];

              // SAFE USER DATA
              const senderUser =
                typeof incomingMessage.senderId ===
                "object"
                  ? incomingMessage.senderId
                  : {};

              const receiverUser =
                typeof incomingMessage.receiverId ===
                "object"
                  ? incomingMessage.receiverId
                  : {};

              let targetUser;

              if (
                existingIndex !== -1
              ) {
                const old =
                  updated.splice(
                    existingIndex,
                    1
                  )[0];

                targetUser = {
                  ...old,

                  // latest message
                  lastMessage:
                    incomingMessage.messageText,

                  // latest message time
                  lastMessageTime:
                    incomingMessage.createdAt,

                  // latest avatar
                  avatar:
                    isMe
                      ? receiverUser.avatar ||
                        old.avatar
                      : senderUser.avatar ||
                        old.avatar,

                  // latest username
                  username:
                    isMe
                      ? receiverUser.username ||
                        old.username
                      : senderUser.username ||
                        old.username,

                  // unread count
                  unreadCount:
                    !isMe &&
                    !isChatOpen
                      ? Number(
                          old.unreadCount ||
                            0
                        ) + 1
                      : 0,
                };
              } else {
                targetUser = {
                  _id: targetId,

                  username:
                    isMe
                      ? receiverUser.username ||
                        "User"
                      : senderUser.username ||
                        "User",

                  avatar:
                    isMe
                      ? receiverUser.avatar ||
                        ""
                      : senderUser.avatar ||
                        "",

                  fullName:
                    isMe
                      ? receiverUser.fullName ||
                        ""
                      : senderUser.fullName ||
                        "",

                  lastMessage:
                    incomingMessage.messageText,

                  lastMessageTime:
                    incomingMessage.createdAt,

                  unreadCount:
                    !isMe &&
                    !isChatOpen
                      ? 1
                      : 0,
                };
              }

              return [
                targetUser,
                ...updated,
              ];
            });

            // TOAST
            if (
              !isMe &&
              !isChatOpen
            ) {
              toast.success(
                `${incomingMessage.senderId.username}: ${incomingMessage.messageText}`
              );
            }
          }
        );
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingChats(false);
      }
    };

    initialize();

    return () => {
      if (socket.current) {
        socket.current.off(
          "receive_message"
        );

        socket.current.disconnect();
      }
    };
  }, [backendUrl, token]);

  // -----------------------------
  // fetch messages
  // -----------------------------

  const fetchMessages = useCallback(
    async () => {
      if (
        !selectedUser ||
        !token ||
        !currentUser
      )
        return;

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

        // MARK READ
        await axios.patch(
          `${API_BASE}/messages/mark-as-read/${selectedUser._id}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        // RESET FOOTER COUNT
        window.dispatchEvent(
          new Event("unread_reset")
        );

        // RESET SIDEBAR UNREAD
        setConversations((prev) =>
          prev.map((c) =>
            String(c._id) ===
            String(selectedUser._id)
              ? {
                  ...c,
                  unreadCount: 0,
                  lastMessageTime:
                    c.lastMessageTime ||
                    new Date(),
                }
              : c
          )
        );

        // JOIN ROOM
        socket.current.emit(
          "join_chat",
          {
            senderId:
              currentUser._id,
            receiverId:
              selectedUser._id,
          }
        );
      } catch (error) {
        console.log(error);
      }
    },
    [
      selectedUser,
      token,
      currentUser,
    ]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // -----------------------------
  // send message
  // -----------------------------

  const handleSendMessage = async (
    e
  ) => {
    e.preventDefault();

    if (
      !typedMessage.trim() ||
      !selectedUser
    )
      return;

    const text =
      typedMessage.trim();

    setTypedMessage("");

    socket.current.emit(
      "send_message",
      {
        senderId:
          currentUser._id,
        receiverId:
          selectedUser._id,
        messageText: text,
      }
    );
  };

  // -----------------------------
  // search
  // -----------------------------

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
      <div className="h-screen flex justify-center items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      <Toaster />

      {/* SIDEBAR */}
      <div className="w-full md:w-[380px] border-r overflow-y-auto">
        {/* HEADER */}
        <div className="p-5">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-xl">
              {
                currentUser?.username
              }
            </h2>

            <SquarePen />
          </div>

          <div className="mt-4 relative">
            <Search
              size={16}
              className="absolute top-3 left-3 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              className="w-full bg-gray-100 rounded-xl py-2 pl-10 outline-none"
            />
          </div>
        </div>

        {/* USERS */}
        {filteredConversations.map(
          (user) => (
            <div
              key={user._id}
              onClick={() =>
                setSelectedUser(user)
              }
              className={`flex items-center gap-3 p-4 hover:bg-gray-100 cursor-pointer border-b transition ${
                selectedUser?._id ===
                user._id
                  ? "bg-gray-100"
                  : ""
              }`}
            >
              <img
                src={
                  user.avatar ||
                  "https://placehold.co/100x100"
                }
                alt=""
                className="w-14 h-14 rounded-full object-cover"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={`truncate ${
                      user.unreadCount >
                      0
                        ? "font-bold text-black"
                        : "font-semibold text-gray-800"
                    }`}
                  >
                    {
                      user.username
                    }
                  </h3>

                  {user.lastMessageTime && (
                    <span className="text-[11px] text-gray-400 ml-2 whitespace-nowrap">
                      {new Date(
                        user.lastMessageTime
                      ).toLocaleTimeString(
                        [],
                        {
                          hour:
                            "2-digit",
                          minute:
                            "2-digit",
                        }
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1 gap-2">
                  <p
                    className={`text-sm truncate ${
                      user.unreadCount >
                      0
                        ? "text-black font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {user.lastMessage ||
                      "No messages yet"}
                  </p>

                  {user.unreadCount >
                    0 && (
                    <div className="min-w-[22px] h-[22px] px-1 rounded-full bg-green-500 text-white text-[11px] flex items-center justify-center font-bold">
                      {
                        user.unreadCount
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* HEADER */}
            <div className="h-[70px] border-b flex items-center px-5">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden"
                  onClick={() =>
                    setSelectedUser(
                      null
                    )
                  }
                >
                  <ArrowLeft />
                </button>

                <img
                  src={
                    selectedUser.avatar ||
                    "https://placehold.co/100x100"
                  }
                  alt=""
                  className="w-10 h-10 rounded-full"
                />

                <h3 className="font-bold">
                  {
                    selectedUser.username
                  }
                </h3>
              </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map(
                (msg) => {
                  const senderId =
                    msg.senderId
                      ?._id ||
                    msg.senderId;

                  const isMe =
                    String(
                      senderId
                    ) ===
                    String(
                      currentUser?._id
                    );

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${
                        isMe
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-[70%] ${
                          isMe
                            ? "bg-black text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        {
                          msg.messageText
                        }

                        <div className="text-[10px] opacity-70 mt-1 text-right">
                          {new Date(
                            msg.createdAt
                          ).toLocaleTimeString(
                            [],
                            {
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>

            {/* INPUT */}
            <form
              onSubmit={
                handleSendMessage
              }
              className="border-t p-4 flex gap-3 mb-20"
            >
              <button type="button">
                <Smile />
              </button>

              <input
                type="text"
                placeholder="Message..."
                value={
                  typedMessage
                }
                onChange={(e) =>
                  setTypedMessage(
                    e.target.value
                  )
                }
                className="flex-1 outline-none"
              />

              <button type="submit">
                <Send className="text-blue-500" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-center">
              <MessageCircle
                size={60}
                className="mx-auto"
              />

              <h2 className="text-2xl font-bold mt-4">
                Your Messages
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;