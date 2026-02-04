import type { Message } from "../types/message";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  PhoneOff,
  PhoneIncoming,
  PhoneMissed,
  UserPlus,
  XCircle,
  CheckCircle,
} from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  onImageClick?: (url: string) => void;
  onJoinGroupCall?: () => void; // Naya Prop
  onRejectCall?: () => void; // Naya Prop
}

const MessageBubble = ({
  message,
  currentUserId,
  onImageClick,
  onJoinGroupCall,
  onRejectCall,
}: MessageBubbleProps) => {
  const isMe = (message.sender_id || message.senderId) === currentUserId;
  const messageType = message.type as any;
  const content = message.content || "";

  // 1️⃣ SPECIAL CASE: GROUP CALL INVITE CARD
  // Hum check kar rahe hain agar content mein hamara specific invite keyword hai
  const isInvite = content.includes("JOIN CALL:");

  if (isInvite && !isMe) {
    return (
      <div className="flex justify-start mb-4">
        <div className="bg-white border-2 border-purple-100 rounded-2xl p-4 shadow-md max-w-280px">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
              <UserPlus size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">
                Group Call Invite
              </p>
              <p className="text-[11px] text-gray-500 italic">
                Ongoing Session
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            You have been invited to join an ongoing audio call.
          </p>

          <div className="flex gap-2">
            <button
              onClick={onJoinGroupCall}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <CheckCircle size={14} /> Join
            </button>
            <button
              onClick={onRejectCall}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <XCircle size={14} /> Ignore
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2️⃣ CALL STATUS MESSAGES (Existing Logic)
  const callTypes = ["missed_call", "call_accepted", "call_rejected"];
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
          icon: <PhoneMissed size={14} />,
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

  // 3️⃣ NORMAL MESSAGES UI
  const renderContentHtml = () => {
    const rawHtml = marked.parse(message.content || "");
    return DOMPurify.sanitize(rawHtml as string);
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${isMe ? "bg-purple-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none"}`}
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
