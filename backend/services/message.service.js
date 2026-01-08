import { client as cassandraClient } from "../config/cassandra.js";

export const sendMessageService = async (msgData) => {
  const { chatId, senderId, content, type } = msgData;

  const query =
    "INSERT INTO messages (chat_id, message_time, sender_id, content, type) VALUES (?, ?, ?, ?, ?)";
  const params = [chatId, new Date(), senderId, content, type || "text"];

  await cassandraClient.execute(query, params, { prepare: true });

  return { status: 201, message: "Saved in Cassandra" };
};

export const getMessagesService = async (chatId) => {
  const query = "SELECT * FROM messages WHERE chat_id = ? ALLOW FILTERING";
  const result = await cassandraClient.execute(query, [chatId], {
    prepare: true,
  });
  return result.rows;
};
