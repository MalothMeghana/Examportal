const pool = require("../../config/db");
const express = require("express");
const router = express.Router();

router.get("/stats/exams", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await pool.query(
      `SELECT
      (
        SELECT COUNT(*)
        FROM mainexamportal.exams
        WHERE org_id = $1
          AND is_deleted = false
      ) AS total_exams_created,

      
      (
        SELECT COUNT(*)
        FROM mainexamportal.exam_attempt ea
        JOIN mainexamportal.exams e
            ON e.exam_id = ea.exam_id
        WHERE e.org_id = $1
      ) AS total_attempts,

      
      (
        SELECT
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE
              (COUNT(*) FILTER (WHERE ea.status = 'submitted') * 100.0)
              / COUNT(*)
          END
        FROM mainexamportal.exam_attempt ea
        JOIN mainexamportal.exams e
            ON e.exam_id = ea.exam_id
        WHERE e.org_id = $1
      ) AS avg_completion_rate,

      
      (
        SELECT
          COALESCE(AVG(ea.graded_marks), 0)
        FROM mainexamportal.exam_attempt ea
        JOIN mainexamportal.exams e
            ON e.exam_id = ea.exam_id
        WHERE e.org_id = $1
      ) AS avg_score;

      `,
      [orgId]
    );

    res.json({ success: true, examStats: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/users", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const query = `
      SELECT
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE role = 'student') AS total_students,
    COUNT(*) FILTER (WHERE role = 'invigilator') AS total_invigilators,
    COUNT(*) FILTER (WHERE status = 'active') AS active_users
FROM (
    -- Students from users table
    SELECT
        u.user_id AS id,
        'student' AS role,
        u.status
    FROM mainexamportal.users u
    WHERE u.org_id = $1
      AND u.is_deleted = false

    UNION ALL

    -- Invigilators from asi_users table
    SELECT
        au.asi_id AS id,
        au.role,
        au.status
    FROM mainexamportal.asi_users au
    WHERE au.org_id = $1
      AND au.role = 'invigilator'
      AND au.is_deleted = false
) combined_users;

    `;

    const result = await pool.query(query, [orgId]);

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching stats : ",err });
  }
});

module.exports=router;
