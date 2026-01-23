import { useState } from "react";
import { uploadImage } from "../services/uploadImage/message.service";

interface UseSendMessageProps {
  chatId: string;
  receiverId: string;
  sendUserMessage: (text: string, type?: string) => void;
  sendAIMessage: (chatId: string, content: string) => Promise<void>;
  setIsSending: (value: boolean) => void;
}

export const useSendMessage = ({
  chatId,
  receiverId,
  sendUserMessage,
  sendAIMessage,
  setIsSending,
}: UseSendMessageProps) => {
  const [uploading, setUploading] = useState(false);

  const sendMessage = async (
    content: string,
    type: string,
    selectedFile?: File,
  ) => {
    let messageContent = content;

    if (selectedFile) {
      setUploading(true);
      try {
        messageContent = await uploadImage(selectedFile);
      } catch (err) {
        console.error(err);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setIsSending(true);

    try {
      if (receiverId === "bot") {
        await sendAIMessage(chatId, messageContent);
      } else {
        await sendUserMessage(messageContent, selectedFile ? "image" : type);
      }
    } finally {
      setIsSending(false);
    }
  };

  return { sendMessage, uploading, setUploading };
};
