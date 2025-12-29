import { Server } from "socket.io";

// Create global variables that can be accessed
let ioInstance = null;
let userSocketMap = {};
let activeCalls = {};

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

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
    });
  });

  return io;
};

// Export helper functions
export const getReceiverSocketId = (userId) => userSocketMap[userId];
export const getIo = () => ioInstance;