import { useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useWebRTC } from "./useWebRTC";
import { useCallTimer } from "./useCallTimer";
import { useCallSocket } from "./useCallSocket";
import { useScreenShare } from "../useScreenShare";

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  transports: ["websocket"],
  extraHeaders: { "ngrok-skip-browser-warning": "true" },
});

export const useAudioCall = ({
  currentUserId,
  chatId,
  phoneNumber,
  receiverId,
  currentUserName,
}: any) => {
  const [inCall, setInCall] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "ringing" | "calling" | "connected"
  >("calling");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [receiverOnline, setReceiverOnline] = useState<boolean | null>(null);
  const [remoteIsSharing, setRemoteIsSharing] = useState(false);

  const {
    peersRef,
    localStream,
    remoteStreams,
    initPeer,
    removePeer,
    closeAllConnections,
    getLocalMedia,
  } = useWebRTC();

  const { duration, startTimer, stopTimer } = useCallTimer();

  const primaryPeer = Array.from(peersRef.current.values())[0] || null;
  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare(
    primaryPeer,
    socket,
    chatId,
  );

  // --- 🔁 ICE Candidate Buffer ---
  const candidateBufferRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );

  // Flush buffered ICE candidates after setting remote description
  const flushCandidateBuffer = useCallback(async (peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) return;
    const buffered = candidateBufferRef.current.get(peerId) || [];
    if (buffered.length === 0) return;
    console.log(
      `🔁 Flushing ${buffered.length} buffered ICE candidates for ${peerId}`,
    );
    for (const c of buffered) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn("Failed to add buffered ICE candidate:", err);
      }
    }
    candidateBufferRef.current.delete(peerId);
  }, []);

  // 1️⃣ Invite user
  const inviteUser = useCallback(
    (targetUserId: string) => {
      socket.emit("invite-to-call", {
        chatId,
        invitedUserId: targetUserId,
        fromName: currentUserName || "A User",
      });
    },
    [chatId, currentUserName],
  );

  // 2️⃣ Join group call
  const joinGroupCall = useCallback(async () => {
    socket.emit("join-call-room", { chatId });
    setInCall(true);
    setCallStatus("connected");
    startTimer();
  }, [chatId, startTimer]);

  // 3️⃣ Reject call
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      socket.emit("reject-call", {
        chatId,
        to: incomingCall.from,
        from: currentUserId,
      });
    }
    setIncomingCall(null);
    setInCall(false);
  }, [incomingCall, chatId, currentUserId]);

  // 4️⃣ End call
  const endCall = useCallback(
    (notify = true) => {
      if (notify) {
        socket.emit("end-call", { chatId, from: currentUserId, receiverId });
      }
      if (isSharing) stopScreenShare();
      closeAllConnections();
      stopTimer();
      setInCall(false);
      setIncomingCall(null);
      setIsCaller(false);
      setRemoteIsSharing(false);
      setCallStatus("calling");
    },
    [
      chatId,
      currentUserId,
      receiverId,
      isSharing,
      stopScreenShare,
      closeAllConnections,
      stopTimer,
    ],
  );

  // 5️⃣ Start Call (Caller)
  const startCall = async () => {
    setIsCaller(true);
    setInCall(true);

    // ✅ Ensure mic is initialized before offer
    await getLocalMedia();

    const peer = await initPeer(receiverId, (candidate) => {
      socket.emit("ice-candidate", {
        chatId,
        candidate,
        from: currentUserId,
        toUserId: receiverId,
      });
    });

    // ✅ Create Offer immediately (no setTimeout race)
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    console.log("Generated SDP Offer:", offer.sdp);
    await peer.setLocalDescription(offer);

    socket.emit("call-user", {
      chatId,
      from: currentUserId,
      receiverId,
      offer,
      phoneNumber,
    });
  };

  // 6️⃣ Accept Call (Receiver)
  const acceptCall = async () => {
    if (!incomingCall) return;
    setIsCaller(false);

    await getLocalMedia();

    const peer = await initPeer(incomingCall.from, (candidate) => {
      socket.emit("ice-candidate", {
        chatId,
        candidate,
        from: currentUserId,
        toUserId: incomingCall.from,
      });
    });

    await peer.setRemoteDescription(
      new RTCSessionDescription(incomingCall.offer),
    );
    await flushCandidateBuffer(incomingCall.from);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("answer-call", {
      chatId,
      answer,
      from: incomingCall.from,
      receiverId: currentUserId,
    });

    setIncomingCall(null);
    setInCall(true);
    setCallStatus("connected");
    startTimer();
  };

  // --- Socket Events ---
  useCallSocket(
    socket,
    {
      onIncoming: (data: any) => {
        if (data.from !== currentUserId) {
          setIncomingCall(data);
          setCallStatus("ringing");
        }
      },

      // 🧩 When call answered
      onAnswered: async ({ answer, from }: any) => {
        const targetId = from || receiverId;
        const peer = peersRef.current.get(targetId);
        if (peer && answer) {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
          await flushCandidateBuffer(targetId);
          setCallStatus("connected");
          setInCall(true);
          startTimer();
        }
      },

      onRejected: () => {
        endCall(false);
        alert("Call rejected");
      },

      // 🧊 Handle ICE candidate (buffer before remoteDescription is ready)
      onIce: async ({ candidate, from }: any) => {
        if (from === currentUserId) return;
        const peer = peersRef.current.get(from);
        if (
          peer &&
          candidate &&
          peer.remoteDescription &&
          peer.remoteDescription.type
        ) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ ICE Candidate added for", from);
          } catch (err) {
            console.warn("Failed to add ICE candidate immediately:", err);
          }
          return;
        }

        const buf = candidateBufferRef.current.get(from) ?? [];
        buf.push(candidate);
        candidateBufferRef.current.set(from, buf);
        console.log("🧾 Buffered ICE candidate for", from);
      },

      onStatus: ({ isOnline }: any) => {
        setReceiverOnline(isOnline);
        if (!inCall) setCallStatus(isOnline ? "ringing" : "calling");
      },

      onEnded: ({ from }: any) => {
        if (from && peersRef.current.size > 1) {
          removePeer(from);
        } else {
          endCall(false);
        }
      },

      onInviteReceived: (data: any) => {
        setIncomingCall({ ...data, isInvite: true });
      },

      onUserJoinedGroup: async ({ userId }: any) => {
        const peer = await initPeer(userId, (candidate) => {
          socket.emit("ice-candidate", {
            chatId,
            candidate,
            from: currentUserId,
            toUserId: userId,
          });
        });
        const offer = await peer.createOffer({ offerToReceiveAudio: true });
        await peer.setLocalDescription(offer);
        socket.emit("call-user", {
          chatId,
          from: currentUserId,
          receiverId: userId,
          offer,
          phoneNumber,
        });
      },

      onScreenSignal: async ({ offer, isSharing: rShared }: any) => {
        const [peerId, peer] = Array.from(peersRef.current.entries())[0] || [];
        if (offer && peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          await flushCandidateBuffer(peerId);
          if (peer.remoteDescription?.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("screen-sharing-signal", {
              chatId,
              offer: answer,
              isSharing: rShared,
            });
          }
        }
        setRemoteIsSharing(rShared);
      },
    },
    chatId,
    currentUserId,
  );

  return {
    socket,
    inCall,
    isCaller,
    incomingCall,
    localStream,
    remoteStreams,
    callDuration: duration,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    callStatus,
    receiverOnline,
    isSharing,
    remoteIsSharing,
    startScreenShare,
    stopScreenShare,
    inviteUser,
    joinGroupCall,
  };
};
