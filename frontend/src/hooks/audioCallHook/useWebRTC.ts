import { useState, useRef, useCallback } from "react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "0d9a94c2bef9648000189eaf",
      credential: "80gBScBi20Ec8PrR",
    },
  ],
};

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const initPeer = useCallback(
    async (onIce: (cand: RTCIceCandidate) => void) => {
      const peer = new RTCPeerConnection(ICE_SERVERS);

      peer.onicecandidate = (e) => e.candidate && onIce(e.candidate);
      peer.ontrack = (e) =>
        e.streams && e.streams[0] && setRemoteStream(e.streams[0]);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      setLocalStream(stream);
      peerRef.current = peer;
      return peer;
    },
    [],
  );

  const closeConnections = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
  }, [localStream]);

  return { peerRef, localStream, remoteStream, initPeer, closeConnections };
};
