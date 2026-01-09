import { useState } from "react";
import { sendAIMessage } from "../services/ai.service";

export interface AIMessage {
  sender: "user" | "ai";
  text: string;
}

export function useAIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [history, setHistory] = useState<
    { id: string; title: string; messages: any[] }[]
  >([]);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text) return;
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setIsSending(true);

    try {
      const aiReply = await sendAIMessage(text, messages);
      setMessages((prev) => [...prev, { sender: "ai", text: aiReply }]);
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    // optionally create new history entry
  };

  return {
    messages,
    sendMessage,
    isSending,
    history,
    startNewChat,
    setHistory,
    setMessages,
  };
}
