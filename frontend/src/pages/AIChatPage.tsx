import React, { useRef, useEffect } from "react";
import { useAIChat } from "../hooks/useAIChat";
import AISidebar from "../components/AI/AISidebar";
import AIMessageBubble from "../components/AI/AIMessageBubble";
import AIInput from "../components/AI/AIInput";
import AITopBar from "../components/AI/AITopBar";

const AIChatPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { messages, sendMessage, isSending, history, startNewChat } =
    useAIChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <AISidebar
          history={history}
          onSelect={(id) => console.log("Select history", id)}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <AITopBar onBack={onBack} onNewChat={startNewChat} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, idx) => (
            <AIMessageBubble key={idx} sender={msg.sender} text={msg.text} />
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Input Box */}
        <AIInput onSend={sendMessage} isSending={isSending} />
      </div>
    </div>
  );
};

export default AIChatPage;
