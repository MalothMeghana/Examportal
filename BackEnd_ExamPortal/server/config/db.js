const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const host = isProduction
  ? "/cloudsql/hrm-project-485104:asia-south1:postgres"
  : process.env.DB_HOST || "localhost";

function getSslConfig() {
  if (isProduction || process.env.DB_SSL === "false") {
    return false;
  }

  if (process.env.DB_SSL === "true") {
    return { rejectUnauthorized: false };
  }

  return host === "localhost" || host === "127.0.0.1"
    ? false
    : { rejectUnauthorized: false };
}

const pool = new Pool({
  host,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  ssl: getSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on("connect", () => {
  if (!isProduction) {
    console.log("PostgreSQL client connected");
  }
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error", err);
  process.exit(1);
});

module.exports = pool;
