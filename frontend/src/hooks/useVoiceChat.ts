import { useVoiceRecorder } from "./useVoiceRecorder";
import type { User } from "../types/user";

interface UseVoiceChatProps {
  receiver: User;
  chatId: string;
  sendAIMessage: (chatId: string, content: string) => Promise<void>;
  sendUserMessage: (content: string, type?: string) => void | Promise<void>;
  setIsSending: (value: boolean) => void;
  messages: any[];
  getMessages: (chatId: string) => any[];
}

export const useVoiceChat = ({
  receiver,
  chatId,
  sendAIMessage,
  sendUserMessage,
  setIsSending,
  messages,
  getMessages,
}: UseVoiceChatProps) => {
  // decide which messages to show
  const chatMessages = receiver.isBot ? getMessages(chatId) : messages;

  // voice recording logic
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder(
    async (audioUrl) => {
      try {
        setIsSending(true);
        if (receiver.isBot) await sendAIMessage(chatId, audioUrl);
        else await sendUserMessage(audioUrl, "audio");
      } finally {
        setIsSending(false);
      }
    },
  );

  return { chatMessages, isRecording, startRecording, stopRecording };
};
