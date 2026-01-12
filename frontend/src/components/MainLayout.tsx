import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatPage from "../pages/ChatPage";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types/user";

// Static AI contact
const AI_CONTACT: User = {
  _id: "65a1234567890abcdef12345",
  username: "ChatApp_AI",
  phoneNumber: "0000000000",
  isBot: true,
  profilePic:
    "https://cdn.pixabay.com/photo/2023/06/23/02/01/ai-generated-8082571_1280.png",
  isOnline: "string",
};

const MainLayout = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleAIChat = () => setSelectedUser(AI_CONTACT);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <div className="w-80 flex flex-col bg-white overflow-visible border-r border-gray-100 shadow-sm z-10">
        <Header />
        <Sidebar
          onSelectUser={(contactUser) => setSelectedUser(contactUser)}
          onAIChat={handleAIChat}
        />
      </div>

      <div className="flex-1 flex flex-col relative bg-[#f0f2f5]">
        {selectedUser && user ? (
          <ChatPage
            chatId={
              selectedUser.isBot
                ? `ai_${user._id}`
                : [user._id, selectedUser._id].sort().join("_")
            }
            currentUserId={user._id}
            receiver={selectedUser}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-4xl">
              💬
            </div>
            <p className="text-xl font-medium text-gray-600">ChatApp Web</p>
            <p className="text-sm">
              Select a contact or start ChatApp_AI conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
