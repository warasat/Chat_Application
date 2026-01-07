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
      const roomID = data.chatId || data.chat_id;
      const userRoom = data.senderId || data.sender_id;

      if (roomID) socket.join(roomID);
      if (userRoom) {
        socket.senderId = userRoom;
        socket.join(userRoom);
      }

      console.log(`✅ Session: User ${userRoom} joined Room ${roomID}`);
      io.emit("user_status", { userId: userRoom, status: "online" });
    });

    // --- GET USER STATUS ---
    socket.on("get_user_status", ({ userId }) => {
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
      console.log("📨 Incoming socket data:", data);

      // 1. Extract and Normalize Data
      const chat_id = data.chat_id || data.chatId;
      const sender_id = data.sender_id || data.senderId;
      const receiver_id = data.receiver_id || data.receiverId;
      const content = data.content || "";
      const type = data.type || "text";
      const message_time = new Date(); // Current timestamp for Cassandra

      // 🛑 CRITICAL: Check for Primary Key fields (chat_id and message_time are usually PK/Clustering)
      if (!chat_id || !sender_id) {
        console.error("❌ Cannot save: chat_id or sender_id is missing");
        return;
      }

      try {
        // 2. Query matching your specific Cassandra Columns
        const query = `
          INSERT INTO messages (chat_id, message_time, content, receiver_id, sender_id, type) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const params = [
          chat_id,
          message_time,
          content,
          receiver_id || null, // Optional receiver_id
          sender_id,
          type,
        ];

        await cassandraClient.execute(query, params, { prepare: true });

        // 3. Prepare Payload for Frontend (Snake_case to match table)
        const msgPayload = {
          chat_id,
          sender_id,
          receiver_id,
          content,
          type,
          message_time: message_time.toISOString(),
        };

        // 4. Broadcast to the specific chat room
        console.log(`📤 Broadcasting to room: ${chat_id}`);
        io.to(chat_id).emit("receive_message", msgPayload);

        // 5. Sidebar update for receiver (using receiver_id room)
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

    socket.on("disconnect", () => {
      if (socket.senderId) {
        io.emit("user_status", { userId: socket.senderId, status: "offline" });
      }
    });
  });

  return io;
};

export const getIO = () => io;
