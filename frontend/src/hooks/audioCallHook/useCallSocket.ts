import { useEffect } from "react";
import { Socket } from "socket.io-client";

export const useCallSocket = (
  socket: Socket,
  handlers: any,
  chatId: string,
  userId: string,
) => {
  useEffect(() => {
    // --- 1:1 Call Events ---
    socket.on("incoming-call", handlers.onIncoming);
    socket.on("call-answered", handlers.onAnswered);
    socket.on("call-status", handlers.onStatus);
    socket.on("call-ended", handlers.onEnded);

    // 🚀 THE FIX: Reject signal ko listen karein
    socket.on("call-rejected", () => {
      console.log("🚫 Socket: Call rejected signal received");
      if (handlers.onRejected) handlers.onRejected();
    });

    // --- Group / Mesh Call Events ---
    socket.on("user-joined-group", handlers.onUserJoinedGroup);
    socket.on("call-invite-received", handlers.onInviteReceived);

    // --- Signaling ---
    socket.on("ice-candidate", handlers.onIce);
    socket.on("remote-screen-signal", handlers.onScreenSignal);

    // Session Management
    const sync = () => {
      // console.log("🔄 Syncing socket session for:", userId);
      socket.emit("set_session", { senderId: userId, chatId });
    };

    socket.on("connect", sync);
    if (socket.connected) sync();

    // Cleanup logic
    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("call-rejected"); // Cleanup add kiya
      socket.off("ice-candidate");
      socket.off("call-status");
      socket.off("remote-screen-signal");
      socket.off("call-ended");
      socket.off("user-joined-group");
      socket.off("call-invite-received");
      socket.off("connect", sync);
    };
  }, [socket, handlers, chatId, userId]);
};
