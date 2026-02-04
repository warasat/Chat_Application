import { useState, useRef, useCallback } from "react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:global.relay.metered.ca:443?transport=tcp",
      username: "0d9a94c2bef9648000189eaf",
      credential: "80gBScBi20Ec8PrR",
    },
  ],
  iceCandidatePoolSize: 10,
};

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // ✅ Always initialize mic before use
  const getLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
        console.log("🚀 Mic initialized and FORCED ON");
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Mic access denied:", err);
      throw err;
    }
  }, []);

  // ✅ Ensure mic track added before offer creation
  const initPeer = useCallback(
    async (targetUserId: string, onIce: (cand: any) => void) => {
      if (peersRef.current.has(targetUserId)) {
        return peersRef.current.get(targetUserId)!;
      }

      const peer = new RTCPeerConnection(ICE_SERVERS);

      peer.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE State (${targetUserId}):`, peer.iceConnectionState);
        if (peer.iceConnectionState === "failed") {
          console.error("❌ ICE Connection failed. Audio cannot pass.");
        }
      };

      // 🔸 Make sure mic stream is ready
      if (!localStreamRef.current) await getLocalMedia();

      // 🔸 Add tracks safely
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          if (!peer.getSenders().find((s) => s.track === track)) {
            peer.addTrack(track, localStreamRef.current!);
          }
        });
      }

      // 🔊 Handle incoming remote tracks
      peer.ontrack = (e) => {
        console.log(
          "🔊 REMOTE TRACK RECEIVED from:",
          targetUserId,
          e.track.kind,
        );
        const incomingStream = e.streams?.[0] || new MediaStream([e.track]);
        setRemoteStreams((prev) => ({
          ...prev,
          [targetUserId]: incomingStream,
        }));
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) onIce(e.candidate);
      };

      peersRef.current.set(targetUserId, peer);
      return peer;
    },
    [getLocalMedia],
  );

  const removePeer = useCallback((userId: string) => {
    const peer = peersRef.current.get(userId);
    if (peer) {
      peer.close();
      peersRef.current.delete(userId);
      setRemoteStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
    }
  }, []);

  const closeAllConnections = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStreams({});
  }, []);

  return {
    peersRef,
    localStream,
    remoteStreams,
    initPeer,
    removePeer,
    closeAllConnections,
    getLocalMedia,
  };
};
