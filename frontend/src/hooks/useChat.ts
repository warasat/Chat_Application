import { useState, useEffect } from "react";
import socket from "../services/socket";
import API from "../services/api";
import type { Message } from "../types/message";

export const useChat = (
  chatId: string,
  currentUserId: string,
  receiverId: string
  // senderId: string
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    // Fetch chat history
    API.get(`/messages/${chatId}`).then((res) => {
      const history = Array.isArray(res.data) ? res.data.reverse() : [];
      // console.log("_____________history: ", history);
      setMessages(history);
    });

    // Socket: session & status
    socket.emit("set_session", { chatId, senderId: currentUserId });
    socket.emit("get_user_status", { userId: receiverId });

    // Receive messages
    const handleReceiveMessage = (m: Message) => {
      // Only add messages that belong to this chat
      if (m.chat_id === chatId) {
        setMessages((prev) => [...prev, m]);
      }
    };
    socket.on("receive_message", handleReceiveMessage);

    // Receive online/offline status
    const handleUserStatus = (data: { userId: string; status: string }) => {
      if (data.userId === receiverId) setIsOnline(data.status === "online");
    };
    socket.on("user_status", handleUserStatus);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_status", handleUserStatus);
    };
  }, [chatId, currentUserId, receiverId]);

  const sendMessage = (
    content: string,
    type: "text" | "audio" | "image" = "text"
  ) => {
    const newMsg: Message = {
      sender_id: currentUserId,
      content,
      receiverId,
      type,
      chat_id: chatId,
    };
    socket.emit("message", newMsg);
    setMessages((prev) => [...prev, newMsg]);
  };

  return { messages, isOnline, sendMessage };
};
