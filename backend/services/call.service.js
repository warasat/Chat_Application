import { client as cassandraClient } from "../config/cassandra.js";

export const logCallEvent = async (
  io,
  { chatId, from, receiverId, type, content },
) => {
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

    // Emit to UI
    io.to(chatId).emit("receive_message", {
      chat_id: chatId,
      sender_id: from,
      receiver_id: receiverId,
      content,
      type,
      message_time: message_time.toISOString(),
    });
  } catch (err) {
    console.error(`❌ Cassandra Error (${type}):`, err);
  }
};
