import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Create global variables that can be accessed
let ioInstance = null;
let userSocketMap = {};
let activeCalls = {};

// Socket.IO authentication middleware
const socketAuthMiddleware = (socket, next) => {
  try {
    console.log("\n=== SOCKET CONNECTION ATTEMPT ===");
    console.log("📱 Handshake query:", socket.handshake.query);
    console.log("🔐 Handshake auth:", socket.handshake.auth);
    console.log("🌐 Headers:", socket.handshake.headers);
    
    // Try to get token from multiple sources
    const token = socket.handshake.auth?.token || 
                  socket.handshake.query?.token ||
                  socket.handshake.headers?.authorization?.replace("Bearer ", "");
    
    console.log("🔑 Token received:", token ? "Yes (length: " + token.length + ")" : "No");
    
    if (!token) {
      console.log("❌ No token provided, disconnecting...");
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    
    console.log("✅ Token verified. User ID:", socket.userId);
    next();
    
  } catch (error) {
    console.log("❌ Socket authentication error:", error.message);
    console.log("🔧 Error stack:", error.stack);
    
    if (error.name === "JsonWebTokenError") {
      return next(new Error("Authentication error: Invalid token format"));
    } else if (error.name === "TokenExpiredError") {
      return next(new Error("Authentication error: Token expired"));
    }
    
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
      console.log("⚠️ No userId, disconnecting socket");
      socket.disconnect();
      return;
    }

    // Store user socket mapping
    userSocketMap[userId] = socket.id;
    console.log(`✅ User ${userId} connected with socket ${socket.id}`);

    // Emit online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    console.log(`📢 Online users: ${Object.keys(userSocketMap).length}`);

    // Handle authentication confirmation
    socket.emit("auth:success", { 
      userId,
      message: "Socket authentication successful",
      socketId: socket.id
    });

    // ... ALL YOUR EXISTING SOCKET.IO CODE ...

    socket.on("disconnect", () => {
      console.log(`👋 User ${userId} disconnected`);
      const peer = activeCalls[userId];
      if (peer) {
        delete activeCalls[peer];
        io.to(userSocketMap[peer]).emit("call:ended");
      }
      delete activeCalls[userId];
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};

// Export helper functions
export const getReceiverSocketId = (userId) => userSocketMap[userId];
export const getIo = () => ioInstance;