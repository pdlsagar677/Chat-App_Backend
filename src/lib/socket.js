import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Create global variables that can be accessed
let ioInstance = null;
let userSocketMap = {};
let activeCalls = {};

// Socket.IO authentication middleware
const socketAuthMiddleware = (socket, next) => {
  try {
    // Try to get token from query parameters (for mobile)
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      console.log("No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
    
  } catch (error) {
    console.log("Socket authentication error:", error.message);
    return next(new Error("Authentication error: Invalid token"));
  }
};

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  ioInstance = io;

  // Use middleware for all connections
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.userId;
    
    if (!userId) {
      socket.disconnect();
      return;
    }

    // Store user socket mapping
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Emit online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Handle authentication confirmation
    socket.emit("auth:success", { userId });

    // ... ALL YOUR EXISTING SOCKET.IO CODE ...

    socket.on("disconnect", () => {
      const peer = activeCalls[userId];
      if (peer) {
        delete activeCalls[peer];
        io.to(userSocketMap[peer]).emit("call:ended");
      }
      delete activeCalls[userId];
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
};

// Export helper functions
export const getReceiverSocketId = (userId) => userSocketMap[userId];
export const getIo = () => ioInstance;