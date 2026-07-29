const { Client } = require("pg");
require("dotenv").config();

const DEFAULT_DATABASE_NAME = "mainexamportal";
const DEFAULT_SCHEMA_NAME = "mainexamportal";

const databaseName = process.argv[2] || process.env.DB_NAME || DEFAULT_DATABASE_NAME;
const schemaName = process.argv[3] || DEFAULT_SCHEMA_NAME;
const isProduction = process.env.NODE_ENV === "production";

function getHost() {
  return isProduction
    ? "/cloudsql/hrm-project-485104:asia-south1:postgres"
    : process.env.DB_HOST || "localhost";
}

function getSslConfig(host) {
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

function assertValidIdentifier(value, label) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`${label} must be a valid PostgreSQL identifier: ${value}`);
  }
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function clientConfig(database) {
  const host = getHost();

  return {
    host,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database,
    ssl: getSslConfig(host),
    connectionTimeoutMillis: 15000,
  };
}

async function main() {
  assertValidIdentifier(databaseName, "Database name");
  assertValidIdentifier(schemaName, "Schema name");

  const maintenanceDatabase = process.env.DB_MAINTENANCE_NAME || "postgres";
  const adminClient = new Client(clientConfig(maintenanceDatabase));

  await adminClient.connect();

  const existingDatabase = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName]
  );

  if (existingDatabase.rowCount === 0) {
    await adminClient.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.log(`Created database: ${databaseName}`);
  } else {
    console.log(`Database already exists: ${databaseName}`);
  }

  await adminClient.end();

  const appClient = new Client(clientConfig(databaseName));
  await appClient.connect();
  await appClient.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)}`);
  console.log(`Schema ready: ${schemaName}`);
  await appClient.end();
}

main().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exit(1);
});
