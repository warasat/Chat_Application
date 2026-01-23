import { useEffect } from "react";

interface UseVoiceSendListenerProps {
  chatId: string;
  receiver: any;
  sendAIMessage: (chatId: string, text: string) => Promise<void>;
  sendUserMessage: (text: string, type?: string) => void;
  setIsSending: (value: boolean) => void;
}

export const useVoiceSendListener = ({
  chatId,
  receiver,
  sendAIMessage,
  sendUserMessage,
  setIsSending,
}: UseVoiceSendListenerProps) => {
  useEffect(() => {
    const handleVoiceSend = async (event: any) => {
      const voiceText = event.detail;
      if (!voiceText) return;

      console.log("🚀 ChatPage received voice text:", voiceText);

      setIsSending(true);
      try {
        if (receiver.isBot) {
          await sendAIMessage(chatId, voiceText);
        } else {
          await sendUserMessage(voiceText, "text");
        }
      } catch (err) {
        console.error("Voice send failed:", err);
      } finally {
        setIsSending(false);
      }
    };

    // Add and remove event listener
    window.addEventListener("voice-send-message", handleVoiceSend);
    return () => {
      window.removeEventListener("voice-send-message", handleVoiceSend);
    };
  }, [chatId, receiver, sendAIMessage, sendUserMessage, setIsSending]);
};
