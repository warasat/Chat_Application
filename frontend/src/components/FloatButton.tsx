import { useState } from "react";
import { Plus, UserPlus, Bot } from "lucide-react";

interface ExpandableFABProps {
  onAddContact: () => void;
  onAIChat: () => void;
}

const FloatButton = ({ onAddContact, onAIChat }: ExpandableFABProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {/* Sub Buttons - Only show when isOpen is true */}
      {isOpen && (
        <div className="flex flex-col items-end gap-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Add New Contact Button */}
          <div className="flex items-center gap-3 group">
            <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Add New Contact
            </span>
            <button
              onClick={() => {
                onAddContact();
                setIsOpen(false);
              }}
              className="w-12 h-12 bg-white text-blue-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-gray-100"
            >
              <UserPlus size={22} />
            </button>
          </div>

          {/* ChatApp_AI Button */}
          <div className="flex items-center gap-3 group">
            <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ChatApp_AI
            </span>
            <button
              onClick={() => {
                onAIChat();
                setIsOpen(false);
              }}
              className="w-12 h-12 bg-white text-purple-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-gray-100"
            >
              <Bot size={22} />
            </button>
          </div>
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 shadow-xl flex items-center justify-center rounded-full transition-all cursor-pointer transform ${
          isOpen ? "bg-red-500 rotate-45" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        <Plus size={28} className="text-white" />
      </button>
    </div>
  );
};

export default FloatButton;
