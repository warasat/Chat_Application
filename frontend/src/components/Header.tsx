import { useState } from "react";
import { MoreVertical, LogOut, UserPlus, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AddContactModal from "../components/AddContatctModal";
import { useNotifications } from "../hooks/useNotifications";
import { PiTrashLight } from "react-icons/pi";

const Header = () => {
  const { logout, user, addContactAction, authLoading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markOneAsRead,
    deleteNotification,
  } = useNotifications(user?._id);
  const handleAddContact = async () => {
    if (!newContactPhone) return alert("Please enter a phone number");
    if (!user?._id) return;

    const result = await addContactAction(user._id, newContactPhone);
    alert(result.message);

    if (result.success) {
      setShowAddContact(false);
      setNewContactPhone("");
      window.location.reload();
    }
  };

  return (
    <div className="p-4 bg-black text-white flex justify-between items-center relative shadow-md z-30">
      {/* Left: App Name */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-bold text-lg leading-none truncate">ChatApp</span>
        <span className="text-[10px] text-blue-200 truncate">
          logged in: {user?.username}
          <br />
          {user?.phoneNumber}
        </span>
      </div>

      {/* 🔔 Notification Bell */}
      <div className="relative mr-4">
        <button
          onClick={() => {
            const nextState = !showNotifications;
            setShowNotifications(nextState);
            if (nextState) markAllAsRead(); // ✅ mark as read when opened
          }}
          className="relative p-2 hover:bg-gray-800 rounded-full cursor-pointer"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-5px py-1px">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <>
            {/* Background overlay (for click outside) */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            ></div>

            {/* Properly positioned dropdown */}
            <div
              className="absolute left-0 mt-3 w-72 max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50"
              style={{
                top: "100%",
                transform: "translateY(8px)",
              }}
            >
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No notifications yet
                </p>
              ) : (
                notifications.map((notif) => {
                  return (
                    <div
                      key={notif._id}
                      onClick={() => markOneAsRead(notif._id)}
                      className={`group px-4 py-2 border-b border-gray-100 flex items-start gap-3 cursor-pointer ${
                        notif.isRead
                          ? "bg-gray-50"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {/* 🟣 Avatar with first letter only */}
                      <div className="shrink-0 w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold text-sm uppercase">
                        {notif.senderId?.username?.[0] || "?"}
                      </div>

                      {/* Notification text area */}
                      <div className="flex-1">
                        <p className="text-gray-800 text-sm font-semibold">
                          {notif.senderName}
                        </p>
                        <p className="text-gray-600 text-xs">{notif.message}</p>
                        <p className="text-gray-400 text-[10px] mt-1">
                          {new Date(notif.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* 🗑️ Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 cursor-pointer"
                        title="Delete notification"
                      >
                        <PiTrashLight />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* More Menu */}
      <div className="relative ml-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-gray-800 rounded-full cursor-pointer"
        >
          <MoreVertical size={20} />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowMenu(false)}
            ></div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-2xl py-1 z-50 border border-gray-200">
              <button
                onClick={() => {
                  setShowAddContact(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-gray-700 cursor-pointer hover:bg-gray-100 flex items-center gap-2"
              >
                <UserPlus size={18} className="text-blue-500" />
                <span className="text-sm font-semibold">Add Contact</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 cursor-pointer text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-t"
              >
                <LogOut size={18} className="text-red-500" />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add Contact Modal */}
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

export default Header;
