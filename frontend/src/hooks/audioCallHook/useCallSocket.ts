import { useEffect } from "react";
import { Socket } from "socket.io-client";

export const useCallSocket = (
  socket: Socket,
  handlers: any,
  chatId: string,
  userId: string,
) => {
  useEffect(() => {
    socket.on("incoming-call", handlers.onIncoming);
    socket.on("call-answered", handlers.onAnswered);
    socket.on("ice-candidate", handlers.onIce);
    socket.on("call-status", handlers.onStatus);
    socket.on("remote-screen-signal", handlers.onScreenSignal);
    socket.on("call-ended", handlers.onEnded);

    const sync = () => socket.emit("set_session", { senderId: userId, chatId });
    socket.on("connect", sync);
    if (socket.connected) sync();

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-status");
      socket.off("remote-screen-signal");
      socket.off("call-ended");
      socket.off("connect", sync);
    };
  }, [socket, handlers, chatId, userId]);
};
