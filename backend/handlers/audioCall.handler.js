import * as callService from "../services/call.service.js";

const activeCallTimeouts = new Map();
const CALL_TIMEOUT_DURATION = 30000;

export const registerCallHandlers = (io, socket) => {
  // Helper to clear timeout
  const clearCallTimeout = (chatId) => {
    if (activeCallTimeouts.has(chatId)) {
      clearTimeout(activeCallTimeouts.get(chatId));
      activeCallTimeouts.delete(chatId);
    }
  };

  // --- 1. Caller starts call ---
  socket.on(
    "call-user",
    async ({ chatId, from, receiverId, offer, phoneNumber }) => {
      const callRoom = `call_${chatId}`;

      // Check receiver online status
      const receiverSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.senderId === receiverId,
      );

      if (!receiverSocket) {
        await callService.logCallEvent(io, {
          chatId,
          from,
          receiverId,
          type: "missed_call",
          content: "Missed Audio Call",
        });
        socket.emit("call-status", { isOnline: false });
        return;
      }

      // Proceed with ringing
      socket
        .to(callRoom)
        .emit("incoming-call", { from, offer, phoneNumber, isOnline: true });
      socket.emit("call-status", { isOnline: true });

      // Set Timeout for no answer
      clearCallTimeout(chatId);
      const timeout = setTimeout(async () => {
        await callService.logCallEvent(io, {
          chatId,
          from,
          receiverId,
          type: "missed_call",
          content: "Missed Audio Call",
        });
        io.to(callRoom).emit("call-ended", {
          from: "system",
          reason: "no-answer",
        });
        activeCallTimeouts.delete(chatId);
      }, CALL_TIMEOUT_DURATION);

      activeCallTimeouts.set(chatId, timeout);
    },
  );

  // --- 2. Callee answers ---
  socket.on("answer-call", async ({ chatId, answer, from, receiverId }) => {
    clearCallTimeout(chatId);

    await callService.logCallEvent(io, {
      chatId,
      from,
      receiverId,
      type: "call_accepted",
      content: "Call Answered",
    });

    io.to(`call_${chatId}`).emit("call-answered", { answer, from });
  });

  // --- 3. End/Reject call ---
  socket.on("end-call", async ({ chatId, from, receiverId, wasRejected }) => {
    clearCallTimeout(chatId);

    if (wasRejected) {
      await callService.logCallEvent(io, {
        chatId,
        from,
        receiverId,
        type: "call_rejected",
        content: "Call Declined",
      });
    }

    io.to(`call_${chatId}`).emit("call-ended", { from });
  });

  // --- 4. Signaling (ICE & Screen Share) ---
  socket.on("ice-candidate", ({ chatId, candidate, from }) => {
    socket.to(`call_${chatId}`).emit("ice-candidate", { candidate, from });
  });

  socket.on("screen-sharing-signal", ({ chatId, offer, isSharing }) => {
    socket
      .to(`call_${chatId}`)
      .emit("remote-screen-signal", { offer, isSharing });
  });
};
