import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useScreenShare } from "./useScreenShare";

const socket: Socket = io(import.meta.env.VITE_SOCKET_URL, {
  transports: ["websocket"],
});

interface UseAudioCallProps {
  currentUserId: string;
  chatId: string;
  phoneNumber: string;
  receiverId: string;
}

interface IncomingCall {
  from: string;
  offer: RTCSessionDescriptionInit;
  isOnline?: boolean;
  phoneNumber: string;
  receiverId: string;
}

export const useAudioCall = ({
  currentUserId,
  chatId,
  phoneNumber,
  receiverId,
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

  const [remoteIsSharing, setRemoteIsSharing] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare(
    peerRef.current,
    socket,
    chatId,
  );

  const startTimer = useCallback(() => {
    if (durationRef.current) return;
    setCallDuration(0);
    durationRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const endCall = useCallback(
    (notifyOther = true) => {
      if (autoEndRef.current) clearTimeout(autoEndRef.current);
      if (durationRef.current) clearInterval(durationRef.current);

      if (isSharing) stopScreenShare();

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
      setRemoteIsSharing(false);

      if (notifyOther) {
        socket.emit("end-call", { chatId, from: currentUserId });
      }
    },
    [chatId, currentUserId, localStream, isSharing, stopScreenShare],
  );

  const initPeer = async () => {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
          ],
        },
      ],
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

    peer.ontrack = (event) => {
      console.log("📡 Remote track received:", event.track.kind);

      setRemoteStream(event.streams[0]);
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    setLocalStream(stream);
    peerRef.current = peer;
    return peer;
  };

  const startCall = async () => {
    setIsInitiator(true);
    const peer = await initPeer();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("call-user", {
      chatId,
      from: currentUserId,
      receiverId: receiverId,
      offer,
      phoneNumber,
    });

    setInCall(true);
    setCallStatus("calling");

    autoEndRef.current = setTimeout(() => {
      endCall(true);
    }, 30000);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { from, offer } = incomingCall;

    setIsInitiator(false);
    const peer = await initPeer();
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    if (autoEndRef.current) clearTimeout(autoEndRef.current);

    socket.emit("answer-call", { chatId, answer, from });
    setIncomingCall(null);
    setInCall(true);
    setCallStatus("connected");
    startTimer();
  };

  const rejectCall = () => {
    if (incomingCall?.from) {
      socket.emit("end-call", {
        chatId,
        from: currentUserId,
        receiverId: incomingCall.from,
        wasRejected: true,
      });
    }
    setIncomingCall(null);
  };

  useEffect(() => {
    const handleRemoteScreenSignal = async ({
      offer,
      isSharing: remoteShared,
    }: any) => {
      if (offer && peerRef.current) {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(offer),
        );
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);

        socket.emit("screen-sharing-signal", {
          chatId,
          offer: answer,
          isSharing: remoteShared,
        });
      }
      setRemoteIsSharing(remoteShared);
    };

    socket.on("incoming-call", (data) => {
      if (data.from !== currentUserId) {
        setIncomingCall(data);
        setCallStatus("ringing");
      }
    });

    socket.on("call-answered", async ({ answer }) => {
      if (autoEndRef.current) clearTimeout(autoEndRef.current);
      if (peerRef.current && answer) {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      }
      setCallStatus("connected");
      startTimer();
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (peerRef.current && candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("ICE error:", err);
      }
    });

    socket.on("call-status", ({ isOnline }) => {
      setReceiverOnline(isOnline);
      setCallStatus(isOnline ? "ringing" : "calling");
    });

    socket.on("remote-screen-signal", handleRemoteScreenSignal);
    socket.on("call-ended", () => endCall(false));

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
      socket.off("call-status");
      socket.off("remote-screen-signal");
    };
  }, [chatId, currentUserId, endCall, startTimer]);

  useEffect(() => {
    const syncSession = () =>
      socket.emit("set_session", { senderId: currentUserId, chatId });
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

    isSharing,
    remoteIsSharing,
    startScreenShare,
    stopScreenShare,
  };
};
