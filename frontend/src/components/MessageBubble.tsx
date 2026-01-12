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
  // Cassandra returns sender_id, local AI state might use senderId
  const isMe = (message.sender_id || message.senderId) === currentUserId;

  const renderContentHtml = () => {
    // Markdown formatting for AI responses
    const rawHtml = marked.parse(message.content || "");
    return DOMPurify.sanitize(rawHtml as string);
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${
          isMe
            ? "bg-purple-600 text-white rounded-tr-none"
            : "bg-white text-gray-800 rounded-tl-none"
        }`}
      >
        {message.type === "audio" ? (
          <audio src={message.content} controls className="w-48 h-10" />
        ) : message.type === "image" ? (
          <img
            src={message.content}
            className="max-w-xs rounded-lg cursor-pointer"
            onClick={() => onImageClick?.(message.content)}
            alt=""
          />
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderContentHtml() }}
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
