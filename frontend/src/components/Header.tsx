import { useState } from "react";
import { MoreVertical, LogOut, UserPlus, Bell, Camera } from "lucide-react";
import { PiTrashLight } from "react-icons/pi";
import { useAuth } from "../context/AuthContext";
import AddContactModal from "../components/AddContatctModal";
import { useNotifications } from "../hooks/useNotifications";
import { uploadProfilePicture } from "../services/user/uploadProfile.service";

const Header = () => {
  const { logout, user, addContactAction, authLoading, updateUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [uploading, setUploading] = useState(false);

  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markOneAsRead,
    deleteNotification,
  } = useNotifications(user?._id);

  // 🟢 Upload new profile picture
  const handleProfileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user?._id) return;

    try {
      setUploading(true);
      const data = await uploadProfilePicture(file);

      if (data.url) {
        updateUser && updateUser({ ...user, profilePic: data.url });
        alert("Profile updated successfully!");
      } else {
        alert("Image upload failed");
      }
    } catch (err) {
      console.error("Profile upload error:", err);
      alert("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  // 🟣 Add new contact (still uses AuthContext logic)
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
      {/* LEFT — App name and user info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* 🖼️ Profile avatar */}
        <div className="relative group">
          {user?.profilePic ? (
            <img
              src={user.profilePic}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
          ) : (
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-white uppercase">
              {user?.username?.[0] || "?"}
            </div>
          )}

          <label
            htmlFor="profile-upload"
            className="absolute bottom-0 right-0 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            title="Change Profile Picture"
          >
            <Camera size={12} />
          </label>
          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfileUpload}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="font-bold text-lg leading-none truncate">
            ChatApp
          </span>
          <span className="text-[10px] text-blue-200 truncate">
            logged in: {user?.username}
            <br />
            {user?.phoneNumber}
          </span>
        </div>
      </div>

      {/* 🔔 Notifications */}
      <div className="relative mr-4">
        <button
          onClick={() => {
            const next = !showNotifications;
            setShowNotifications(next);
            if (next) markAllAsRead();
          }}
          className="relative p-2 hover:bg-gray-800 rounded-full cursor-pointer"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute left-0 mt-3 w-72 max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No notifications yet
                </p>
              ) : (
                notifications.map((notif) => {
                  const sender = notif.sender;
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
                      <div className="shrink-0 w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold text-sm uppercase">
                        {sender?.profilePic ? (
                          <img
                            src={sender.profilePic}
                            alt={sender.username || "?"}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          sender?.username?.[0]?.toUpperCase() || "?"
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-gray-600 text-xs">{notif.message}</p>
                        <p className="text-gray-400 text-[10px] mt-1">
                          {new Date(notif.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
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

      {/* ⋮ More Menu */}
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
            />
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
        isLoading={authLoading || uploading}
      />
    </div>
  );
};

export default Header;
