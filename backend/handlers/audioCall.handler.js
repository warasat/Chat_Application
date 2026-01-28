import { client as cassandraClient } from "../config/cassandra.js";

// Call timeouts ko track karne ke liye Map
const activeCallTimeouts = new Map();

export const registerCallHandlers = (io, socket) => {
  // --- Helper Function to Log Missed Call in Cassandra ---
  const logMissedCall = async (chatId, from, receiverId) => {
    const message_time = new Date();
    const query = `
      INSERT INTO messages (chat_id, message_time, content, sender_id, receiver_id, type) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      await cassandraClient.execute(
        query,
        [
          chatId,
          message_time,
          "Missed Audio Call",
          from,
          receiverId,
          "missed_call",
        ],
        { prepare: true },
      );

      // Live update for the chat UI
      io.to(chatId).emit("receive_message", {
        chat_id: chatId,
        sender_id: from,
        receiver_id: receiverId,
        content: "Missed Audio Call",
        type: "missed_call",
        message_time: message_time.toISOString(),
      });
      console.log(`📝 Missed call logged for chat: ${chatId}`);
    } catch (err) {
      console.error("❌ Cassandra Missed Call Error:", err);
    }
  };

  // 1️⃣ Caller starts call
  socket.on(
    "call-user",
    async ({ chatId, from, receiverId, offer, phoneNumber }) => {
      const callRoom = `call_${chatId}`;

      const receiverSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.senderId === receiverId,
      );

      const isOnline = !!receiverSocket;

      // A. User is Offline
      if (!isOnline) {
        console.log(
          `📡 Receiver ${receiverId} is offline. Logging missed call.`,
        );
        await logMissedCall(chatId, from, receiverId);
        io.to(from).emit("call-status", { isOnline: false });
        return;
      }

      // B. User is Online - Proceed with ringing
      socket.to(callRoom).emit("incoming-call", {
        from,
        offer,
        phoneNumber,
        isOnline: true,
      });
      io.to(from).emit("call-status", { isOnline: true });

      // Start 30s timer for "No Answer"
      const timeout = setTimeout(async () => {
        console.log(`⏰ Call timeout for ${chatId}. Saving missed call.`);
        await logMissedCall(chatId, from, receiverId);
        io.to(callRoom).emit("call-ended", {
          from: "system",
          reason: "no-answer",
        });
        activeCallTimeouts.delete(chatId);
      }, 30000);

      activeCallTimeouts.set(chatId, timeout);
    },
  );

  // 2️⃣ Callee answers call
  socket.on("answer-call", ({ chatId, answer, from }) => {
    // Clear timeout as call is answered
    if (activeCallTimeouts.has(chatId)) {
      clearTimeout(activeCallTimeouts.get(chatId));
      activeCallTimeouts.delete(chatId);
    }

    const callRoom = `call_${chatId}`;
    io.to(callRoom).emit("call-answered", { answer, from });
  });

  // 3️⃣ End call
  socket.on("end-call", ({ chatId, from }) => {
    // Clear timeout if call ended during ringing
    if (activeCallTimeouts.has(chatId)) {
      clearTimeout(activeCallTimeouts.get(chatId));
      activeCallTimeouts.delete(chatId);
    }

    const callRoom = `call_${chatId}`;
    io.to(callRoom).emit("call-ended", { from });
  });

  // 4️⃣ ICE Candidates
  socket.on("ice-candidate", ({ chatId, candidate, from }) => {
    const callRoom = `call_${chatId}`;
    socket.to(callRoom).emit("ice-candidate", { candidate, from });
  });
};
