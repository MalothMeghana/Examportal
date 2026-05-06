const express = require("express");
const { createClient } = require("redis");
const multer = require("multer");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const uploadDir = "uploads/chat_files";
const FILE_EXPIRY_MS = 2 * 60 * 60 * 1000; 
const REDIS_EXPIRY_SEC = 2 * 60 * 60;     

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created upload directory:", uploadDir);
}
setInterval(() => {
  const now = Date.now();

  fs.readdir(uploadDir, (err, files) => {
    if (err) return;

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);

      fs.stat(filePath, (err, stats) => {
        if (!err && now - stats.mtimeMs > FILE_EXPIRY_MS) {
          fs.unlink(filePath, () =>
            console.log("🗑 Deleted expired file:", file)
          );
        }
      });
    });
  });
}, 30 * 60 * 1000); 

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = null;
let redisConnected = false;

// Only attempt Redis connection if explicitly enabled
if (process.env.ENABLE_REDIS !== 'false') {
  redis = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: false
    }
  });

  redis.connect()
    .then(() => {
      redisConnected = true;
      console.log('✅ Redis connected for chat');
    })
    .catch((err) => {
      console.warn('⚠️  Redis unavailable for chat (chat history will not persist):', err.message);
      redis = null;
    });

  redis.on('error', () => {
    if (redisConnected) {
      redisConnected = false;
      console.warn('⚠️  Redis connection lost (chat)');
    }
  });
} else {
  console.log('ℹ️  Redis disabled for chat (set ENABLE_REDIS=true to enable)');
}

const STREAM_PREFIX = "chat_stream:";
const SESSION_PREFIX = "chat_session:";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Invalid file format"));
  },
});
async function getUserRole(userId) {
  const result = await db.query(
    `SELECT role FROM "mainexamportal"."asi_users" WHERE asi_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows.length ? result.rows[0].role.toLowerCase() : null;
}
function isChatAllowed(senderRole, receiverRole) {
  if (senderRole === "superadmin") return receiverRole === "admin";
  if (senderRole === "admin") return ["superadmin", "user", "invigilator"].includes(receiverRole);
  if (senderRole === "user") return receiverRole === "admin";
  if (senderRole === "invigilator") return receiverRole === "admin";
  return false;
}

async function updateChatSession(msg) {
  if (!redis || !redisConnected) return;
  
  const sessionKey = SESSION_PREFIX + msg.roomId;

  const existingUnread = await redis.hGet(sessionKey, "unreadCount");
  const unreadCount =
    msg.target === "receiver" ? Number(existingUnread || 0) + 1 : 0;

  await redis.hSet(sessionKey, {
    roomId: msg.roomId,
    clientName: msg.clientName || "Client",
    lastMessage: msg.type === "file" ? msg.fileName : msg.content,
    lastUpdated: Date.now().toString(),
    status: msg.status || "Pending",
    unreadCount: unreadCount.toString(),
    senderRole: msg.senderRole,
    receiverRole: msg.receiverRole,
  });

  await redis.expire(sessionKey, REDIS_EXPIRY_SEC); 
}
async function addMessageToStream(msg) {
  if (!redis || !redisConnected) return;
  
  const streamKey = STREAM_PREFIX + msg.roomId;

  await redis.xAdd(streamKey, "*", {
    sender: msg.sender,
    senderRole: msg.senderRole,
    receiver: msg.receiver,
    receiverRole: msg.receiverRole,
    roomId: msg.roomId,
    timestamp: Date.now().toString(),
    type: msg.type,
    content: msg.content || "",
    fileUrl: msg.fileUrl || "",
    fileName: msg.fileName || "",
  });

  await redis.sendCommand(["XTRIM", streamKey, "MAXLEN", "~", "200"]);
  await redis.expire(streamKey, REDIS_EXPIRY_SEC); 

  await updateChatSession(msg);
}
router.post("/message", async (req, res) => {
  try {
    const { roomId, sender, receiver, content, clientName } = req.body;

    if (!roomId || !sender || !receiver || !content)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const senderRole = await getUserRole(sender);
    const receiverRole = await getUserRole(receiver);

    if (!isChatAllowed(senderRole, receiverRole))
      return res.status(403).json({ success: false, message: "Chat not allowed" });

    const msg = {
      roomId,
      sender,
      receiver,
      senderRole,
      receiverRole,
      type: "text",
      content,
      clientName,
      target: "receiver",
    };

    await addMessageToStream(msg);
    res.json({ success: true, msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

router.get("/sessions/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const roleRes = await db.query(
      `SELECT role
       FROM mainexamportal.asi_users
       WHERE asi_id = $1 AND is_deleted = false`,
      [userId]
    );

    if (!roleRes.rows.length)
      return res.status(404).json({ success: false });

    const role = roleRes.rows[0].role.toLowerCase();
    const keys = await redis.keys("chat_session:*");
    const sessions = [];

    for (const key of keys) {
      const s = await redis.hGetAll(key);
      if (!s.roomId || !s.senderRole || !s.receiverRole) continue;

      let visible = false;
      if (
        role === "superadmin" &&
        (s.senderRole === "admin" || s.receiverRole === "admin")
      ) {
        visible = true;
      }
      else if (
        role === "admin" &&
        (
          ["superadmin", "user", "invigilator"].includes(s.senderRole) ||
          ["superadmin", "user", "invigilator"].includes(s.receiverRole)
        )
      ) {
        visible = true;
      }
      else if (
        role === "invigilator" &&
        (s.senderRole === "admin" || s.receiverRole === "admin")
      ) {
        visible = true;
      }
      else if (
        role === "user" &&
        (s.senderRole === "admin" || s.receiverRole === "admin")
      ) {
        visible = true;
      }

      if (!visible) continue;

      sessions.push({
        roomId: s.roomId,
        clientName: s.clientName,
        lastMessage: s.lastMessage,
        lastUpdated: Number(s.lastUpdated),
        unreadCount: Number(s.unreadCount || 0),
        status: s.status,
        isPinned:
          role === "superadmin" &&
          (s.senderRole === "admin" || s.receiverRole === "admin"),
      });
    }
    sessions.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastUpdated - a.lastUpdated;
    });

    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Sessions API error:", err);
    res.status(500).json({ success: false });
  }
});
router.get("/contacts/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const userRes = await db.query(
      `SELECT role, org_id
       FROM mainexamportal.asi_users
       WHERE asi_id = $1
         AND is_deleted = false`,
      [userId]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { role, org_id } = userRes.rows[0];
    let contacts = [];
    if (role === "superadmin") {
      contacts = [];
    }
    else if (role === "admin") {
      const superadmin = await db.query(
        `SELECT u.asi_id, u.full_name, u.email, u.role
         FROM asi_users u
         WHERE u.asi_id = (
           SELECT created_by
           FROM asi_details
           WHERE asi_id = $1
         )
           AND u.is_deleted = false`,
        [userId]
      );
      const users = await db.query(
        `SELECT asi_id, full_name, email, role
         FROM asi_users
         WHERE role = 'user'
           AND org_id = $1
           AND is_deleted = false`,
        [org_id]
      );

      // invigilators in same org
      const invigilators = await db.query(
        `SELECT asi_id, full_name, email, role
         FROM asi_users
         WHERE role = 'invigilator'
           AND org_id = $1
           AND is_deleted = false`,
        [org_id]
      );

      contacts = [
        ...superadmin.rows,
        ...users.rows,
        ...invigilators.rows
      ];
    }
    else if (role === "invigilator") {
      const q = await db.query(
        `SELECT u.asi_id, u.full_name, u.email, u.role
         FROM asi_users u
         WHERE u.asi_id = (
           SELECT created_by
           FROM asi_details
           WHERE asi_id = $1
         )
           AND u.is_deleted = false`,
        [userId]
      );
      contacts = q.rows;
    }
    else if (role === "user") {
      const q = await db.query(
        `SELECT asi_id, full_name, email, role
         FROM asi_users
         WHERE role = 'admin'
           AND org_id = $1
           AND is_deleted = false`,
        [org_id]
      );
      contacts = q.rows;
    }

    return res.json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (err) {
    console.error("Contacts API error:", err);
    return res.status(500).json({ success: false });
  }
});
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { roomId, sender, receiver, clientName } = req.body;

    const senderRole = await getUserRole(sender);
    const receiverRole = await getUserRole(receiver);

    if (!isChatAllowed(senderRole, receiverRole))
      return res.status(403).json({ success: false, message: "Chat not allowed" });

    const msg = {
      roomId,
      sender,
      receiver,
      senderRole,
      receiverRole,
      type: "file",
      fileUrl: `/uploads/chat_files/${req.file.filename}`,
      fileName: req.file.originalname,
      clientName,
      target: "receiver",
    };

    await addMessageToStream(msg);
    res.json({ success: true, msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});


function initChatSocket(io) {
  io.on("connection", (socket) => {
    socket.on("joinRoom", async ({ roomId }) => {
      socket.join(roomId);
      await redis.hSet(SESSION_PREFIX + roomId, { unreadCount: "0" });
    });

    socket.on("sendMessage", async (msg) => {
      const senderRole = await getUserRole(msg.sender);
      const receiverRole = await getUserRole(msg.receiver);

      if (!isChatAllowed(senderRole, receiverRole)) return;

      msg.senderRole = senderRole;
      msg.receiverRole = receiverRole;
      msg.target = "receiver";

      await addMessageToStream(msg);
      io.to(msg.roomId).emit("receiveMessage", msg);
    });
  });
}

module.exports = { router, initChatSocket };
