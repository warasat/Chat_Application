import React, { useRef, useEffect } from "react";
import { Mic, MicOff, Phone, SignalHigh } from "lucide-react";

interface InCallScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  onEnd: () => void;
  isCaller?: boolean;
  receiverOnline?: boolean | null;
  incomingCall?: boolean;
  callStatus: "ringing" | "calling" | "connected";
}

const InCallScreen: React.FC<InCallScreenProps> = ({
  localStream,
  remoteStream,
  callDuration,
  onEnd,
  isCaller = false,
  receiverOnline = null,
  incomingCall = false,
  callStatus,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(false);

  useEffect(() => {
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

  const getCallStatusText = (): string => {
    if (callStatus === "connected" || remoteStream) {
      return `Connected (${formatTime(callDuration)})`;
    }

    if (isCaller) {
      if (callStatus === "ringing" || receiverOnline === true) {
        return "Ringing...";
      }

      if (callStatus === "calling") {
        return "Calling...";
      }

      return "Connecting...";
    }

    if (incomingCall) return "Incoming Call...";

    return "Connecting...";
  };

  const statusText = getCallStatusText();

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center gap-6 p-4 text-center">
      {/* Visual Indicator for Status */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center bg-gray-800 border-2 ${callStatus === "connected" ? "border-green-500" : "border-blue-500 animate-pulse"}`}
        >
          <SignalHigh className="text-white" size={32} />
        </div>

        <div className="text-white text-2xl font-bold tracking-wide">
          {statusText}
        </div>
      </div>

      {/* Hidden Audio Elements */}
      <div className="hidden">
        {remoteStream && <video ref={remoteVideoRef} autoPlay playsInline />}
        {localStream && (
          <video ref={localVideoRef} autoPlay muted playsInline />
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-700 shadow-2xl">
          <Phone
            size={48}
            className={`text-gray-400 ${callStatus === "connected" ? "text-green-500" : "animate-pulse"}`}
          />
        </div>
        {callStatus === "connected" && (
          <div className="mt-4 text-green-500 font-mono animate-pulse">
            Audio Live
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-8 mt-10">
        <button
          onClick={() => setMuted((prev) => !prev)}
          className={`p-4 rounded-full transition-all ${muted ? "bg-red-500" : "bg-gray-700 hover:bg-gray-600 cursor-pointer"}`}
        >
          {muted ? (
            <MicOff size={24} className="text-white" />
          ) : (
            <Mic size={24} className="text-white" />
          )}
        </button>

        <button
          onClick={() => onEnd()}
          className="bg-red-600 text-white p-4 rounded-full hover:bg-red-700 transition-all shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
        >
          <Phone size={24} className="rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default InCallScreen;
