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

    // 🔥 Entire Call Ends (Room is empty or 1v1 ended)
    socket.on("call-ended", handlers.onEnded);

    // ✅ NEW: Specific User Leaves (Group Call continues)
    socket.on("user-left", (data) => {
      console.log("👤 Socket: User left the group", data);
      if (handlers.onUserLeft) handlers.onUserLeft(data);
    });

    socket.on("call-rejected", () => {
      if (handlers.onRejected) handlers.onRejected();
    });

    socket.on("call-ignored", (data) => {
      if (handlers.onIgnored) handlers.onIgnored(data);
    });

    // --- Group / Mesh Call Events ---
    socket.on("user-joined-group", handlers.onUserJoinedGroup);
    socket.on("call-invite-received", handlers.onInviteReceived);

    // --- Signaling ---
    socket.on("ice-candidate", handlers.onIce);
    socket.on("remote-screen-signal", handlers.onScreenSignal);

    const sync = () => {
      socket.emit("set_session", { senderId: userId, chatId });
    };

    socket.on("connect", sync);
    if (socket.connected) sync();

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("call-rejected");
      socket.off("call-ignored");
      socket.off("ice-candidate");
      socket.off("call-status");
      socket.off("remote-screen-signal");
      socket.off("call-ended");
      socket.off("user-left"); // Cleanup
      socket.off("user-joined-group");
      socket.off("call-invite-received");
      socket.off("connect", sync);
    };
  }, [socket, handlers, chatId, userId]);
};
