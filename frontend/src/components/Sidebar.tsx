import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../hooks/useUser";
import type { User } from "../types/user";
import { Plus } from "lucide-react";
import AddContactModal from "./AddContatctModal";
import socket from "../services/socket";

interface SidebarProps {
  onSelectUser: (user: User) => void;
}

const Sidebar = ({ onSelectUser }: SidebarProps) => {
  const { user: loginUser, addContactAction, authLoading } = useAuth();
  const { users, loading, setUsers } = useUsers(loginUser?._id);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

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

  //  Listen for incoming messages to update unread counts
  useEffect(() => {
    if (!loginUser?._id) return;

    socket.on("receive_message", (data) => {
      const senderId = data.senderId;
      // Increment only if the message is not from the active chat
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

  // When a user is selected, reset unread count
  const handleSelectUser = (u: User) => {
    onSelectUser(u);
    setActiveId(u._id);
    setUnreadCounts((prev) => ({ ...prev, [u._id]: 0 }));
  };

  const handleAddNewContact = async () => {
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
  };

  if (loading) return <div className="p-4">Loading chats...</div>;

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-white border-r">
      {/* Users List Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {users.length > 0 ? (
            users.map((u) => (
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

                  {/* 🔴 Unread badge */}
                  {unreadCounts[u._id] > 0 && (
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
                    {u.phoneNumber}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              No contacts yet. Click the + button to add.
            </div>
          )}
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setShowModal(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all cursor-pointer z-50 group"
      >
        <Plus
          size={28}
          className="group-hover:rotate-90 transition-transform duration-300"
        />
        <span className="absolute right-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Add New Contact
        </span>
      </button>

      {/* Modal */}
      <AddContactModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        phoneNumber={newPhone}
        setPhoneNumber={setNewPhone}
        onAdd={handleAddNewContact}
        isLoading={authLoading}
      />
    </div>
  );
};

export default Sidebar;
