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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
        {/* Animated Icon Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
          <div className="bg-green-100 p-5 rounded-full relative">
            <Phone size={32} className="text-green-600 animate-bounce" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">Incoming Call</h2>
          <p className="text-gray-500 font-medium mt-1">{callerPhoneNumber}</p>
        </div>

        {/* Dynamic Status Text */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-500"} animate-pulse`}
          />
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            {isOnline ? "Ringing..." : "Connecting..."}
          </p>
        </div>

        <div className="flex w-full gap-4 mt-2">
          <button
            onClick={onReject}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 transition-all duration-200 font-semibold cursor-pointer border border-gray-200"
          >
            <X size={18} /> Reject
          </button>

          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 hover:shadow-lg hover:shadow-green-200 transition-all duration-200 font-semibold cursor-pointer"
          >
            <Phone size={18} /> Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
