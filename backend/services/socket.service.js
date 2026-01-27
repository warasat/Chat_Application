import { Server } from "socket.io";
import { client as cassandraClient } from "../config/cassandra.js";
import { registerCallHandlers } from "../handlers/audioCall.handler.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Connection Open: ${socket.id}`);

    // --- SESSION SETUP ---
    socket.on("set_session", (data) => {
      const userRoom = data.senderId || data.sender_id;
      const chatId = data.chatId || data.chat_id;

      if (userRoom) {
        socket.senderId = userRoom;
        socket.join(userRoom);
      }

      if (chatId) {
        socket.join(chatId);
        const callRoom = `call_${chatId}`;
        socket.join(callRoom);
      }

      io.emit("user_status", { userId: userRoom, status: "online" });
    });

    // --- REGISTER CALL HANDLERS ---
    registerCallHandlers(io, socket);

    // --- MESSAGING LOGIC ---
    socket.on("message", async (data) => {
      const chat_id = data.chat_id || data.chatId;
      const sender_id = data.sender_id || data.senderId;
      const receiver_id = data.receiver_id || data.receiverId;
      const content = data.content || "";
      const type = data.type || "text";
      const message_time = new Date();

      if (!chat_id || !sender_id) return;

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
      } catch (err) {
        console.error("❌ Cassandra Error:", err);
      }
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
