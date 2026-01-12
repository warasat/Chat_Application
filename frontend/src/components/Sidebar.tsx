import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../hooks/useUser";
import type { User } from "../types/user";
import AddContactModal from "./AddContatctModal";
import socket from "../services/socket";
import FloatButton from "./FloatButton";
import { AI_CONTACT } from "../constants/AIContact";

interface SidebarProps {
  onSelectUser: (user: User) => void;
  onAIChat: () => void;
}

const Sidebar = ({ onSelectUser, onAIChat }: SidebarProps) => {
  const { user: loginUser, addContactAction, authLoading } = useAuth();
  const { users, loading, setUsers } = useUsers(loginUser?._id);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Listen for when someone adds you
  useEffect(() => {
    if (!loginUser?._id) return;

    socket.on("new_contact_added", (newContact: User) => {
      setUsers((prev) => {
        const exists = prev.find((u) => u._id === newContact._id);
        if (exists) return prev;
        return [newContact, ...prev];
      });
    });

    return () => {
      socket.off("new_contact_added");
    };
  }, [loginUser?._id, setUsers]);

  // Listen for incoming messages to update unread counts
  useEffect(() => {
    if (!loginUser?._id) return;

    socket.on("receive_message", (data) => {
      const senderId = data.sender_id;
      if (senderId !== activeId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [activeId, loginUser?._id]);

  // Handle user select
  const handleSelectUser = (u: User) => {
    onSelectUser(u);
    setActiveId(u._id);
    setUnreadCounts((prev) => ({ ...prev, [u._id]: 0 }));
  };

  // Merge AI contact with users
  const allContacts = [AI_CONTACT, ...(users || [])];

  // Filter contacts by search term
  const filteredContacts = allContacts.filter((u) => {
    const term = searchTerm.toLowerCase();
    const usernameMatch = u.username.toLowerCase().includes(term);
    const phoneMatch = u.phoneNumber?.includes(term);
    return usernameMatch || phoneMatch;
  });

  if (loading) return <div className="p-4">Loading chats...</div>;

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-white border-r">
      {/* SEARCH BAR */}
      <div className="p-2 border-b bg-gray-50">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Users List Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((u) => (
              <div
                key={u._id}
                onClick={() => handleSelectUser(u)}
                className={`relative w-full flex items-center px-4 py-3 gap-3 cursor-pointer transition-all border-b border-gray-50
                  ${activeId === u._id ? "bg-gray-200" : "hover:bg-gray-50"}`}
              >
                <div className="relative">
                  {u.profilePic ? (
                    <img
                      src={u.profilePic}
                      alt={u.username}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      {u.username ? u.username[0].toUpperCase() : "?"}
                    </div>
                  )}

                  {/* 🔴 Unread badge (skip for AI) */}
                  {!u.isBot && unreadCounts[u._id] > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {unreadCounts[u._id]}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {u.username}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {u.isBot ? "AI Assistant" : u.phoneNumber}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              No contacts found.
            </div>
          )}
        </div>
      </div>

      {/* Floating Button */}
      <FloatButton
        onAddContact={() => setShowModal(true)}
        onAIChat={onAIChat}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        phoneNumber={newPhone}
        setPhoneNumber={setNewPhone}
        onAdd={async () => {
          if (!loginUser?._id || !newPhone) return;
          const res = await addContactAction(loginUser._id, newPhone);

          if (res.success && res.contact) {
            setUsers((prev) => {
              const exists = prev.find((u) => u._id === res.contact?._id);
              if (exists) return prev;
              return [res.contact!, ...prev];
            });
            setShowModal(false);
            setNewPhone("");
          } else {
            alert(res.message);
          }
        }}
        isLoading={authLoading}
      />
    </div>
  );
};

export default Sidebar;
