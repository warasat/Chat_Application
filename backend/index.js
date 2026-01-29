import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import { initSocket } from "./services/socket.service.js";

import cors from "cors";
import connectDB from "./config/mongoDB.js";
import { connectCassandra } from "./config/cassandra.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import notificationRoutes from "./routes/notificaton.route.js";
import uploadRoutes from "./routes/upload.route.js";
import AIRoutes from "./routes/ai.route.js";
import { connectMCP } from "./services/mcpClient.js";

connectDB();
connectCassandra();

const app = express();
app.set("trust proxy", true);
const server = http.createServer(app);
initSocket(server);

app.use(
  cors({
    origin: [
      "http://localhost:5173", // frontend dev
      "https://kareem-uncongruous-observantly.ngrok-free.dev", // ngrok
    ],
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/messages", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", AIRoutes);

app.get("/", (req, res) => {
  res.send("Backend of chat Running with MongoDB & Cassandra...");
});

const PORT = process.env.PORT;

const startServer = async () => {
  try {
    await connectMCP();

    server.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(` AI Bot is ready with MCP Tools`);
    });
  } catch (error) {
    console.error(
      " Failed to start server due to MCP connection error:",
      error,
    );
  }
};

startServer();
