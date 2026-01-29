import React, { useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Phone,
  SignalHigh,
  Monitor,
  MonitorOff,
} from "lucide-react";
import ScreenView from "./ScreenView";

interface InCallScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  onEnd: () => void;
  isCaller?: boolean;
  receiverOnline?: boolean | null;
  incomingCall?: boolean;
  callStatus: "ringing" | "calling" | "connected";

  isSharing: boolean;
  remoteIsSharing: boolean;
  onToggleScreen: () => void;
}

const InCallScreen: React.FC<InCallScreenProps> = ({
  localStream,
  remoteStream,
  callDuration,
  onEnd,
  isCaller = false,
  receiverOnline = null,
  callStatus,
  isSharing,
  remoteIsSharing,
  onToggleScreen,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(false);

  useEffect(() => {
    // Audio elements for WebRTC
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const statusText =
    callStatus === "connected"
      ? `Connected (${formatTime(callDuration)})`
      : isCaller
        ? callStatus === "ringing" || receiverOnline
          ? "Ringing..."
          : "Calling..."
        : "Incoming Call...";

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-6">
      {/* 1. Status Indicator */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <div
          className={`flex items-center gap-2 px-4 py-1 rounded-full bg-gray-800 border ${callStatus === "connected" ? "border-green-500 text-green-500" : "border-blue-500 text-blue-500 animate-pulse"}`}
        >
          <SignalHigh size={16} />
          <span className="text-sm font-medium uppercase tracking-widest">
            {statusText}
          </span>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
        {isSharing || remoteIsSharing ? (
          // Agar koi screen share kar raha hai toh ScreenView dikhao
          <div className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
            <ScreenView
              stream={isSharing ? localStream : remoteStream}
              label={isSharing ? "You are sharing screen" : "Partner's Screen"}
            />
          </div>
        ) : (
          // Normal Audio Call View
          <div className="flex flex-col items-center">
            <div className="w-36 h-36 bg-gray-900 rounded-full flex items-center justify-center border-4 border-gray-800 shadow-[0_0_60px_rgba(59,130,246,0.15)]">
              <Phone
                size={56}
                className={`text-gray-400 ${callStatus === "connected" ? "text-green-500" : "animate-pulse"}`}
              />
            </div>
            {callStatus === "connected" && (
              <div className="mt-4 text-green-500 font-mono text-xs animate-pulse tracking-tighter">
                • SECURE AUDIO ACTIVE
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Hidden Audio Handlers (Zaroori for WebRTC) */}
      <div className="hidden">
        <video ref={remoteVideoRef} autoPlay playsInline />
        <video ref={localVideoRef} autoPlay muted playsInline />
      </div>

      {/* 4. Control Bar */}
      <div className="flex items-center gap-6 mb-10 bg-gray-900/90 px-8 py-5 rounded-full border border-gray-800 shadow-2xl backdrop-blur-sm">
        {/* Mute Button */}
        <button
          onClick={() => setMuted((prev) => !prev)}
          className={`p-4 rounded-full transition-all active:scale-90 ${muted ? "bg-red-500 hover:bg-red-600" : "bg-gray-800 hover:bg-gray-700 cursor-pointer"}`}
        >
          {muted ? (
            <MicOff size={24} className="text-white" />
          ) : (
            <Mic size={24} className="text-white" />
          )}
        </button>

        {/* Screen Share Toggle Button */}
        <button
          onClick={onToggleScreen}
          disabled={callStatus !== "connected"}
          className={`p-4 cursor-pointer rounded-full transition-all active:scale-90 disabled:opacity-20 ${isSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-800 hover:bg-gray-700"}`}
          title={isSharing ? "Stop Sharing" : "Start Sharing"}
        >
          {isSharing ? (
            <MonitorOff size={24} className="text-white" />
          ) : (
            <Monitor size={24} className="text-white" />
          )}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEnd}
          className="bg-red-600 text-white p-4 rounded-full hover:bg-red-700 transition-all shadow-lg hover:rotate-180 active:scale-95 duration-300 cursor-pointer"
        >
          <Phone size={24} className="rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default InCallScreen;
