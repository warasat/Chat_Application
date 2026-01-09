import React from "react";

interface AIMessageBubbleProps {
  sender: "user" | "ai";
  text: string;
}

const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ sender, text }) => {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`max-w-[70%] p-3 rounded-xl wrap-break-word ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-200 text-gray-800 rounded-bl-none"
        }`}
      >
        {text}
      </div>
    </div>
  );
};

export default AIMessageBubble;
