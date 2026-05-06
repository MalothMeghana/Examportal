const { Pool } = require("pg");
require("dotenv").config();

// Use Cloud SQL socket for GCP deployment, public IP for local development
const isProduction = process.env.NODE_ENV === 'production';
const host = isProduction 
  ? `/cloudsql/hrm-project-485104:asia-south1:postgres`
  : process.env.DB_HOST || '34.100.163.82';

const pool = new Pool({
  host: host,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'postgres',
  ssl: isProduction ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on("connect", () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log("✅ PostgreSQL client connected");
  }
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error", err);
  process.exit(1);
});

// Only log pool stats in development (every 60s instead of 5s)
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    console.log("📊 PG Pool stats:", {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    });
  }, 60000);
}

module.exports = pool;


