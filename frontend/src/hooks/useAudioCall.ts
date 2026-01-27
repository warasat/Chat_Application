import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";

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
  const [isInitiator, setIsInitiator] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "ringing" | "calling" | "connected"
  >("calling");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [receiverOnline, setReceiverOnline] = useState<boolean | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = useCallback(() => {
    if (durationRef.current) return;
    setCallDuration(0);
    durationRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const endCall = useCallback(
    (notifyOther = true) => {
      if (autoEndRef.current) {
        clearTimeout(autoEndRef.current);
        autoEndRef.current = null;
      }
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      localStream?.getTracks().forEach((t) => t.stop());

      setLocalStream(null);
      setRemoteStream(null);
      setInCall(false);
      setIncomingCall(null);
      setIsInitiator(false);
      setCallDuration(0);
      setReceiverOnline(null);

      if (notifyOther) {
        socket.emit("end-call", { chatId, from: currentUserId });
      }
    },
    [chatId, currentUserId, localStream],
  );

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

  const startCall = async () => {
    setIsInitiator(true);
    await initPeer();
    const offer = await peerRef.current!.createOffer();
    await peerRef.current!.setLocalDescription(offer);

    socket.emit("call-user", {
      chatId,
      from: currentUserId,
      offer,
      phoneNumber,
    });

    setInCall(true);
    setCallStatus("calling");

    autoEndRef.current = setTimeout(() => {
      console.log("⏰ No answer — call ended automatically.");
      endCall(true);
    }, 30000);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { from, offer } = incomingCall;

    setIsInitiator(false);
    await initPeer();
    await peerRef.current!.setRemoteDescription(
      new RTCSessionDescription(offer),
    );
    const answer = await peerRef.current!.createAnswer();
    await peerRef.current!.setLocalDescription(answer);

    if (autoEndRef.current) {
      clearTimeout(autoEndRef.current);
      autoEndRef.current = null;
    }

    socket.emit("answer-call", { chatId, answer, from });
    setIncomingCall(null);
    setInCall(true);
    setCallStatus("connected");
    startTimer();
  };

  const rejectCall = () => {
    if (incomingCall?.from) {
      socket.emit("end-call", { chatId, from: currentUserId });
    }
    setIncomingCall(null);
  };

  useEffect(() => {
    const handleIncomingCall = (data: IncomingCall) => {
      if (data.from === currentUserId) return;

      setIncomingCall(data);
      setCallStatus("ringing");
    };

    const handleCallAnswered = async ({
      answer,
    }: {
      answer: RTCSessionDescriptionInit;
    }) => {
      if (autoEndRef.current) {
        clearTimeout(autoEndRef.current);
        autoEndRef.current = null;
      }
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      }
      setCallStatus("connected");
      startTimer();
    };

    const handleIceCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        if (peerRef.current) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("ICE error:", err);
      }
    };

    const handleCallStatus = ({ isOnline }: { isOnline: boolean }) => {
      console.log(
        "📡 Frontend received status:",
        isOnline ? "Ringing" : "Calling",
      );
      setReceiverOnline(isOnline);
      setCallStatus(isOnline ? "ringing" : "calling");
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", () => endCall(false));
    socket.on("call-status", handleCallStatus);

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
      socket.off("call-status");
    };
  }, [chatId, currentUserId, endCall, startTimer]);

  useEffect(() => {
    const syncSession = () => {
      socket.emit("set_session", { senderId: currentUserId, chatId });
    };

    if (socket.connected) syncSession();
    socket.on("connect", syncSession);

    return () => {
      socket.off("connect", syncSession);
    };
  }, [currentUserId, chatId]);

  return {
    inCall,
    incomingCall,
    isCaller: isInitiator,
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
