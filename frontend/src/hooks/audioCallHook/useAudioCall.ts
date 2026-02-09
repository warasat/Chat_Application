import { useState, useCallback, useRef, useEffect } from "react";
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
      const participantIds = [currentUserId, incomingCall.from].sort();
      const targetChatId = `${participantIds[0]}_${participantIds[1]}`;

      // 1. SIGNAL: Socket ko batayein ke invite ignore ho gaya hai (Reject nahi!)
      socket.emit("call-ignored", {
        chatId: chatId, // Current group call room
        to: incomingCall.from,
        from: currentUserId,
      });

      // 2. MESSAGE: Chat bubble ke liye
      const ignorePayload = {
        chatId: targetChatId,
        senderId: currentUserId,
        receiverId: incomingCall.from,
        content: "declined your invite",
        type: "call_rejected",
      };

      socket.emit("message", { ...ignorePayload, to: incomingCall.from });

      // 3. DB Save
      await fetch(`${import.meta.env.VITE_API_URL}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(ignorePayload),
      });

      setIncomingCall(null);
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
  const endCall = useCallback(
    (notify = true) => {
      if (notify) {
        // Backend logic will now check room size before broadcasting
        socket.emit("end-call", {
          chatId,
          from: currentUserId,
          receiverId, // Note: receiverId is usually for 1-on-1,
          // for groups the backend uses the room.
        });
      }

      if (isSharing) stopScreenShare();

      // 🔥 Crucial: Clean up local state
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
  useCallSocket(
    socket,
    {
      onIncoming: async (data: any) => {
        if (data.from === currentUserId) return;

        // 🔥 Agar pehle se call mein hain, toh popup ke bajaye background mein connect karein
        if (inCall || callStatus === "connected") {
          console.log("🔗 Auto-connecting new participant in background...");
          await acceptCall(data.offer, data.from);
        } else {
          // Sirf tab popup dikhayein jab user free ho
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

      // onLeft Call
      // useCallSocket ke andar in do events ko replace karein:

      onUserLeft: ({ from }: any) => {
        console.log(`👤 User Left Signal: ${from}`);
        if (from) {
          removePeer(from); // Ye Map aur RemoteStreams dono se delete karega
        }
      },

      // 2. System Level End Signal
      onEnded: ({ reason }: any) => {
        console.log("🛑 Call Ended by System:", reason);
        endCall(false);
      },

      onInviteReceived: (data: any) => {
        setIncomingCall({ ...data, isInvite: true });
      },

      // useCallSocket hook ke andar isko update karein:

      onUserJoinedGroup: async ({ userId }: any) => {
        // Khud ko connect karne ki koshish na karein
        if (userId === currentUserId) return;

        console.log(
          `👤 New user joined: ${userId}. Initiating Peer and Sending Offer...`,
        );

        const peer = await initPeer(userId, (candidate) => {
          socket.emit("ice-candidate", {
            chatId,
            candidate,
            from: currentUserId,
            toUserId: userId,
          });
        });

        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });

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
  //UseEffect
  useEffect(() => {
    if (inCall && Object.keys(remoteStreams).length === 0) {
      // Chota sa delay taake temporary reconnection issues par call na kate
      const timer = setTimeout(() => {
        if (inCall && Object.keys(remoteStreams).length === 0) {
          console.log("⚠️ No active remote streams left. Closing call.");
          endCall(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [remoteStreams, inCall, endCall]);

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
    ignoreInvite,
  };
};
