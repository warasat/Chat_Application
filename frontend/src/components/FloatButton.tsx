import { useState } from "react";
import { Plus, UserPlus, Bot, Mic, Square } from "lucide-react";
// Package ke mutabiq sahi hook use karein (useVoiceContext ya useVoiceControl)
import { useVoiceContext } from "react-voice-action-router";

interface ExpandableFABProps {
  onAddContact: () => void;
  onAIChat: () => void;
}

const FloatButton = ({ onAddContact, onAIChat }: ExpandableFABProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isListening, startListening, stopListening } = useVoiceContext();

  return (
    <div className="fixed bottom-6 left-64 flex flex-col items-end gap-4 z-999">
      {/* 1. UNIVERSAL MIC BUTTON (Hamesha display hoga) */}
      <div className="relative group">
        {isListening && (
          <span className="absolute -left-24 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-md animate-pulse">
            Listening...
          </span>
        )}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${
            isListening
              ? "bg-red-500 text-white animate-pulse ring-4 ring-red-200"
              : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
          }`}
        >
          {isListening ? <Square size={24} /> : <Mic size={24} />}
        </button>
      </div>

      {/* 2. EXPANDABLE ACTIONS (Plus Button Logic) */}
      <div className="flex flex-col items-end gap-3">
        {/* Sub Buttons */}
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-1 slide-in-from-bottom-4 duration-300">
            {/* Add New Contact */}
            <div className="flex items-center gap-3 group">
              <span className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Add New Contact
              </span>
              <button
                onClick={() => {
                  onAddContact();
                  setIsOpen(false);
                }}
                className="w-11 h-11 bg-white text-blue-600 rounded-full shadow-md flex items-center justify-center hover:bg-blue-50 transition-colors border border-gray-100"
              >
                <UserPlus size={20} />
              </button>
            </div>

            {/* AI Chat Button */}
            <div className="flex items-center gap-3 group">
              <span className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                ChatApp_AI
              </span>
              <button
                onClick={() => {
                  onAIChat();
                  setIsOpen(false);
                }}
                className="w-11 h-11 bg-white text-purple-600 rounded-full shadow-md flex items-center justify-center hover:bg-purple-50 transition-colors border border-gray-100"
              >
                <Bot size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Main Toggle (Plus Button) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 shadow-xl flex items-center justify-center rounded-full transition-all duration-300 transform ${
            isOpen ? "bg-gray-700 rotate-45" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Plus size={28} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default FloatButton;
