import express from "express";
import http from "http";
import authRoutes from "./routes/auth-route.js";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import messageRoutes from "./routes/message-route.js";
import bodyParser from 'body-parser';
import { initSocket, getIo } from "./lib/socket.js";
import adminRoutes from "./routes/admin-route.js";

// Load environment variables
dotenv.config();
const PORT = process.env.PORT;

// Create app and server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Store io in app for routes to access
app.set('io', getIo());

// Middlewares
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL, 
  credentials: true,
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

// Start server
server.listen(PORT, async () => {
  console.log("Server is running on port " + PORT);
  try {
    await connectDB();
    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database connection failed", err);
  }
});