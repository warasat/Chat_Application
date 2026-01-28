import type { Message } from "../types/message";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { PhoneOff } from "lucide-react"; // PhoneOff icon install karein ya koi aur use karein

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
  // Cassandra returns sender_id
  const isMe = (message.sender_id || message.senderId) === currentUserId;

  // 1️⃣ MISSED CALL UI (Center layout)
  if ((message.type as any) === "missed_call") {
    return (
      <div className="flex justify-center w-full my-4">
        <div className="flex flex-col items-center gap-1">
          <div className="bg-gray-100 border border-gray-200 text-gray-700 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <div
              className={`p-1 rounded-full ${isMe ? "bg-blue-100" : "bg-red-100"}`}
            >
              <PhoneOff
                size={14}
                className={isMe ? "text-blue-600" : "text-red-600"}
              />
            </div>
            <span className="text-xs font-semibold">
              {isMe ? "Outgoing Call (No Answer)" : "Missed Audio Call"}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium italic">
            {new Date(message.message_time || Date.now()).toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" },
            )}
          </span>
        </div>
      </div>
    );
  }

  // 2️⃣ NORMAL MESSAGES UI (Existing Logic)
  const renderContentHtml = () => {
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
            className="prose prose-sm max-w-none text-inherit"
            dangerouslySetInnerHTML={{ __html: renderContentHtml() }}
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
