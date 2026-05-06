const { Server } = require("socket.io");

function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    // Client calls: socket.emit("room:join", { roomId, user })
    socket.on("room:join", ({ roomId, user }) => {
      if (!roomId) return;
      socket.join(roomId);

      // Store a tiny bit of metadata for the session (for UI lists)
      socket.data.roomId = roomId;
      socket.data.user = user || {};

      // Notify others that someone joined.
      socket.to(roomId).emit("room:user-joined", {
        socketId: socket.id,
        user: socket.data.user
      });
    });

    // WebRTC signaling relay
    socket.on("webrtc:offer", ({ roomId, offer }) => {
      if (!roomId || !offer) return;
      socket.to(roomId).emit("webrtc:offer", { from: socket.id, offer });
    });

    socket.on("webrtc:answer", ({ roomId, answer }) => {
      if (!roomId || !answer) return;
      socket.to(roomId).emit("webrtc:answer", { from: socket.id, answer });
    });

    socket.on("webrtc:ice-candidate", ({ roomId, candidate }) => {
      if (!roomId || !candidate) return;
      socket.to(roomId).emit("webrtc:ice-candidate", { from: socket.id, candidate });
    });

    // Chat relay
    socket.on("chat:message", ({ roomId, message }) => {
      if (!roomId || !message?.trim?.()) return;
      io.to(roomId).emit("chat:message", {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        from: socket.data.user || {},
        message: message.trim(),
        ts: Date.now()
      });
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      socket.to(roomId).emit("room:user-left", {
        socketId: socket.id,
        user: socket.data.user || {}
      });
    });
  });

  return io;
}

module.exports = { attachRealtime };

