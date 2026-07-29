const { Client } = require("pg");
require("dotenv").config();

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

const host = getHost();
const client = new Client({
  host,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "mainexamportal",
  ssl: getSslConfig(host),
  connectionTimeoutMillis: 15000,
});

const sql = `
CREATE SCHEMA IF NOT EXISTS mainexamportal;

CREATE OR REPLACE FUNCTION mainexamportal.generate_org_id()
RETURNS text AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(org_id, '\\D', '', 'g'), '')::integer), 0) + 1
  INTO next_num
  FROM mainexamportal.organizations
  WHERE org_id ~ '^ORG[0-9]+$';

  RETURN 'ORG' || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mainexamportal.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS mainexamportal.organizations (
  org_id text PRIMARY KEY,
  name text NOT NULL,
  name_of_org text,
  description text,
  status text NOT NULL DEFAULT 'active',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION mainexamportal.sync_org_name()
RETURNS trigger AS $$
BEGIN
  IF NEW.name_of_org IS NULL THEN
    NEW.name_of_org = NEW.name;
  END IF;
  IF NEW.name IS NULL THEN
    NEW.name = NEW.name_of_org;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_org_name_before_write ON mainexamportal.organizations;
CREATE TRIGGER sync_org_name_before_write
BEFORE INSERT OR UPDATE ON mainexamportal.organizations
FOR EACH ROW EXECUTE FUNCTION mainexamportal.sync_org_name();

CREATE TABLE IF NOT EXISTS mainexamportal.asi_users (
  asi_id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  status text NOT NULL DEFAULT 'active',
  org_id text REFERENCES mainexamportal.organizations(org_id) ON DELETE SET NULL,
  full_name text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by bigint,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.asi_details (
  detail_id bigserial PRIMARY KEY,
  asi_id bigint NOT NULL REFERENCES mainexamportal.asi_users(asi_id) ON DELETE CASCADE,
  name text,
  mobile text,
  age integer,
  gender text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by bigint,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (asi_id)
);

CREATE TABLE IF NOT EXISTS mainexamportal.users (
  user_id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  org_id text REFERENCES mainexamportal.organizations(org_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.user_details (
  detail_id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES mainexamportal.users(user_id) ON DELETE CASCADE,
  name text,
  mobile text,
  age integer,
  gender text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS mainexamportal.exams (
  exam_id bigserial PRIMARY KEY,
  org_id text REFERENCES mainexamportal.organizations(org_id) ON DELETE CASCADE,
  created_by bigint,
  title text NOT NULL,
  type text NOT NULL,
  duration_min integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled',
  invigilator_id bigint,
  invigilator_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  invigilator_names text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.exam_details (
  detail_id bigserial PRIMARY KEY,
  exam_id bigint NOT NULL UNIQUE REFERENCES mainexamportal.exams(exam_id) ON DELETE CASCADE,
  description text,
  total_questions integer NOT NULL DEFAULT 0,
  total_marks numeric(10,2) NOT NULL DEFAULT 0,
  negative_marking numeric(10,2) NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.questions (
  question_id bigserial PRIMARY KEY,
  exam_id bigint NOT NULL REFERENCES mainexamportal.exams(exam_id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL,
  marks numeric(10,2) NOT NULL DEFAULT 1,
  created_by bigint,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.mcq_questions (
  option_id bigserial PRIMARY KEY,
  question_id bigint NOT NULL REFERENCES mainexamportal.questions(question_id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_by bigint,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.exam_attempt (
  attempt_id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES mainexamportal.users(user_id) ON DELETE CASCADE,
  exam_id bigint NOT NULL REFERENCES mainexamportal.exams(exam_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz,
  ended_at timestamptz,
  mcq_score numeric(10,2),
  percentage numeric(7,2),
  graded_marks numeric(10,2),
  graded_by bigint,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, exam_id)
);

CREATE TABLE IF NOT EXISTS mainexamportal.exam_answers (
  answer_id bigserial PRIMARY KEY,
  attempt_id bigint NOT NULL REFERENCES mainexamportal.exam_attempt(attempt_id) ON DELETE CASCADE,
  question_id bigint NOT NULL REFERENCES mainexamportal.questions(question_id) ON DELETE CASCADE,
  answer_payload text,
  score numeric(10,2),
  is_correct boolean,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS mainexamportal.study_material (
  material_id bigserial PRIMARY KEY,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  storage_url text NOT NULL,
  firebase_access_token text,
  org_id text REFERENCES mainexamportal.organizations(org_id) ON DELETE CASCADE,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.subscription_plans (
  plan_id bigserial PRIMARY KEY,
  plan_name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_by bigint,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.organization_subscription (
  subscription_id bigserial PRIMARY KEY,
  org_id text NOT NULL REFERENCES mainexamportal.organizations(org_id) ON DELETE CASCADE,
  plan_id bigint NOT NULL REFERENCES mainexamportal.subscription_plans(plan_id) ON DELETE CASCADE,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by bigint,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.achievements (
  achievement_id bigserial PRIMARY KEY,
  title text NOT NULL,
  description text,
  criteria jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mainexamportal.user_achievements (
  user_achievement_id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES mainexamportal.users(user_id) ON DELETE CASCADE,
  achievement_id bigint NOT NULL REFERENCES mainexamportal.achievements(achievement_id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS mainexamportal.notification_templates (
  template_id bigserial PRIMARY KEY,
  title text NOT NULL UNIQUE,
  role text,
  message text NOT NULL,
  placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asi_users_org_role ON mainexamportal.asi_users(org_id, role);
CREATE INDEX IF NOT EXISTS idx_users_org ON mainexamportal.users(org_id);
CREATE INDEX IF NOT EXISTS idx_exams_org ON mainexamportal.exams(org_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_exam ON mainexamportal.exam_attempt(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam ON mainexamportal.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_study_material_org ON mainexamportal.study_material(org_id);

INSERT INTO mainexamportal.achievements (title, description, criteria)
VALUES
  ('First Exam', 'Complete your first exam.', '{"type":"exam_count","value":1}'::jsonb),
  ('High Scorer', 'Score 80% or higher in an exam.', '{"type":"percentage","value":80}'::jsonb),
  ('Consistent Learner', 'Complete five exams.', '{"type":"exam_count","value":5}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO mainexamportal.notification_templates (title, role, message, placeholders)
VALUES
  ('Integration Alert', 'super admin', 'Organization {orgname} has been created.', '["orgname"]'::jsonb),
  ('Audit/Compliance Report', 'super admin', 'A user was added for {orgname}.', '["orgname"]'::jsonb),
  ('Security Alert', 'super admin', 'A user was removed from {orgname}.', '["orgname"]'::jsonb),
  ('Role Management', 'super admin', 'Role changed to {role} for {orgname}.', '["role","orgname"]'::jsonb),
  ('System Health Alert', 'super admin', 'System status changed at {timestamp}.', '["timestamp"]'::jsonb),
  ('Automated Update', 'super admin', 'Organization updated at {timestamp}.', '["timestamp"]'::jsonb),
  ('Org Performance', 'super admin', 'Organization {orgname} was removed.', '["orgname"]'::jsonb)
ON CONFLICT (title) DO NOTHING;
`;

async function main() {
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Tables ready in schema: mainexamportal");
}

main().catch(async (error) => {
  try {
    await client.end();
  } catch (_) {
    // Ignore close errors after a failed connection.
  }

  console.error("Table setup failed:", error.message);
  process.exit(1);
});
