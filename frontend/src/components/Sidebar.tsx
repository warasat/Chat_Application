import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../hooks/useUser";
import type { User } from "../types/user";

interface SidebarProps {
  onSelectUser: (user: User) => void;
}

const Sidebar = ({ onSelectUser }: SidebarProps) => {
  const { user: loginUser } = useAuth();
  const { users, loading } = useUsers(loginUser?._id); // Custom Hook use kiya
  const [activeId, setActiveId] = useState<string | null>(null);

  if (loading) return <div className="p-4 text-gray-500">Loading chats...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="flex flex-col">
        {users.map((u) => (
          <div
            key={u._id}
            onClick={() => {
              onSelectUser(u);
              setActiveId(u._id);
            }}
            className={`w-full flex items-center px-4 py-3 gap-3 cursor-pointer transition-all border-b border-gray-50
              ${activeId === u._id ? "bg-gray-100" : "hover:bg-gray-50"}`}
          >
            {/* Avatar Section */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {u.username[0].toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {u.username}
              </h3>
              <p className="text-xs text-gray-500 truncate">{u.phoneNumber}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
