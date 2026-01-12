import type { Message } from "../types/message";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  onImageClick?: (url: string) => void;
}

const MessageBubble = ({
  message,
  currentUserId,
  onImageClick,
}: MessageBubbleProps) => {
  const isMe =
    message.sender_id === currentUserId || message.senderId === currentUserId;

  const renderContentHtml = () =>
    DOMPurify.sanitize(marked.parse(message.content || ""));

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] p-2 px-3 rounded-2xl shadow-sm text-sm ${
          isMe
            ? "bg-purple-600 text-white rounded-tr-none"
            : "bg-white text-gray-800 rounded-tl-none"
        }`}
      >
        {message.type === "audio" ? (
          <audio
            src={message.content}
            controls
            className="w-48 h-10 brightness-95"
          />
        ) : message.type === "image" ? (
          <img
            src={message.content}
            alt="sent"
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => onImageClick?.(message.content)}
          />
        ) : (
          <p dangerouslySetInnerHTML={{ __html: renderContentHtml() }} />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
