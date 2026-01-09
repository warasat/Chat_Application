import React from "react";
import { ArrowLeft, Plus } from "lucide-react";

interface AITopBarProps {
  onBack: () => void;
  onNewChat: () => void;
}

const AITopBar: React.FC<AITopBarProps> = ({ onBack, onNewChat }) => {
  return (
    <div className="flex items-center p-3 border-b border-gray-200 bg-white gap-2">
      <button
        onClick={onBack}
        className="p-2 rounded-full hover:bg-gray-200 cursor-pointer transition"
      >
        <ArrowLeft size={20} />
      </button>
      <h2 className="flex-1 font-semibold text-gray-800">AI Chat</h2>
      <button
        onClick={onNewChat}
        className="p-2 rounded-full hover:bg-gray-200 cursor-pointer transition"
      >
        <Plus size={20} />
      </button>
    </div>
  );
};

export default AITopBar;
