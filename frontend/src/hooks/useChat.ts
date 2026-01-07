import { useState, useEffect } from "react";
import socket from "../services/socket";
import API from "../services/api";

export const useChat = (
  chatId: string,
  currentUserId: string,
  receiverId: string
) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    // 1. Fetch Chat History from Database
    API.get(`/messages/${chatId}`).then((res) => {
      const history = Array.isArray(res.data) ? res.data.reverse() : [];
      setMessages(history);
    });

    // 2. Setup Socket Session
    socket.emit("set_session", { chat_id: chatId, sender_id: currentUserId });
    socket.emit("get_user_status", { userId: receiverId });

    // 3. Listen for Incoming Messages
    const handleReceiveMessage = (m: any) => {
      const incomingChatId = m.chat_id || m.chatId;
      const incomingSenderId = m.sender_id || m.senderId;

      // Only update if it belongs to THIS chat window
      if (incomingChatId === chatId) {
        if (incomingSenderId !== currentUserId) {
          setMessages((prev) => [...prev, m]);
        }
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    // 4. Listen for User Status
    const handleStatus = (data: any) => {
      if (data.userId === receiverId) {
        setIsOnline(data.status === "online");
      }
    };

    socket.on("user_status", handleStatus);

    // 5. Cleanup on Unmount
    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_status", handleStatus);
    };
  }, [chatId, currentUserId, receiverId]);

  // Function to send a message
  const sendMessage = (content: string, type: string = "text") => {
    if (!content.trim()) return;

    const newMsg = {
      chat_id: chatId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      content,
      type,
      message_time: new Date().toISOString(),
    };

    // Add to UI immediately for a snappy feel
    setMessages((prev) => [...prev, newMsg]);

    // Emit to backend
    socket.emit("message", newMsg);
  };

  return { messages, isOnline, sendMessage };
};
