import { useState, useCallback, useRef, useEffect, useMemo } from "react";
// import { io } from "socket.io-client";
import { useWebRTC } from "./useWebRTC";
import { useCallTimer } from "./useCallTimer";
import { useCallSocket } from "./useCallSocket";
import { useScreenShare } from "../useScreenShare";
import socket from "../../services/socket";

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
    async (targetUserId: string) => {
      // 1. SIGNALING: User C ko batana ke "Is Room ID mein aao"
      // Yahan hum wahi 'chatId' bhejenge jo A aur B use kar rahe hain
      socket.emit("invite-to-call", {
        chatId: chatId, // CURRENT active call room ID
        invitedUserId: targetUserId,
        fromName: currentUserName || "A User",
      });

      try {
        // 2. CHAT HISTORY: User C ke inbox mein message dikhane ke liye
        // Inbox ke liye humein unka private chatId (A_C) chahiye
        const participantIds = [currentUserId, targetUserId].sort();
        const privateChatIdForInbox = `${participantIds[0]}_${participantIds[1]}`;

        const invitePayload = {
          chatId: privateChatIdForInbox, // Message C ke inbox mein jaye
          senderId: currentUserId,
          receiverId: targetUserId,
          // Content mein hum signal dete hain ke asli call room 'chatId' hai
          content: `📞 JOIN CALL: I am inviting you to an ongoing group call. Join Room: ${chatId}`,
          type: "text",
          message_time: new Date().toISOString(),
        };

        // 3. API Call to DB
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/messages/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(invitePayload),
          },
        );

        const savedMsg = await response.json();

        // 4. SOCKET MESSAGE: Real-time bubble for User C
        socket.emit("message", {
          ...invitePayload,
          _id: savedMsg._id || Date.now().toString(),
          callRoomId: chatId, // Extra field taake frontend ko pata ho join kahan karna hai
        });

        console.log("✅ Invite sent to User C for Room:", chatId);
      } catch (err) {
        console.error("❌ Failed to send invite message:", err);
      }
    },
    [chatId, currentUserId, currentUserName], // Dependencies are correct
  );

  // 2️⃣ Join group call
  const joinGroupCall = useCallback(async () => {
    const targetRoomId = incomingCall?.chatId || chatId;
    if (!targetRoomId) return;

    await getLocalMedia();

    // 🔥 Direct active state mein jayein
    setInCall(true);
    setCallStatus("connected");
    setIncomingCall(null);
    if (duration === 0) startTimer();

    socket.emit("join-call-room", {
      chatId: targetRoomId,
      userId: currentUserId,
    });
  }, [
    chatId,
    incomingCall,
    currentUserId,
    getLocalMedia,
    startTimer,
    duration,
  ]);

  // group ignore call
  const ignoreInvite = useCallback(async () => {
    if (incomingCall) {
      // 1. Participant IDs for private chat (User C and User A)
      const participantIds = [currentUserId, incomingCall.from].sort();
      const targetChatId = `${participantIds[0]}_${participantIds[1]}`;

      // 2. SIGNAL: Backend ko batana ke invite ignore ho gaya hai
      // Taake User A ko popup mein pata chal jaye (par call na kate)
      socket.emit("call-ignored", {
        chatId: chatId, // Active Group Call Room ID
        to: incomingCall.from,
        from: currentUserId,
      });

      // 3. MESSAGE PAYLOAD:
      // 🔥 TIP: Type ko "text" rakhein ya "invite_declined"
      // Agar "call_rejected" rakhenge toh system confuse ho sakta hai
      const ignorePayload = {
        chatId: targetChatId,
        senderId: currentUserId,
        receiverId: incomingCall.from,
        content: "declined your invite",
        type: "text", // Isay text rakhein taake sirf bubble dikhe, logic trigger na ho
        message_time: new Date().toISOString(),
      };

      try {
        // 4. Real-time message User A ko bubble dikhane ke liye
        socket.emit("message", {
          ...ignorePayload,
          to: incomingCall.from,
          _id: Date.now().toString(),
        });

        // 5. DB Save (Optional: Agar aap history rakhna chahte hain)
        await fetch(`${import.meta.env.VITE_API_URL}/messages/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(ignorePayload),
        });
      } catch (err) {
        console.error("Error saving ignore message:", err);
      }

      // 6. 🔥 THE MOST IMPORTANT PART:
      // Sirf local popup band karein.
      // Ensure karein ke useAudioCall mein koi useEffect is state par
      // endCall() ya closeAllConnections() nahi chala raha.
      setIncomingCall(null);

      console.log(
        "🟡 Invite ignored successfully. Current call remains untouched.",
      );
    }
  }, [incomingCall, currentUserId, socket, chatId]);

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
  const leaveCall = useCallback(
    (notify = true) => {
      if (notify) {
        // Backend ko signal bhejo ke "Main ja raha hoon"
        socket.emit("participant-left", {
          chatId,
          userId: currentUserId,
        });
      }

      if (isSharing) stopScreenShare();

      // Local cleanup
      closeAllConnections();
      stopTimer();
      setInCall(false);
      setIncomingCall(null);
      setIsCaller(false);
      setRemoteIsSharing(false);
      setCallStatus("calling");
      console.log("🚶 You left the call.");
    },
    [
      chatId,
      currentUserId,
      isSharing,
      stopScreenShare,
      closeAllConnections,
      stopTimer,
    ],
  );

  // --- 2. Terminate Call (Sab ke liye - Host Only) ---
  const terminateCall = useCallback(() => {
    // Global signal bhejien taake sab ki screen band ho jaye
    socket.emit("end-call-global", { chatId });

    // Phir khud bhi leave kar jayein
    leaveCall(false);
    console.log("🛑 You terminated the call for everyone.");
  }, [chatId, leaveCall]);

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
  const acceptCall = useCallback(
    async (customOffer?: any, customFrom?: string) => {
      const offer =
        customOffer && customOffer.type !== "click"
          ? customOffer
          : incomingCall?.offer;
      const from =
        customFrom && typeof customFrom === "string"
          ? customFrom
          : incomingCall?.from;

      if (!offer || !from) {
        console.error("❌ No valid offer or sender found");
        return;
      }

      await getLocalMedia();
      const peer = await initPeer(from, (candidate) => {
        socket.emit("ice-candidate", {
          chatId,
          candidate,
          from: currentUserId,
          toUserId: from,
        });
      });

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      await flushCandidateBuffer(from);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer-call", {
        chatId,
        answer,
        from,
        receiverId: currentUserId,
      });

      setIncomingCall(null);
      setInCall(true);
      setCallStatus("connected");
      if (duration === 0) startTimer();
    },
    [
      incomingCall,
      getLocalMedia,
      initPeer,
      currentUserId,
      chatId,
      flushCandidateBuffer,
      duration,
      startTimer,
    ],
  );

  // --- Socket Events ---
  const socketHandlers = useMemo(
    () => ({
      onIncoming: async (data: any) => {
        if (data.from === currentUserId) return;
        if (inCall || callStatus === "connected") {
          console.log("🔗 Auto-connecting new participant...");
          await acceptCall(data.offer, data.from);
        } else {
          setIncomingCall(data);
          setCallStatus("ringing");
        }
      },

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
        if (inCall || Object.keys(remoteStreams).length > 0) return;
        leaveCall(false);
      },

      onIgnored: ({ from }: any) => {
        console.log(`🟡 User ${from} ignored invite.`);
      },

      onIce: async ({ candidate, from }: any) => {
        if (from === currentUserId) return;
        const peer = peersRef.current.get(from);
        if (peer && candidate && peer.remoteDescription?.type) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("ICE error:", err);
          }
          return;
        }
        const buf = candidateBufferRef.current.get(from) ?? [];
        buf.push(candidate);
        candidateBufferRef.current.set(from, buf);
      },

      onStatus: ({ isOnline }: any) => {
        setReceiverOnline(isOnline);
        if (!inCall) setCallStatus(isOnline ? "ringing" : "calling");
      },

      onUserLeft: ({ from }: any) => {
        console.log(`👤 Participant left: ${from}`);
        if (from) removePeer(from);

        setTimeout(() => {
          if (Object.keys(peersRef.current).length === 0 && inCall) {
            console.log("No peers left. Ending call.");
            leaveCall(false);
          }
        }, 1000);
      },

      onForceEnd: () => {
        console.log("🚨 Force End signal received.");
        leaveCall(false);
      },

      onEnded: ({ reason }: any) => {
        console.log("🛑 Call Ended by System:", reason);
        leaveCall(false);
      },

      onInviteReceived: (data: any) => {
        setIncomingCall({ ...data, isInvite: true });
      },

      onUserJoinedGroup: async ({ userId }: any) => {
        if (userId === currentUserId) return;
        const peer = await initPeer(userId, (candidate) => {
          socket.emit("ice-candidate", {
            chatId,
            candidate,
            from: currentUserId,
            toUserId: userId,
          });
        });

        const offer = await peer.createOffer();
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
    }),
    [
      currentUserId,
      inCall,
      callStatus,
      acceptCall,
      receiverId,
      flushCandidateBuffer,
      startTimer,
      leaveCall,
      remoteStreams,
      removePeer,
      initPeer,
      socket,
      chatId,
      phoneNumber,
    ],
  );
  useCallSocket(socket, socketHandlers, chatId, currentUserId);
  //UseEffect
  useEffect(() => {
    if (inCall && Object.keys(remoteStreams).length === 0) {
      const timer = setTimeout(() => {
        if (inCall && Object.keys(remoteStreams).length === 0) {
          console.log("⚠️ No active remote streams left.");

          if (isCaller) {
            console.log(
              "Host is alone, waiting for others or manual termination.",
            );
          } else {
            console.log("Participant is alone. Auto-leaving...");
            leaveCall(false);
          }
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [remoteStreams, inCall, isCaller, leaveCall]);

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
    leaveCall,
    terminateCall,
    callStatus,
    receiverOnline,
    isSharing,
    remoteIsSharing,
    startScreenShare,
    stopScreenShare,
    inviteUser,
    joinGroupCall,
    ignoreInvite,
  };
};
