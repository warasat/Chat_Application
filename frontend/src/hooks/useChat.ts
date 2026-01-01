import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import API from "../services/api";
import type { Message } from "../types/message";

export const useChat = (
  chatId: string,
  currentUserId: string,
  receiverId: string
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    const socket = socketRef.current;

    // Fetch History
    API.get(`/messages/${chatId}`).then((res) =>
      setMessages(res.data.reverse())
    );

    socket.emit("set_session", { chatId, senderId: currentUserId });

    socket.on("receive_message", (m: Message) => {
      if (m.sender_id !== currentUserId) setMessages((prev) => [...prev, m]);
    });

    socket.on("user_status", (data) => {
      if (data.userId === receiverId) setIsOnline(data.status === "online");
    });

    return () => {
      socket.disconnect();
    };
  }, [chatId, currentUserId, receiverId]);

  const sendMessage = (content: string, type: "text" | "audio") => {
    const newMsg: Message = { sender_id: currentUserId, content, type };
    socketRef.current?.emit("message", newMsg);
    setMessages((prev) => [...prev, newMsg]);
  };

  return { messages, isOnline, sendMessage };
};
