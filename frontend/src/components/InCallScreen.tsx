import React, { useRef, useEffect } from "react";
import { Mic, MicOff, Phone } from "lucide-react";

interface InCallScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number; // ✅ new prop
  onEnd: () => void;
  isCaller?: boolean; // ✅ optional: if this user is the caller
  receiverOnline?: boolean; // ✅ optional: track receiver online/offline
  incomingCall?: boolean; // ✅ optional: true if this user is receiving
}

const InCallScreen: React.FC<InCallScreenProps> = ({
  localStream,
  remoteStream,
  callDuration,
  onEnd,
  isCaller = false,
  receiverOnline = false,
  incomingCall = false,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(false);

  // Attach streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <>
      {/* Remote + Local Stream */}
      <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center gap-4 p-4">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full max-w-md rounded-lg shadow-lg bg-black"
        />
        {localStream && (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-24 h-24 rounded-full border-2 border-white absolute top-6 right-6"
          />
        )}

        {/* Call Duration */}
        <div className="text-white font-mono text-lg mt-2">
          {formatTime(callDuration)}
        </div>

        {/* Controls */}
        <div className="flex gap-6 mt-6">
          <button
            onClick={() => setMuted((prev) => !prev)}
            className="bg-gray-700 text-white p-3 rounded-full hover:bg-gray-800 transition"
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            onClick={onEnd}
            className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition"
          >
            <Phone size={20} />
          </button>
        </div>
      </div>

      {/* 🔹 Caller-side "Calling" popup if receiver hasn't picked up */}
      {isCaller && !incomingCall && (
        <div className="fixed bottom-4 right-4 bg-gray-100 p-3 rounded-xl shadow-lg flex flex-col items-center gap-2 z-50">
          <p className="text-sm font-medium">
            Calling {receiverOnline ? "📞 (Ringing)" : "⌛ (Offline)"}...
          </p>
          <button
            onClick={onEnd}
            className="bg-red-500 text-white px-3 py-1 rounded-full"
          >
            End Call
          </button>
        </div>
      )}
    </>
  );
};

export default InCallScreen;
