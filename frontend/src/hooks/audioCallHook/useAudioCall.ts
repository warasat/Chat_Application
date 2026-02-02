import { useState, useCallback } from "react";
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
}: any) => {
  // --- States ---
  const [inCall, setInCall] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "ringing" | "calling" | "connected"
  >("calling");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [receiverOnline, setReceiverOnline] = useState<boolean | null>(null);
  const [remoteIsSharing, setRemoteIsSharing] = useState(false);

  // --- Sub-Hooks Integration ---
  const { peerRef, localStream, remoteStream, initPeer, closeConnections } =
    useWebRTC();
  const { duration, startTimer, stopTimer } = useCallTimer();

  // Note: peerRef.current ko watch karne ke liye isay hooks ke flow mein rakhein
  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare(
    peerRef.current,
    socket,
    chatId,
  );

  // --- Actions ---
  const endCall = useCallback(
    (notify = true) => {
      if (notify) {
        socket.emit("end-call", { chatId, from: currentUserId, receiverId });
      }

      if (isSharing) stopScreenShare();

      closeConnections();
      stopTimer();

      setInCall(false);
      setIncomingCall(null);
      setIsCaller(false);
      setRemoteIsSharing(false);
    },
    [
      chatId,
      currentUserId,
      receiverId,
      isSharing,
      stopScreenShare,
      closeConnections,
      stopTimer,
    ],
  );

  const rejectCall = useCallback(() => {
    if (incomingCall?.from) {
      socket.emit("end-call", {
        chatId,
        from: currentUserId,
        receiverId: incomingCall.from,
        wasRejected: true,
      });
    }
    setIncomingCall(null);
  }, [incomingCall, chatId, currentUserId]);

  const startCall = async () => {
    setIsCaller(true);
    setInCall(true);
    setCallStatus("calling");

    const peer = await initPeer((candidate) => {
      socket.emit("ice-candidate", { chatId, candidate, from: currentUserId });
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("call-user", {
      chatId,
      from: currentUserId,
      receiverId,
      offer,
      phoneNumber,
    });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    setIsCaller(false);

    const peer = await initPeer((candidate) => {
      socket.emit("ice-candidate", { chatId, candidate, from: currentUserId });
    });

    await peer.setRemoteDescription(
      new RTCSessionDescription(incomingCall.offer),
    );
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

  // --- Socket Event Handlers ---
  useCallSocket(
    socket,
    {
      onIncoming: (data: any) => {
        if (data.from !== currentUserId) {
          setIncomingCall(data);
          setCallStatus("ringing");
        }
      },
      onAnswered: async ({ answer }: any) => {
        if (peerRef.current && answer) {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
        }
        setCallStatus("connected");
        startTimer();
      },
      onIce: async ({ candidate }: any) => {
        if (peerRef.current?.remoteDescription && candidate) {
          try {
            await peerRef.current.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
          } catch (e) {
            console.error("ICE Error", e);
          }
        }
      },
      onStatus: ({ isOnline }: any) => {
        setReceiverOnline(isOnline);
        setCallStatus(isOnline ? "ringing" : "calling");
      },
      onEnded: () => endCall(false),
      onScreenSignal: async ({ offer, isSharing: rShared }: any) => {
        if (offer && peerRef.current) {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(offer),
          );
          if (peerRef.current.remoteDescription?.type === "offer") {
            const answer = await peerRef.current.createAnswer();
            await peerRef.current.setLocalDescription(answer);
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
    inCall,
    isCaller,
    incomingCall,
    localStream,
    remoteStream,
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
  };
};
