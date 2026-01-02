import { Server } from "socket.io";
import { client as cassandraClient } from "../config/cassandra.js";

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Connection Open: ${socket.id}`);

    // 1. Ek dafa session set karein (Door Open)
    socket.on("set_session", (data) => {
      // data = { chatId: "chat_zain_ali", senderId: "6954..." }
      socket.chatId = data.chatId;
      socket.senderId = data.senderId;
      socket.join(data.chatId);

      console.log(`✅ Session Set for ${socket.id}: Room ${data.chatId}`);
      socket.emit("session_ready", "Ab aap sirf text bhej sakte hain.");
    });

    // 2. Ab sirf Sada Text receive karein
    socket.on("message", async (data) => {
      // 1. Data check karein (agar text bhejenge toh string hogi, voice bhejenge toh object)
      const content = typeof data === "string" ? data : data.content;
      const type = data.type || "text";

      console.log(`📩 New ${type} message in room ${socket.chatId}`);

      const msgData = {
        chatId: socket.chatId,
        senderId: socket.senderId,
        content: content,
        type: data.type, // Ye naya column hai
        time: new Date(),
      };

      try {
        // 2. Cassandra mein save karein (Query mein 'type' add karein)
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

        // 3. Room mein sab ko bhejien (sender ko chor kar)
        socket.to(socket.chatId).emit("receive_message", msgData);

        console.log("✅ Message saved and emitted!");
      } catch (err) {
        console.error("❌ Backend Error:", err);
      }
    });

    socket.on("disconnect", () => console.log("🔥 Door Closed"));
  });

  return io;
};
