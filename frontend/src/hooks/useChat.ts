import { useState, useEffect, useRef } from "react";
import socket from "../services/socket";
import API from "../services/api";

export const useChat = (
  chatId: string,
  currentUserId: string,
  receiverId: string,
) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  // 🟢 Refs use kar rahe hain taake socket listener hamesha latest IDs access kare
  const chatIdRef = useRef(chatId);
  const userIdRef = useRef(currentUserId);

  useEffect(() => {
    chatIdRef.current = chatId;
    userIdRef.current = currentUserId;
  }, [chatId, currentUserId]);

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

      console.log("📩 Socket Event Received:", m.type);

      // 🟢 Reference values check kar rahe hain (Strict comparison)
      if (String(incomingChatId) === String(chatIdRef.current)) {
        const callStatusTypes = [
          "missed_call",
          "call_accepted",
          "call_rejected",
        ];

        // Agar dusre ne bheja ho YA phir koi call status event ho
        if (
          incomingSenderId !== userIdRef.current ||
          callStatusTypes.includes(m.type)
        ) {
          setMessages((prev) => {
            // Duplicate check
            const isDuplicate = prev.some(
              (msg) =>
                msg.message_time === m.message_time && msg.type === m.type,
            );

            if (isDuplicate) return prev;

            console.log("✅ Message added to state:", m.type);
            return [...prev, m];
          });
        }
      } else {
        console.warn(
          "🚫 Chat ID mismatch. Expected:",
          chatIdRef.current,
          "Got:",
          incomingChatId,
        );
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
  }, [chatId, currentUserId, receiverId]); // Dependencies correct hain

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

    setMessages((prev) => [...prev, newMsg]);
    socket.emit("message", newMsg);
  };

  return { messages, isOnline, sendMessage };
};
