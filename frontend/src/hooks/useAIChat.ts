// hooks/useAIChat.ts
import { useState } from "react";
import { sendAIMessage } from "../services/ai.service";

export interface AIMessage {
  sender: "user" | "ai";
  text: string;
}

type AIChatsMap = Record<string, AIMessage[]>; // chatId => messages

export function useAIChat() {
  const [chats, setChats] = useState<AIChatsMap>({});
  const [isSending, setIsSending] = useState(false);

  // send AI message for a specific chatId
  const sendMessage = async (chatId: string, text: string) => {
    if (!text) return;

    // add user message
    setChats((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), { sender: "user", text }],
    }));

    setIsSending(true);

    try {
      const aiReply = await sendAIMessage(text, chats[chatId] || []);
      setChats((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), { sender: "ai", text: aiReply }],
      }));
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const getMessages = (chatId: string) => {
    return chats[chatId] || [];
  };

  const startNewChat = (chatId: string) => {
    setChats((prev) => ({ ...prev, [chatId]: [] }));
  };

  return { sendMessage, getMessages, startNewChat, isSending };
}
