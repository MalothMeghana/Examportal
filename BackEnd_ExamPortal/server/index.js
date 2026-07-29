
const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require("http");

const userRoutes = require("./routes/userRoutes.js");
const adminRoutes = require("./routes/adminRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const invigilatorRoutes = require("./routes/invigilatorRoutes");
const userAuthController = require("./common_files/userAuthController.js");
const chatController = require("./utils/chatController");
const profileController = require("./common_files/profileController");
const { initNotificationSocket, initRedis } = require("./utils/notificationController.js");

const allowedOrigins = [
  'https://frontendexamportal-46732-cad1e.web.app', // default Firebase domain
  'http://localhost:5173',                         // For local development (Vite's default)
  'http://localhost:5174',                         // Alternative port if 5173 is in use
  'http://192.168.56.1:5174',                      // Network access
  'http://192.168.1.6:5174',                       // Network access
  'http://192.168.1.34:5173',                      // Network access
  // 'https://www.your-custom-domain.com'  
  // **IMPORTANT: Add your custom domain here once you have it**
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from the allowed origins, and also block requests with no origin (like Postman in some cases)
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // This is important for sending cookies
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());


// --- API Routes ---
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/invigilator", invigilatorRoutes);
app.use("/api/auth", userAuthController);
app.use("/api/chat",chatController.router);
app.use("/api", profileController);


app.get("/", (req, res) => {
  res.send("Backend is working!");
});

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initRedis();

initNotificationSocket(server);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing server or set a different PORT in .env.`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
