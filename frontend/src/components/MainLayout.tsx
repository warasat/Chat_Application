// MainLayout.tsx
import { useState, useEffect } from "react";
// useLocation ko yahan se hata diya gaya hai warning fix karne ke liye
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatPage from "../pages/ChatPage";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types/user";
import { AI_CONTACT } from "../constants/AIContact";

// ... AI_CONTACT constant same rahega

const MainLayout = () => {
  const { user } = useAuth();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [allContacts, setAllContacts] = useState<User[]>([]);

  const handleContactsLoaded = (contacts: User[]) => {
    setAllContacts(contacts);
  };

  const handleSelectUser = (contactUser: User) => {
    setSelectedUser(contactUser);
    navigate(`/chat/${contactUser._id}`);
  };

  const handleAIChat = () => {
    setSelectedUser(AI_CONTACT);
    navigate(`/chat/${AI_CONTACT._id}`);
  };

  // Logic to restore state on refresh
  useEffect(() => {
    if (chatId) {
      if (chatId === AI_CONTACT._id) {
        setSelectedUser(AI_CONTACT);
      } else if (allContacts.length > 0) {
        const foundUser = allContacts.find((u) => u._id === chatId);
        if (foundUser) setSelectedUser(foundUser);
      }
    }
  }, [chatId, allContacts]);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <div className="w-80 flex flex-col bg-white border-r border-gray-100 shadow-sm z-10">
        <Header />
        <Sidebar
          onSelectUser={handleSelectUser}
          onAIChat={handleAIChat}
          onContactsFetch={handleContactsLoaded}
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
            <p className="text-xl font-medium text-gray-600">ChatApp Web</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
