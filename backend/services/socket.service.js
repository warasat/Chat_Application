import { Server } from "socket.io";
import { client as cassandraClient } from "../config/cassandra.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Connection Open: ${socket.id}`);

    socket.on("set_session", (data) => {
      socket.chatId = data.chatId;
      socket.senderId = data.senderId;

      if (data.chatId) socket.join(data.chatId);
      if (data.senderId) socket.join(data.senderId); // join user personal room

      console.log(
        `✅ Session Set: ${data.senderId} joined Chat ${data.chatId}`
      );
    });

    socket.on("message", async (data) => {
      const content = typeof data === "string" ? data : data.content;
      const type = data.type || "text";
      const receiverId = data.receiverId; // 👈 Add this from frontend when sending message

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

        // Send to everyone in chat room (if exists)
        socket.to(socket.chatId).emit("receive_message", msgData);

        // 🔥 Also emit directly to receiver personal room
        io.to(receiverId).emit("receive_message", msgData);

        // 👇 Extra: if this is the *first* message, notify receiver sidebar
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

    socket.on("disconnect", () => console.log("🔥 Door Closed"));
  });

  return io;
};

export const getIO = () => io;
