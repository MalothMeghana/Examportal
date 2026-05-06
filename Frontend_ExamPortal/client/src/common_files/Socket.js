import { io } from "socket.io-client";

let socket = null;
let isConnecting = false;

export function initializeSocket() {
  // ✅ if already connected, reuse
  if (socket?.connected) {
    console.log("✅ Socket already connected:", socket.id);
    return socket;
  }

  // ✅ if already created but still connecting, reuse
  if (socket && isConnecting) {
    console.log("🟡 Socket is connecting... reuse same instance");
    return socket;
  }

  // ✅ IMPORTANT FIX: prefer session token FIRST (your valid token is in sessionStorage)
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    console.warn("⚠️ No token found. Socket not initialized");
    return null;
  }

  const url = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
  console.log("🔌 Initializing Socket.io connection...", url);

  isConnecting = true;

  socket = io(url, {
    path: "/socket.io",
    transports: ["websocket"], // ✅ ok for local
    withCredentials: true,

    // ✅ send token to backend handshake auth
    auth: { token },

    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // ✅ logs all socket events (debug)
  socket.onAny((event, ...args) => {
    console.log("📥 socket event:", event, args);
  });

  socket.on("connect", () => {
    isConnecting = false;
    console.log("✅ Socket connected:", socket.id);
    console.log("📡 Socket ready to receive notifications");
  });

  socket.on("connect_error", (err) => {
    isConnecting = false;
    console.error("❌ Socket connect_error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
  });

  return socket;
}

export function onNotification(callback) {
  console.log("🔔 Setting up notification listener");

  if (!socket) {
    console.error("❌ Socket not initialized");
    return;
  }

  // ✅ prevent duplicate listeners
  socket.off("notification");

  socket.on("notification", (data) => {
    console.log("🔔 Notification received on frontend:", data);
    callback(data);
  });
}

export function offNotification() {
  if (socket) socket.off("notification");
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnecting = false;
    console.log("🔌 Socket disconnected and cleaned up");
  }
}

export function getSocket() {
  return socket;
}
