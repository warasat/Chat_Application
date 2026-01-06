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

connectDB();
connectCassandra();

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/messages", uploadRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Backend of chat Running with MongoDB & Cassandra...");
});

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
