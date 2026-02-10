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
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
          <div className="flex flex-col items-center gap-12 w-full max-w-4xl">
            {/* 1. Main Caller Area (Center) */}
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
                  ? "Active Session"
                  : receiverOnline
                    ? "Ringing..."
                    : "Calling..."}
              </div>
            </div>

            {/* 🚀 2. Group Participants Grid (Naye log yahan dikhenge) */}
            {Object.keys(remoteStreams).length > 0 && (
              <div className="flex flex-wrap justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {Object.entries(remoteStreams).map(([userId], index) => (
                  <div
                    key={userId}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-20 h-20 rounded-2xl  from-indigo-600 to-purple-700 flex items-center justify-center text-white border-2 border-white/10 shadow-xl group-hover:scale-110 transition-transform">
                      <span className="text-xl font-bold font-mono">
                        {/* Participant index dikhayega, aap baad mein naam bhi map kar sakte hain */}
                        P{index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        Connected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Screen Sharing Logic (Same as before) */
          <div className="w-full h-full max-w-4xl p-4">
            {Object.values(remoteStreams)[0] && (
              <ScreenView
                stream={Object.values(remoteStreams)[0]}
                label="Participant's Screen"
              />
            )}
          </div>
        )}

        {/* ✅ Audio & Local Video (Hidden) - Unchanged but kept for structure */}
        <div className="hidden pointer-events-none invisible">
          {Object.entries(remoteStreams).map(([userId, stream]) => (
            /* 🔥 FIX: Key mein userId ke saath stream.id bhi lagayein unique banane ke liye */
            <RemoteAudio key={`${userId}-${stream.id}`} stream={stream} />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-70 flex justify-end">
          <div className="bg-[#0B0E11] w-full max-w-sm h-full border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white text-xl font-bold">Add Participant</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchTerm(""); // Modal band hote hi search clear kar dein
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* 🔍 Search Input Section */}
            <div className="px-6 py-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {availableContacts
                .filter((contact) =>
                  contact.username
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()),
                )
                .map((contact) => {
                  const isInvited = invitedUsers.includes(contact._id);

                  return (
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
                        disabled={isInvited}
                        onClick={() => {
                          onInvite(contact._id);
                          setInvitedUsers((prev) => [...prev, contact._id]);
                        }}
                        className={`text-[10px] font-bold px-4 py-2 rounded-lg uppercase tracking-widest transition-all cursor-pointer active:scale-95 ${
                          isInvited
                            ? "bg-green-600/20 text-green-500 border border-green-500/50 cursor-default"
                            : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                        }`}
                      >
                        {isInvited ? "Invited" : "Invite"}
                      </button>
                    </div>
                  );
                })}

              {/* Empty State: Agar koi match na mile */}
              {availableContacts.filter((c) =>
                c.username.toLowerCase().includes(searchTerm.toLowerCase()),
              ).length === 0 && (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No contacts found for "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InCallScreen;
