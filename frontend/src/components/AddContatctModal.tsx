import { X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  onAdd: () => void;
  isLoading: boolean;
}

const AddContactModal = ({
  isOpen,
  onClose,
  phoneNumber,
  setPhoneNumber,
  onAdd,
  isLoading,
}: AddContactModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-gray-800 relative shadow-2xl border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-2">New Contact</h2>
        <p className="text-sm text-gray-500 mb-6 font-medium">
          Enter the phone number to add this user to your chat list.
        </p>

        <PhoneInput
          country={"pk"}
          value={phoneNumber}
          onChange={(phone) => setPhoneNumber(phone)}
          inputStyle={{
            width: "100%",
            height: "48px",
            borderRadius: "10px",
          }}
          containerStyle={{ width: "100%" }}
        />

        <button
          onClick={onAdd}
          disabled={isLoading}
          className={`w-full mt-6 py-3 rounded-xl font-bold text-white transition-all ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 cursor-pointer active:scale-95"
          }`}
        >
          {isLoading ? "Adding..." : "Add to Contacts"}
        </button>
      </div>
    </div>
  );
};

export default AddContactModal;
