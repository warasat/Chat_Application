import { useState } from "react";
import { MoreVertical, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "react-phone-input-2/lib/style.css";
import AddContactModal from "../components/AddContatctModal";

const Header = () => {
  const { logout, user, addContactAction, authLoading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");

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
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-bold text-lg leading-none truncate">ChatApp</span>
        <span className="text-[10px] text-blue-200 truncate">
          logged in: {user?.username}
        </span>
      </div>

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

export default Header;
