import { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, Plus } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types/user";
import type { Message } from "../types/message";
import AddContactModal from "../components/AddContatctModal";

interface ChatPageProps {
  chatId: string;
  currentUserId: string;
  receiver: User;
}

const ChatPage = ({ chatId, currentUserId, receiver }: ChatPageProps) => {
  const [input, setInput] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");

  const { addContactAction, authLoading } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Chat Logic Hook
  const { messages, isOnline, sendMessage } = useChat(
    chatId,
    currentUserId,
    receiver._id
  );

  // 2. Voice Recorder Hook
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder(
    (audioUrl) => {
      sendMessage(audioUrl, "audio");
    }
  );

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, "text");
    setInput("");
  };

  const handleAddContact = async () => {
    if (!newContactPhone) return alert("Please enter a phone number");
    const result = await addContactAction(currentUserId, newContactPhone);

    alert(result.message);
    if (result.success) {
      setShowAddContact(false);
      setNewContactPhone("");
      window.location.reload(); // Sidebar ko refresh karne ke liye
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6] relative">
      {/* HEADER SECTION */}
      <div className="p-3 bg-white flex items-center gap-3 border-b shadow-sm z-10">
        <div className="relative">
          <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
            {receiver.username[0].toUpperCase()}
          </div>
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
              isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{receiver.username}</h3>
          <span className="text-[11px] text-gray-500 italic">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} currentUserId={currentUserId} />
        ))}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-3 bg-white flex items-center gap-2 border-t">
        {/* ADD CONTACT (+) BUTTON */}
        <button
          onClick={() => setShowAddContact(true)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
          <Plus size={24} />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isRecording}
          placeholder={isRecording ? "Recording voice..." : "Type a message"}
          className="flex-1 p-2 px-4 bg-gray-100 rounded-full outline-none text-sm"
        />

        {/* Voice Button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className={`p-2 rounded-full transition-all ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "text-purple-600 hover:bg-purple-50"
          }`}
        >
          {isRecording ? <Square size={20} /> : <Mic size={22} />}
        </button>

        <button
          onClick={handleSend}
          className="text-purple-600 p-1 cursor-pointer"
        >
          <Send size={22} />
        </button>
      </div>

      {/* ADD CONTACT MODAL */}
      <AddContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        phoneNumber={newContactPhone}
        setPhoneNumber={setNewContactPhone}
        onAdd={handleAddContact}
        isLoading={authLoading}
      />
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({
  message,
  currentUserId,
}: {
  message: Message;
  currentUserId: string;
}) => {
  const isMe =
    message.sender_id === currentUserId || message.senderId === currentUserId;
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] p-2 px-3 rounded-2xl shadow-sm text-sm ${
          isMe
            ? "bg-purple-600 text-white rounded-tr-none"
            : "bg-white text-gray-800 rounded-tl-none"
        }`}
      >
        {message.type === "audio" ? (
          <audio
            src={message.content}
            controls
            className="w-48 h-10 brightness-95"
          />
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
