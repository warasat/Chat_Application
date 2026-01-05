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
      socket.chatId = data.chatId;
      socket.senderId = data.senderId;

      if (data.chatId) socket.join(data.chatId);
      if (data.senderId) socket.join(data.senderId); // personal room

      console.log(
        `✅ Session Set: ${data.senderId} joined Chat ${data.chatId}`
      );

      // 🔹 Emit online to all users (or could be filtered to friends)
      io.emit("user_status", { userId: data.senderId, status: "online" });
    });

    // --- GET USER STATUS ON REQUEST ---
    socket.on("get_user_status", ({ userId }) => {
      // check if any socket has this userId
      const isOnline = Array.from(io.sockets.sockets.values()).some(
        (s) => s.senderId === userId
      );
      socket.emit("user_status", {
        userId,
        status: isOnline ? "online" : "offline",
      });
    });

    // --- MESSAGES ---
    socket.on("message", async (data) => {
      const content = typeof data === "string" ? data : data.content;
      const type = data.type || "text";
      const receiverId = data.receiverId;

      const msgData = {
        chatId: socket.chatId,
        senderId: socket.senderId,
        receiverId,
        content,
        type,
        time: new Date(),
      };

      try {
        const query =
          "INSERT INTO messages (chat_id, sender_id, content, type, message_time) VALUES (?, ?, ?, ?, ?)";
        const params = [
          msgData.chatId,
          msgData.senderId,
          msgData.content,
          msgData.type,
          msgData.time,
        ];
        await cassandraClient.execute(query, params, { prepare: true });

        // Broadcast to chat room
        socket.to(socket.chatId).emit("receive_message", msgData);

        // Send directly to receiver
        io.to(receiverId).emit("receive_message", msgData);

        // Notify receiver sidebar for new chat
        io.to(receiverId).emit("new_chat_started", {
          senderId: msgData.senderId,
          lastMessage: msgData.content,
          chatId: msgData.chatId,
        });

        console.log("✅ Message delivered to receiver!");
      } catch (err) {
        console.error("❌ Socket Error:", err);
      }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      console.log("🔥 Door Closed");
      if (socket.senderId) {
        io.emit("user_status", { userId: socket.senderId, status: "offline" });
      }
    });
  });

  return io;
};

export const getIO = () => io;
