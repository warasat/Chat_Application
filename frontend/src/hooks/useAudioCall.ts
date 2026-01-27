import { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";

// Connect to backend socket
const socket: Socket = io(
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000",
  { transports: ["websocket"] },
);

interface UseAudioCallProps {
  currentUserId: string;
  chatId: string;
  phoneNumber: string;
}

interface IncomingCall {
  from: string;
  offer: RTCSessionDescriptionInit;
  isOnline?: boolean;
  phoneNumber: string;
}

export const useAudioCall = ({
  currentUserId,
  chatId,
  phoneNumber,
}: UseAudioCallProps) => {
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callStatus, setCallStatus] = useState<"ringing" | "calling">(
    "ringing",
  );
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [receiverOnline, setReceiverOnline] = useState<boolean | null>(null);

  /* ---------------------- Initialize Peer ---------------------- */
  const initPeer = async () => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          chatId,
          candidate: event.candidate,
          from: currentUserId,
        });
      }
    };

    peer.ontrack = (event) => setRemoteStream(event.streams[0]);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    setLocalStream(stream);
    peerRef.current = peer;
  };

  /* ---------------------- Start Call (Caller) ---------------------- */
  const startCall = async () => {
    await initPeer();
    const offer = await peerRef.current!.createOffer();
    await peerRef.current!.setLocalDescription(offer);

    // ✅ Send caller’s phone number to backend
    socket.emit("call-user", {
      chatId,
      from: currentUserId,
      offer,
      phoneNumber,
    });

    setInCall(true); // caller waiting
    setCallStatus("ringing");
  };

  /* ---------------------- Accept Call (Receiver) ---------------------- */
  const acceptCall = async () => {
    if (!incomingCall) return;
    const { from, offer } = incomingCall;

    await initPeer();
    await peerRef.current!.setRemoteDescription(
      new RTCSessionDescription(offer),
    );

    const answer = await peerRef.current!.createAnswer();
    await peerRef.current!.setLocalDescription(answer);

    socket.emit("answer-call", { chatId, answer, from });
    setIncomingCall(null);
    setInCall(true);

    // Notify caller and start timer
    socket.emit("call-started", { chatId });
    startTimer();
  };

  /* ---------------------- Reject Call ---------------------- */
  const rejectCall = () => {
    if (incomingCall?.from) {
      socket.emit("end-call", { chatId, from: currentUserId });
    }
    setIncomingCall(null);
  };

  /* ---------------------- End Call ---------------------- */
  const endCall = (notifyOther = true) => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    setIncomingCall(null);

    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
      setCallDuration(0);
    }

    if (notifyOther) {
      socket.emit("end-call", { chatId, from: currentUserId });
    }
  };

  /* ---------------------- Start Timer ---------------------- */
  const startTimer = () => {
    setCallDuration(0);
    durationRef.current = setInterval(
      () => setCallDuration((prev) => prev + 1),
      1000,
    );
  };

  /* ---------------------- Socket Listeners ---------------------- */
  useEffect(() => {
    const handleIncomingCall = ({
      from,
      offer,
      isOnline,
      phoneNumber,
    }: IncomingCall) => {
      setIncomingCall({ from, offer, isOnline, phoneNumber });
      setCallStatus(isOnline ? "ringing" : "calling");
    };

    const handleCallAnswered = async ({
      answer,
    }: {
      answer: RTCSessionDescriptionInit;
    }) => {
      await peerRef.current?.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
      startTimer();
    };

    const handleCallStarted = () => startTimer();

    const handleIceCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    };

    const handleCallEnded = ({}: { from: string }) => endCall(false);

    const handleCallStatus = ({ isOnline }: { isOnline: boolean }) => {
      setReceiverOnline(isOnline); // ✅ track online/offline for caller UI
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("call-started", handleCallStarted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-status", handleCallStatus);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-answered", handleCallAnswered);
      socket.off("call-started", handleCallStarted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-status", handleCallStatus);
    };
  }, [chatId, currentUserId]);

  /* ---------------------- Setup session on mount ---------------------- */
  useEffect(() => {
    socket.emit("set_session", { senderId: currentUserId, chatId });
  }, [currentUserId, chatId]);

  /* ---------------------- Cleanup on unmount ---------------------- */
  useEffect(() => {
    return () => endCall(false);
  }, []);

  return {
    inCall,
    incomingCall,
    callStatus,
    localStream,
    remoteStream,
    callDuration,
    startCall,
    acceptCall,
    rejectCall,
    receiverOnline,
    endCall,
  };
};
