import { useState, useEffect } from "react";
import socket from "../services/socket"; // central socket
import API from "../services/api";
import type { Message } from "../types/message";

export const useChat = (
  chatId: string,
  currentUserId: string,
  receiverId: string
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    // --- Fetch chat history ---
    API.get(`/messages/${chatId}`).then((res) => {
      const history = Array.isArray(res.data) ? res.data.reverse() : [];
      setMessages(history);
    });

    // --- Set session ---
    socket.emit("set_session", { chatId, senderId: currentUserId });

    // --- Request receiver's online status ---
    socket.emit("get_user_status", { userId: receiverId });

    // --- Receive messages ---
    const handleReceiveMessage = (m: Message) => {
      setMessages((prev) => [...prev, m]);
    };

    socket.on("receive_message", handleReceiveMessage);

    // --- Receive online/offline status updates ---
    const handleUserStatus = (data: { userId: string; status: string }) => {
      if (data.userId === receiverId) setIsOnline(data.status === "online");
    };

    socket.on("user_status", handleUserStatus);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_status", handleUserStatus);
    };
  }, [chatId, currentUserId, receiverId]);

  const sendMessage = (content: string, type: "text" | "audio" = "text") => {
    const newMsg: Message = {
      sender_id: currentUserId,
      content,
      type,
      chat_id: chatId,
    };

    socket.emit("message", newMsg);
    setMessages((prev) => [...prev, newMsg]);
  };

  return { messages, isOnline, sendMessage };
};
