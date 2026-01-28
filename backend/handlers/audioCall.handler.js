import { client as cassandraClient } from "../config/cassandra.js";

const activeCallTimeouts = new Map();

export const registerCallHandlers = (io, socket) => {
  // Sabse important: Generic function for all call logs
  const logCallEvent = async (chatId, from, receiverId, type, content) => {
    const message_time = new Date();
    const query = `
      INSERT INTO messages (chat_id, message_time, content, sender_id, receiver_id, type) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      await cassandraClient.execute(
        query,
        [chatId, message_time, content, from, receiverId, type],
        { prepare: true },
      );

      // Pura room (chatId) update hoga, taake dono users ko real-time blob mile
      io.to(chatId).emit("receive_message", {
        chat_id: chatId,
        sender_id: from,
        receiver_id: receiverId,
        content: content,
        type: type,
        message_time: message_time.toISOString(),
      });

      console.log(`📝 Call event [${type}] logged for chat: ${chatId}`);
    } catch (err) {
      console.error(`❌ Cassandra Error (${type}):`, err);
    }
  };

  // Caller starts call
  socket.on(
    "call-user",
    async ({ chatId, from, receiverId, offer, phoneNumber }) => {
      const callRoom = `call_${chatId}`;

      const receiverSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.senderId === receiverId,
      );

      const isOnline = !!receiverSocket;

      if (!isOnline) {
        console.log(
          `📡 Receiver ${receiverId} is offline. Logging missed call.`,
        );
        // Generic function use karein
        await logCallEvent(
          chatId,
          from,
          receiverId,
          "missed_call",
          "Missed Audio Call",
        );
        io.to(from).emit("call-status", { isOnline: false });
        return;
      }

      // Proceed with ringing
      socket.to(callRoom).emit("incoming-call", {
        from,
        offer,
        phoneNumber,
        isOnline: true,
      });
      io.to(from).emit("call-status", { isOnline: true });

      // Timeout logic
      if (activeCallTimeouts.has(chatId))
        clearTimeout(activeCallTimeouts.get(chatId));

      const timeout = setTimeout(async () => {
        console.log(`⏰ Call timeout for ${chatId}.`);
        await logCallEvent(
          chatId,
          from,
          receiverId,
          "missed_call",
          "Missed Audio Call",
        );
        io.to(callRoom).emit("call-ended", {
          from: "system",
          reason: "no-answer",
        });
        activeCallTimeouts.delete(chatId);
      }, 30000);

      activeCallTimeouts.set(chatId, timeout);
    },
  );

  // Callee answers call
  socket.on("answer-call", async ({ chatId, answer, from, receiverId }) => {
    if (activeCallTimeouts.has(chatId)) {
      clearTimeout(activeCallTimeouts.get(chatId));
      activeCallTimeouts.delete(chatId);
    }

    // Log call as accepted (from: caller, receiverId: person who answered)
    await logCallEvent(
      chatId,
      from,
      receiverId,
      "call_accepted",
      "Call Answered",
    );

    const callRoom = `call_${chatId}`;
    io.to(callRoom).emit("call-answered", { answer, from });
  });

  //  End call
  socket.on("end-call", async ({ chatId, from, receiverId, wasRejected }) => {
    if (activeCallTimeouts.has(chatId)) {
      clearTimeout(activeCallTimeouts.get(chatId));
      activeCallTimeouts.delete(chatId);
    }

    // Log if the call was explicitly declined
    if (wasRejected) {
      await logCallEvent(
        chatId,
        from,
        receiverId,
        "call_rejected",
        "Call Declined",
      );
    }

    const callRoom = `call_${chatId}`;
    io.to(callRoom).emit("call-ended", { from });
  });

  // ICE Candidates
  socket.on("ice-candidate", ({ chatId, candidate, from }) => {
    const callRoom = `call_${chatId}`;
    socket.to(callRoom).emit("ice-candidate", { candidate, from });
  });
};
