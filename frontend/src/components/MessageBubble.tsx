import type { Message } from "../types/message";
import { marked } from "marked";
import DOMPurify from "dompurify";
// 🟢 FIX: PhoneX ko remove kiya aur PhoneMissed use kiya
import { PhoneOff, PhoneIncoming, PhoneMissed } from "lucide-react";

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
  const isMe = (message.sender_id || message.senderId) === currentUserId;

  // 1️⃣ CALL STATUS MESSAGES
  const callTypes = ["missed_call", "call_accepted", "call_rejected"];

  // 🟢 FIX: 'as any' use karke type comparison error khatam kiya
  // (Jab tak aap types/message.ts update nahi karte)
  const messageType = message.type as any;

  if (callTypes.includes(messageType)) {
    let config = {
      label: "",
      icon: <PhoneOff size={14} />,
      colorClass: "text-gray-600",
      bgClass: "bg-gray-100",
      iconBg: "bg-gray-200",
    };

    switch (messageType) {
      case "missed_call":
        config = {
          label: isMe ? "Outgoing Call (No Answer)" : "Missed Audio Call",
          icon: <PhoneMissed size={14} />, // 🟢 FIX: PhoneX ki jagah PhoneMissed
          colorClass: "text-red-600",
          bgClass: "bg-red-50 border-red-100",
          iconBg: "bg-red-100",
        };
        break;
      case "call_accepted":
        config = {
          label: isMe ? "Call Answered" : "Incoming Call (Answered)",
          icon: <PhoneIncoming size={14} />,
          colorClass: "text-green-600",
          bgClass: "bg-green-50 border-green-100",
          iconBg: "bg-green-100",
        };
        break;
      case "call_rejected":
        config = {
          label: isMe ? "Call Declined" : "Call Rejected",
          icon: <PhoneOff size={14} />,
          colorClass: "text-gray-600",
          bgClass: "bg-gray-50 border-gray-200",
          iconBg: "bg-gray-200",
        };
        break;
    }

    return (
      <div className="flex justify-center w-full my-4">
        <div className="flex flex-col items-center gap-1">
          <div
            className={`${config.bgClass} border ${config.colorClass} px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm`}
          >
            <div className={`p-1 rounded-full ${config.iconBg}`}>
              {config.icon}
            </div>
            <span className="text-xs font-semibold">{config.label}</span>
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
