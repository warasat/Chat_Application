import React, { useState } from "react";
import { Send } from "lucide-react";

interface AIInputProps {
  onSend: (text: string) => void;
  isSending: boolean;
}

const AIInput: React.FC<AIInputProps> = ({ onSend, isSending }) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="p-3 bg-white flex items-center gap-2 border-t">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder={isSending ? "Sending..." : "Type a message..."}
        className="flex-1 p-2 px-4 border border-gray-300 rounded-full outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={handleSend}
        disabled={isSending}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-all"
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default AIInput;
