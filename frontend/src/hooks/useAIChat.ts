import { useState } from "react";
import { sendAIMessage } from "../services/ai.service";

export interface AIMessage {
  sender: "user" | "ai";
  text: string;
}

type AIChatsMap = Record<string, AIMessage[]>;

export function useAIChat() {
  const [chats, setChats] = useState<AIChatsMap>({});
  const [isSending, setIsSending] = useState(false);

  // Function to load history from database
  const setMessages = (chatId: string, messages: AIMessage[]) => {
    setChats((prev) => ({
      ...prev,
      [chatId]: messages,
    }));
  };

  const sendMessage = async (chatId: string, text: string) => {
    if (!text) return;

    const userMessage: AIMessage = { sender: "user", text };

    setChats((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), userMessage],
    }));

    setIsSending(true);

    try {
      // Backend handles history now, but we pass current state for consistency
      const aiReply = await sendAIMessage(text, chats[chatId] || []);

      const aiMessage: AIMessage = { sender: "ai", text: aiReply };

      setChats((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), aiMessage],
      }));
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const getMessages = (chatId: string) => chats[chatId] || [];

  return { sendMessage, getMessages, isSending, setMessages };
}
