import type { Message } from "../types/message";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useState } from "react"; // useState add kiya
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
  onJoinGroupCall?: () => void;
  onRejectCall?: () => void;
}

const MessageBubble = ({
  message,
  currentUserId,
  onImageClick,
  onJoinGroupCall,
  onRejectCall,
}: MessageBubbleProps) => {
  // Local state taake buttons foran change ho jayein "Ignored" label mein
  const [isIgnored, setIsIgnored] = useState(false);

  const isMe = (message.sender_id || message.senderId) === currentUserId;
  const messageType = message.type as any;
  const content = message.content || "";

  // 1️⃣ SPECIAL CASE: GROUP CALL INVITE CARD
  const isInvite = content.includes("JOIN CALL:");

  const handleIgnoreAction = () => {
    if (onRejectCall) {
      onRejectCall(); // Yeh ignoreInvite() function ko trigger karega
      setIsIgnored(true); // Local UI ko update karega
    }
  };

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

          {/* Conditional Rendering: Buttons dikhana ya Ignored Status */}
          {!isIgnored ? (
            <div className="flex gap-2 animate-in fade-in duration-300">
              <button
                onClick={onJoinGroupCall}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle size={14} /> Join
              </button>
              <button
                onClick={handleIgnoreAction}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <XCircle size={14} /> Ignore
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 rounded-lg border border-dashed border-gray-200 animate-in zoom-in duration-300">
              <XCircle size={14} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Ignored
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2️⃣ CALL STATUS MESSAGES
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
          // Label logic fix:
          // User C (jisne ignore kiya): "You declined the invite"
          // User A (jisne bheja tha): "Invited user ignored the call"
          label: isMe
            ? "You declined the invite"
            : "Invited user ignored the call",
          icon: <PhoneOff size={14} />,
          colorClass: "text-red-500",
          bgClass: "bg-red-50 border-red-100",
          iconBg: "bg-red-100",
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
