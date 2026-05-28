import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { NavLink } from "react-router-dom";

import {
  Home,
  Search,
  Film,
  Send,
} from "lucide-react";

import { ShopContext } from "../context/ShopContext";

import axios from "../utils/axiosInstance"


import { io } from "socket.io-client";

const Footer = () => {
  const { userAvatar, backendUrl } =
    useContext(ShopContext);

  const [totalUnread, setTotalUnread] =
    useState(0);

  const socket = useRef(null);

  const token =
    localStorage.getItem("accessToken");

  // FETCH UNREAD
  const fetchUnreadCount = async () => {
    try {
      if (!token) return;

      const res = await axios.get(
        `${backendUrl}/messages/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      setTotalUnread(res.data.count || 0);
    } catch (error) {
      console.log(error);
    }
  };

  // INITIAL FETCH
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // SOCKET
  useEffect(() => {
    if (!token || !backendUrl) return;

    const socketHost =
      backendUrl.replace("/api/v1", "");

    socket.current = io(socketHost, {
      withCredentials: true,
      transports: ["websocket"],
    });

    // JOIN PRIVATE ROOM
    const initializeSocket = async () => {
      try {
        const res = await axios.get(
          `${backendUrl}/users/current-user`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        const userData =
          res.data?.data?.user ||
          res.data?.data;

        if (userData?._id) {
          socket.current.emit(
            "join_private_room",
            userData._id
          );
        }
      } catch (error) {
        console.log(error);
      }
    };

    initializeSocket();

    // REALTIME UNREAD UPDATE
    socket.current.on(
      "new_message_notification",
      () => {
        fetchUnreadCount();
      }
    );

    // WHEN CHAT OPENED
    window.addEventListener(
      "unread_reset",
      fetchUnreadCount
    );

    return () => {
      socket.current?.disconnect();

      window.removeEventListener(
        "unread_reset",
        fetchUnreadCount
      );
    };
  }, [backendUrl]);

  return (
    <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 h-16">
      <nav className="flex justify-around items-center h-full max-w-md mx-auto">
        <NavLink to="/">
          <Home size={26} />
        </NavLink>

        <NavLink to="/reels">
          <Film size={26} />
        </NavLink>

        <NavLink
          to="/messages"
          className="relative"
        >
          <Send size={26} />

          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {totalUnread > 99
                ? "99+"
                : totalUnread}
            </span>
          )}
        </NavLink>

        <NavLink to="/search">
          <Search size={26} />
        </NavLink>

        <NavLink to="/profile">
          <img
            src={
              userAvatar ||
              "https://placehold.co/100x100"
            }
            alt=""
            className="w-7 h-7 rounded-full object-cover"
          />
        </NavLink>
      </nav>
    </footer>
  );
};

export default Footer;