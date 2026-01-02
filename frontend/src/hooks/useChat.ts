import { useState, useEffect } from "react";
import socket from "../services/socket"; // Central socket use karein
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

    // History Fetch karein
    API.get(`/messages/${chatId}`).then(
      (res) => setMessages(res.data) // reverse() backend handle kare toh behtar hai
    );

    // Session set karein
    socket.emit("set_session", { chatId, senderId: currentUserId });

    // Message receive listener
    const handleReceiveMessage = (m: Message) => {
      // Sirf isi chat ke message add karein
      setMessages((prev) => [...prev, m]);
    };

    socket.on("receive_message", handleReceiveMessage);

    socket.on("user_status", (data) => {
      if (data.userId === receiverId) setIsOnline(data.status === "online");
    });

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_status");
    };
  }, [chatId, currentUserId, receiverId]);

  const sendMessage = (content: string, type: "text" | "audio" = "text") => {
    const newMsg: Message = {
      sender_id: currentUserId,
      content,
      type,
      chat_id: chatId, // chatId lazmi bhejein taake backend ko pata chale kis room mein bhejna hai
    };

    socket.emit("message", newMsg);
    setMessages((prev) => [...prev, newMsg]);
  };

  return { messages, isOnline, sendMessage };
};
