import React from "react";
import { X, Phone } from "lucide-react";

interface CallModalProps {
  callerPhoneNumber: string;
  isOnline?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const CallModal: React.FC<CallModalProps> = ({
  callerPhoneNumber,
  isOnline,
  onAccept,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-80 flex flex-col items-center gap-4">
        <h2 className="text-lg font-semibold">Incoming Call</h2>
        <p className="text-sm text-gray-600">From: {callerPhoneNumber}</p>
        <p className="text-xs text-gray-500 italic">
          {isOnline ? "Ringing..." : "Calling..."}
        </p>

        <div className="flex gap-6 mt-4">
          <button
            onClick={onAccept}
            className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-green-600 transition"
          >
            <Phone size={16} /> Accept
          </button>
          <button
            onClick={onReject}
            className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-red-600 transition"
          >
            <X size={16} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
