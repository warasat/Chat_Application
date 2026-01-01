import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatPage from "../pages/ChatPage";
import { useAuth } from "../context/AuthContext";

const MainLayout = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* Sidebar Container */}
      <div className="w-80 flex flex-col bg-white overflow-visible border-r border-gray-100 shadow-sm z-10">
        <Header />
        <Sidebar onSelectUser={(contactUser) => setSelectedUser(contactUser)} />
      </div>

      {/* Chat Area Container */}
      <div className="flex-1 flex flex-col relative bg-[#f0f2f5]">
        {selectedUser && user ? (
          <ChatPage
            chatId={[user._id, selectedUser._id].sort().join("_")}
            currentUserId={user._id}
            receiver={selectedUser}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-4xl">
              💬
            </div>
            <p className="text-xl font-medium text-gray-600">ChatApp Web</p>
            <p className="text-sm">Select a contact to start a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
