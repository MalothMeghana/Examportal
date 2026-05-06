const { Server } = require("socket.io");
const { createClient } = require("redis");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

let redisPublisher;
let redisSubscriber;
let redisReady = false;
let io;


async function initRedis() {
  if (process.env.ENABLE_REDIS !== "true" || !process.env.REDIS_URL) {
    console.warn("Redis disabled by config");
    return;
  }

  try {
    redisPublisher = createClient({ url: process.env.REDIS_URL });
    redisSubscriber = createClient({ url: process.env.REDIS_URL });

    redisPublisher.on("error", (err) =>
      console.error("❌ Redis publisher error:", err.message)
    );

    redisSubscriber.on("error", (err) =>
      console.error("❌ Redis subscriber error:", err.message)
    );

    await redisPublisher.connect();
    await redisSubscriber.connect();

    redisReady = true;
    console.log("✅ Redis connected (notifications)");

 
    await redisSubscriber.pSubscribe("notifications:*", onRedisMessage);
  } catch (err) {
    console.warn("⚠️ Redis init failed:", err.message);
    redisReady = false;
  }
}


const normalizeRoleForDB = (role) => {
  if (!role) return null;
  const r = role.trim().toLowerCase();
  return r === "superadmin" ? "super admin" : r;
};

const getTokenFromCookie = (cookieHeader) => {
  if (!cookieHeader) return null;
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="));
  return token?.split("=")[1] || null;
};

const getTokenFromHeader = (authHeader) =>
  authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

const fillTemplate = (text, data = {}) =>
  String(text).replace(/\{(\w+)\}/g, (_, k) => data[k] ?? `{${k}}`);

async function safePublish(channel, payload) {
  if (!redisReady || !redisPublisher) return;
  await redisPublisher.publish(channel, JSON.stringify(payload));
}


function initNotificationSocket(server) {
  io = new Server(server, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    cors: {
      origin: [
        "http://localhost:5173",
        "http://192.168.56.1:5174",
        "https://frontendexamportal-46732-cad1e.web.app",
      ],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
       socket.handshake.auth?.token ||  
        getTokenFromHeader(socket.request.headers.authorization) ||
        getTokenFromCookie(socket.request.headers.cookie);

      if (!token) return next(new Error("Token missing"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

      socket.userId = decoded.id;
      socket.orgId = decoded.organizationId;
      socket.roleDB = normalizeRoleForDB(decoded.role);

      socket.join(`user:${socket.userId}`);
      if (socket.roleDB) socket.join(`role:${socket.roleDB}`);
      if (socket.orgId) socket.join(`org:${socket.orgId}`);

      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected → ${socket.userId}`);
    socket.on("disconnect", () =>
      console.log(`🔌 Socket disconnected → ${socket.userId}`)
    );
  });
}


function onRedisMessage(message, channel) {
  try {
    const [, type, id] = channel.split(":");
    const raw = JSON.parse(message);

    const payload = {
      title: raw.title,
      desc: raw.message,          // ✅ frontend expects desc
      time: raw.createdAt,        // ✅ frontend expects time
      read: raw.read ?? false,
      role: raw.role,
      template_id: raw.template_id,
      data: raw.data,
    };

    if (type === "user") io.to(`user:${id}`).emit("notification", payload);
    if (type === "role") io.to(`role:${id}`).emit("notification", payload);
    if (type === "org") io.to(`org:${id}`).emit("notification", payload);

    console.log(`✅ Socket.io emit success for ${type}:${id}`);
  } catch (err) {
    console.error("❌ Redis → Socket error:", err.message);
  }
}



async function triggerNotification(userId, templateId, data = {}) {
  if (!userId || !templateId) return;

  const { rows } = await pool.query(
    `SELECT * FROM mainexamportal.notification_templates
     WHERE template_id = $1`,
    [templateId]
  );

  if (!rows.length) return;

  const tpl = rows[0];
  await safePublish(`notifications:user:${userId}`, {
    template_id: tpl.template_id,
    role: tpl.role,
    title: tpl.title,
    message: fillTemplate(tpl.message_template, data),
    data,
    createdAt: new Date().toISOString(),
    read: false,
  });
}
async function broadcastToRole(role, templateRole, title, data = {}) {
  if (!role || !title) return;

  const r = normalizeRoleForDB(role);
  const tRole = normalizeRoleForDB(templateRole || role);

  const { rows } = await pool.query(
    `SELECT * FROM mainexamportal.notification_templates
     WHERE role = $1 AND title = $2 LIMIT 1`,
    [tRole, title]
  );

  if (!rows.length) {
    console.warn(`⚠️ No template found for role=${tRole}, title=${title}`);
    return;
  }

  const tpl = rows[0];

  // ✅ create message from template
  const message = fillTemplate(tpl.message_template, data);

  // ✅ Publish RAW payload to Redis (keep it consistent)
  const rawPayload = {
    template_id: tpl.template_id,
    role: tpl.role,
    title: tpl.title,
    message,
    data,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const channel = `notifications:role:${r}`;
  console.log(`📤 About to publish to Redis: ${channel}`);

  await safePublish(channel, rawPayload);

  console.log(`✅ Redis publish success → role:${r}`);
}


async function broadcastToOrg(orgId, templateRole, title, data = {}) {
  if (!orgId || !title) return;

  const tRole = normalizeRoleForDB(templateRole);

  const { rows } = await pool.query(
    `SELECT * FROM mainexamportal.notification_templates
     WHERE role = $1 AND title = $2 LIMIT 1`,
    [tRole, title]
  );

  if (!rows.length) return;

  const tpl = rows[0];
  await safePublish(`notifications:org:${orgId}`, {
    template_id: tpl.template_id,
    role: tpl.role,
    title: tpl.title,
    message: fillTemplate(tpl.message_template, data),
    data,
    createdAt: new Date().toISOString(),
    read: false,
  });
}


module.exports = {
  initRedis,
  initNotificationSocket,
  triggerNotification,
  broadcastToRole,
  broadcastToOrg,
};
