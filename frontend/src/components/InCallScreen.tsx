import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Phone,
  SignalHigh,
  Monitor,
  MonitorOff,
  UserPlus,
  X,
} from "lucide-react";
import ScreenView from "./ScreenView";

interface InCallScreenProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  callDuration: number;
  onEnd: () => void;
  receiverOnline?: boolean | null;
  callStatus: "ringing" | "calling" | "connected";
  isCaller?: boolean;
  isSharing: boolean;
  remoteIsSharing: boolean;
  onToggleScreen: () => void;
  onInvite: (userId: string) => void;
  availableContacts: any[];
}

// ✅ Fixed RemoteAudio: off-screen, autoplay safe
const RemoteAudio = React.memo(({ stream }: { stream: MediaStream }) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const streamIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    if (streamIdRef.current === stream.id) return; // already attached
    streamIdRef.current = stream.id;

    el.srcObject = stream;
    el.volume = 1.0;
    setTimeout(() => {
      el.play().catch((err) => console.warn("Playback blocked:", err.name));
    }, 0);

    const playAudio = async () => {
      try {
        await el.play();
        console.log("🔊 Audio is now flowing for stream:", stream.id);
      } catch (err: any) {
        console.warn(
          "Audio autoplay blocked, will play on user interaction:",
          err.name,
        );
      }
    };

    playAudio();
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
});

const InCallScreen: React.FC<InCallScreenProps> = ({
  localStream,
  remoteStreams,
  callDuration,
  onEnd,
  callStatus,
  isSharing,
  remoteIsSharing,
  onToggleScreen,
  onInvite,
  availableContacts,
  receiverOnline,
}) => {
  const [muted, setMuted] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
        console.log(`🎤 Mic Track: ${track.label} | Enabled: ${track.enabled}`);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 bg-[#0B0E11] z-50 flex flex-col items-center justify-between p-6">
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center max-w-5xl z-20">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <SignalHigh size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
              Encrypted Call
            </span>
          </div>
          <h2 className="text-white text-2xl font-mono font-bold">
            {callStatus === "connected"
              ? formatTime(callDuration)
              : "CALLING..."}
          </h2>
        </div>

        {callStatus === "connected" && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all active:scale-90"
          >
            <UserPlus size={24} />
          </button>
        )}
      </div>

      {/* Center Content */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
        {!remoteIsSharing ? (
          <div className="relative">
            {callStatus !== "connected" && (
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping scale-125 blur-xl" />
            )}
            <div
              className={`w-44 h-44 rounded-full flex items-center justify-center border-4 shadow-2xl transition-all duration-500 ${
                callStatus === "connected"
                  ? "bg-green-600/10 border-green-500 shadow-green-500/20"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <Phone
                size={70}
                className={`${
                  callStatus === "connected"
                    ? "text-green-500"
                    : "text-gray-600 animate-pulse"
                }`}
              />
              {receiverOnline && (
                <div
                  className="absolute top-4 right-4 w-5 h-5 bg-green-500 rounded-full border-4 border-[#0B0E11] z-20 shadow-lg"
                  title="User is Online"
                />
              )}
            </div>
            <div
              className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                callStatus === "connected"
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {callStatus === "connected"
                ? "Active"
                : receiverOnline
                  ? "Ringing..."
                  : "Calling..."}
            </div>
          </div>
        ) : (
          <div className="w-full h-full max-w-4xl p-4">
            {Object.values(remoteStreams)[0] && (
              <ScreenView
                stream={Object.values(remoteStreams)[0]}
                label="Participant's Screen"
              />
            )}
          </div>
        )}

        {/* ✅ Off-screen Remote Audio */}
        <div
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {Object.entries(remoteStreams).map(([userId, stream]) => (
            <RemoteAudio key={userId} stream={stream} />
          ))}

          <video
            ref={(el) => {
              if (el && localStream && el.srcObject !== localStream) {
                el.srcObject = localStream;
              }
            }}
            autoPlay
            muted
            playsInline
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center gap-6 mb-10 bg-[#16191D]/90 px-8 py-5 rounded-2rem border border-white/5 shadow-2xl backdrop-blur-xl z-40">
        <button
          onClick={toggleMute}
          className={`p-5 rounded-2xl transition-all ${
            muted
              ? "bg-red-500 text-white"
              : "bg-white/5 text-gray-400 hover:text-white cursor-pointer"
          }`}
        >
          {muted ? <MicOff size={26} /> : <Mic size={26} />}
        </button>

        <button
          onClick={onToggleScreen}
          disabled={callStatus !== "connected"}
          className={`p-5 rounded-2xl transition-all ${
            isSharing
              ? "bg-blue-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white cursor-pointer"
          } disabled:opacity-10`}
        >
          {isSharing ? <MonitorOff size={26} /> : <Monitor size={26} />}
        </button>

        <button
          onClick={onEnd}
          className="bg-red-600 text-white p-5 rounded-2xl hover:bg-red-500 hover:rotate-180 cursor-pointer transition-all duration-500 shadow-xl active:scale-95"
        >
          <Phone size={28} className="rotate-180 " />
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm `z-[70]` flex justify-end">
          <div className="bg-[#0B0E11] w-full max-w-sm h-full border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white text-xl font-bold">Add Participant</h3>
              <X
                className="text-gray-500 cursor-pointer"
                onClick={() => setShowInviteModal(false)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {availableContacts.map((contact) => (
                <div
                  key={contact._id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {contact.username[0].toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-medium">
                      {contact.username}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onInvite(contact._id);
                      setShowInviteModal(false);
                    }}
                    className="bg-blue-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg uppercase tracking-widest"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InCallScreen;
