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
      socket.join(callRoom); // Ensure caller is in the room
      console.log(`📞 Call initiated by ${from} in room ${callRoom}`);

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

      socket
        .to(callRoom)
        .emit("incoming-call", { from, offer, phoneNumber, isOnline: true });
      socket.emit("call-status", { isOnline: true });

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
    socket.join(`call_${chatId}`); // Callee joins the room
    console.log(
      `✅ Call answered by ${socket.senderId} in room call_${chatId}`,
    );

    await callService.logCallEvent(io, {
      chatId,
      from,
      receiverId,
      type: "call_accepted",
      content: "Call Answered",
    });

    socket
      .to(`call_${chatId}`)
      .emit("call-answered", { answer, from: socket.senderId });
  });

  // --- 3. End/Reject call ---
  socket.on("end-call", async ({ chatId, from, receiverId, wasRejected }) => {
    clearCallTimeout(chatId);
    console.log(`🛑 Call ended/rejected in room call_${chatId} by ${from}`);

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
    socket.leave(`call_${chatId}`);
  });
  socket.on("reject-call", async ({ chatId, to, from }) => {
    clearCallTimeout(chatId);
    console.log(`🚫 Call rejected by ${from} for caller ${to}`);

    // DB mein event log karein
    await callService.logCallEvent(io, {
      chatId,
      from: to, // Caller
      receiverId: from, // Reject karne wala
      type: "call_rejected",
      content: "Call Declined",
    });

    // 1. Caller ko direct signal bhejein (kyunki ho sakta hai receiver ne room join na kiya ho)
    const callerSocket = Array.from(io.sockets.sockets.values()).find(
      (s) => s.senderId === to,
    );

    if (callerSocket) {
      io.to(callerSocket.id).emit("call-rejected", { from });
    }

    // 2. Room ko bhi notify kar dein safety ke liye
    io.to(`call_${chatId}`).emit("call-ended", { from, reason: "rejected" });
  });

  // --- NEW: 4. Invite Third Person (Group Logic) ---
  socket.on("invite-to-call", ({ chatId, invitedUserId, fromName }) => {
    console.log(
      `📩 Invite Request: From ${fromName} to User ${invitedUserId} for Chat ${chatId}`,
    );

    const invitedSocket = Array.from(io.sockets.sockets.values()).find(
      (s) => s.senderId === invitedUserId,
    );

    if (invitedSocket) {
      io.to(invitedSocket.id).emit("call-invite-received", {
        chatId,
        from: socket.senderId,
        fromName,
      });
      console.log(`✨ Invite successfully sent to socket: ${invitedSocket.id}`);
    } else {
      console.log(`❌ Invite failed: User ${invitedUserId} is offline`);
    }
  });

  // --- NEW: 5. Invited User Joins Group Call ---
  socket.on("join-call-room", ({ chatId }) => {
    const callRoom = `call_${chatId}`;
    socket.join(callRoom);
    console.log(
      `👥 Group Join: User ${socket.senderId} joined room ${callRoom}`,
    );

    // Notify others in room to start peer connection with this new user
    socket.to(callRoom).emit("user-joined-group", { userId: socket.senderId });
  });

  // --- 6. Signaling (ICE & Screen Share) ---
  socket.on("ice-candidate", ({ chatId, candidate, from, toUserId }) => {
    // If toUserId exists, send to specific user (for group mesh), else broadcast to room
    if (toUserId) {
      const target = Array.from(io.sockets.sockets.values()).find(
        (s) => s.senderId === toUserId,
      );
      if (target) io.to(target.id).emit("ice-candidate", { candidate, from });
    } else {
      socket.to(`call_${chatId}`).emit("ice-candidate", { candidate, from });
    }
  });

  socket.on("screen-sharing-signal", ({ chatId, offer, isSharing }) => {
    socket
      .to(`call_${chatId}`)
      .emit("remote-screen-signal", { offer, isSharing });
  });
};
