import { Server } from "socket.io";
import { client as cassandraClient } from "../config/cassandra.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Connection Open: ${socket.id}`);

    // --- SESSION SET ---
    socket.on("set_session", (data) => {
      const userRoom = data.senderId || data.sender_id;
      const chatId = data.chatId || data.chat_id;

      if (userRoom) {
        socket.senderId = userRoom;
        socket.join(userRoom); // personal room
      }

      if (chatId) {
        socket.join(chatId);
        const callRoom = `call_${chatId}`;
        socket.join(callRoom); // chat-specific call room
        console.log(`✅ User ${userRoom} joined call room ${callRoom}`);
      }

      console.log(`✅ Session: User ${userRoom} joined Room ${chatId}`);
      io.emit("user_status", { userId: userRoom, status: "online" });
    });

    // --- GET USER STATUS ---
    socket.on("get_user_status", ({ userId }) => {
      const isOnline = Array.from(io.sockets.sockets.values()).some(
        (s) => s.senderId === userId,
      );
      socket.emit("user_status", {
        userId,
        status: isOnline ? "online" : "offline",
      });
    });

    // --- MESSAGES ---
    socket.on("message", async (data) => {
      const chat_id = data.chat_id || data.chatId;
      const sender_id = data.sender_id || data.senderId;
      const receiver_id = data.receiver_id || data.receiverId;
      const content = data.content || "";
      const type = data.type || "text";
      const message_time = new Date();

      if (!chat_id || !sender_id)
        return console.error("❌ chat_id or sender_id missing");

      try {
        const query = `
          INSERT INTO messages (chat_id, message_time, content, receiver_id, sender_id, type) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await cassandraClient.execute(
          query,
          [
            chat_id,
            message_time,
            content,
            receiver_id || null,
            sender_id,
            type,
          ],
          { prepare: true },
        );

        const msgPayload = {
          chat_id,
          sender_id,
          receiver_id,
          content,
          type,
          message_time: message_time.toISOString(),
        };
        socket.to(chat_id).emit("receive_message", msgPayload);

        if (receiver_id) {
          io.to(receiver_id).emit("new_chat_started", {
            senderId: sender_id,
            lastMessage: content,
            chatId: chat_id,
          });
        }

        console.log("✅ Message saved and delivered.");
      } catch (err) {
        console.error("❌ Cassandra/Socket Error:", err);
      }
    });

    // --- AUDIO CALL SIGNALING ---
    // 1️⃣ Caller starts call
    socket.on("call-user", ({ chatId, from, offer, phoneNumber }) => {
      const callRoom = `call_${chatId}`;
      const isOnline = Array.from(io.sockets.sockets.values()).some(
        (s) => s.senderId === from,
      );
      // check if receiver is online

      io.to(callRoom).emit("incoming-call", {
        from,
        offer,
        phoneNumber,
        isOnline,
      });
    });

    // 2️⃣ Callee answers call
    socket.on("answer-call", ({ chatId, answer, from }) => {
      const callRoom = `call_${chatId}`;
      console.log(`✅ Call answered by ${from} in room ${callRoom}`);
      io.to(callRoom).emit("call-answered", { answer, from });
    });

    // 3️⃣ Exchange ICE candidates
    socket.on("ice-candidate", ({ chatId, candidate, from }) => {
      const callRoom = `call_${chatId}`;
      io.to(callRoom).emit("ice-candidate", { candidate, from });
    });

    // 4️⃣ End call
    socket.on("end-call", ({ chatId, from }) => {
      const callRoom = `call_${chatId}`;
      console.log(`❌ Call ended by ${from} in room ${callRoom}`);
      io.to(callRoom).emit("call-ended", { from });
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      if (socket.senderId) {
        io.emit("user_status", { userId: socket.senderId, status: "offline" });
      }
    });
  });

  return io;
};

export const getIO = () => io;
