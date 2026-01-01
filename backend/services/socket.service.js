import { Server } from "socket.io";
import { client as cassandraClient } from "../config/cassandra.js";

// 1. Online users ko track karne ke liye Map (Memory mein save hoga)
const onlineUsers = new Map(); // { userId: socketId }

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Connection Open: ${socket.id}`);

    // 2. Session set karte waqt User ko Online mark karein
    socket.on("set_session", (data) => {
      socket.chatId = data.chatId;
      socket.senderId = data.senderId;
      socket.join(data.chatId);

      // User ID ko Map mein save karein
      onlineUsers.set(socket.senderId, socket.id);

      // Poore system ko batayein ke ye user online aa gaya hai
      io.emit("user_status", { userId: socket.senderId, status: "online" });

      console.log(`✅ User Online: ${socket.senderId}`);
      socket.emit("session_ready", "Status: Online");
    });

    socket.on("message", async (data) => {
      const content = typeof data === "string" ? data : data.content;
      const type = data.type || "text";

      const msgData = {
        chatId: socket.chatId,
        senderId: socket.senderId,
        content: content,
        type: type,
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

        socket.to(socket.chatId).emit("receive_message", msgData);
        console.log("✅ Message delivered");
      } catch (err) {
        console.error("❌ Backend Error:", err);
      }
    });

    // 3. Disconnect hone par Offline mark karein
    socket.on("disconnect", () => {
      if (socket.senderId) {
        // Map se delete karein
        onlineUsers.delete(socket.senderId);

        // Sab ko batayein ke ye banda gaya (Offline)
        io.emit("user_status", { userId: socket.senderId, status: "offline" });

        console.log(`🔥 User Offline: ${socket.senderId}`);
      }
    });
  });

  return io;
};
