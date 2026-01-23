import { useEffect } from "react";

interface UseFetchAIHistoryProps {
  isBot: boolean;
  currentUserId: string;
  chatId: string;
  setAIMessages: (chatId: string, messages: any[]) => void;
}

export const useFetchAIHistory = ({
  isBot,
  currentUserId,
  chatId,
  setAIMessages,
}: UseFetchAIHistoryProps) => {
  useEffect(() => {
    if (!isBot) return;

    const fetchAIHistory = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/ai/${currentUserId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const data = await res.json();
        if (data.messages) {
          let formattedMessages = data.messages.map((m: any) => ({
            sender: m.sender_id === currentUserId ? "user" : "ai",
            text: m.content,
            time: m.message_time, // Timestamp store karein sorting ke liye
          }));

          formattedMessages.sort(
            (a: any, b: any) =>
              new Date(a.time).getTime() - new Date(b.time).getTime(),
          );

          setAIMessages(chatId, formattedMessages);
        }
      } catch (err) {
        console.error("Failed to fetch AI history:", err);
      }
    };

    fetchAIHistory();
  }, [isBot, currentUserId, chatId, setAIMessages]);
};
