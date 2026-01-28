import { useState, useRef } from "react";

export const useScreenShare = (
  peerConnection: RTCPeerConnection | null,
  socket: any,
  chatId: string,
) => {
  const [isSharing, setIsSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];

      if (peerConnection) {
        // Track ko connection mein add karein
        peerConnection.addTrack(track, stream);

        // Naya Offer banayein (Negotiation)
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Backend ko signal bhejein
        socket.emit("screen-sharing-signal", {
          chatId,
          offer,
          isSharing: true,
        });
      }

      setIsSharing(true);

      // Browser ke "Stop Sharing" button ke liye
      track.onended = () => stopScreenShare();

      return stream;
    } catch (err) {
      console.error("Screen share failed", err);
      return null;
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    setIsSharing(false);
    socket.emit("screen-sharing-signal", { chatId, isSharing: false });
  };

  return { isSharing, startScreenShare, stopScreenShare };
};
