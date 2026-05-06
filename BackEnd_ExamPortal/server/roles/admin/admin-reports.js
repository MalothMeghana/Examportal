const express = require("express");
const pool = require("../../config/db");

const router = express.Router();


router.get("/overview", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await pool.query(
      `
      SELECT
        u.user_id AS "userId",
        ud.name AS name,

        COUNT(ea.attempt_id)
          FILTER (WHERE ea.status <> 'cancelled')
          AS attempts,

        COALESCE(
          ROUND(AVG(ea.percentage)
          FILTER (WHERE ea.status = 'evaluated'), 2),
          0
        ) AS avg,
        TO_CHAR(MAX(ea.created_at), 'YYYY-MM-DD') AS date


      FROM mainexamportal.users u
      JOIN mainexamportal.user_details ud
        ON ud.user_id = u.user_id
       AND ud.is_deleted = false

      LEFT JOIN mainexamportal.exam_attempt ea
        ON ea.user_id = u.user_id

      WHERE u.org_id = $1
        AND u.is_deleted = false

      GROUP BY u.user_id, ud.name
      ORDER BY date DESC NULLS LAST
      `,
      [orgId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Overview report error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/exams", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await pool.query(
      `
      SELECT
        e.exam_id AS "examId",
        e.title,

        COUNT(DISTINCT ea.user_id)
          FILTER (WHERE ea.status <> 'cancelled')
          AS "totalStudents",

        COALESCE(
          ROUND(AVG(ea.percentage)
          FILTER (WHERE ea.status = 'evaluated'), 2),
          0
        ) AS avg,

        TO_CHAR(MAX(ea.created_at), 'YYYY-MM-DD') AS date

      FROM mainexamportal.exams e
      LEFT JOIN mainexamportal.exam_attempt ea
        ON ea.exam_id = e.exam_id

      WHERE e.org_id = $1
        AND e.is_deleted = false

      GROUP BY e.exam_id, e.title
      ORDER BY date DESC NULLS LAST
      `,
      [orgId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Exam summary error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/exams/:id", async (req, res) => {
  try {
    const examId = req.params.id;

    const result = await pool.query(
      `
      SELECT
        ud.name,
        ea.mcq_score,
        ea.codescrip_score,
        ea.total_marks,
        ea.percentage,
        TO_CHAR(ea.created_at, 'YYYY-MM-DD') AS date,
        ea.status

      FROM mainexamportal.exam_attempt ea
      JOIN mainexamportal.user_details ud
        ON ud.user_id = ea.user_id
       AND ud.is_deleted = false

      WHERE ea.exam_id = $1
        AND ea.status <> 'cancelled'

      ORDER BY ea.created_at DESC
      `,
      [examId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Exam details error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/users", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await pool.query(
      `
      SELECT
        u.user_id AS "userId",
        ud.name,

        COUNT(ea.attempt_id)
          FILTER (WHERE ea.status <> 'cancelled')
          AS attempts,

        COALESCE(
          ROUND(AVG(ea.percentage)
          FILTER (WHERE ea.status = 'evaluated'), 2),
          0
        ) AS avg,

        TO_CHAR(MAX(ea.created_at), 'YYYY-MM-DD') AS date


      FROM mainexamportal.users u
      JOIN mainexamportal.user_details ud
        ON ud.user_id = u.user_id
       AND ud.is_deleted = false

      LEFT JOIN mainexamportal.exam_attempt ea
        ON ea.user_id = u.user_id

      WHERE u.org_id = $1
        AND u.is_deleted = false

      GROUP BY u.user_id, ud.name
      ORDER BY date DESC NULLS LAST
      `,
      [orgId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("User summary error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(
      `
      SELECT
        e.title,
        ea.mcq_score,
        ea.codescrip_score,
        ea.total_marks,
        ea.percentage,
        TO_CHAR(ea.created_at, 'YYYY-MM-DD') AS date,
        ea.status

      FROM mainexamportal.exam_attempt ea
      JOIN mainexamportal.exams e
        ON e.exam_id = ea.exam_id

      WHERE ea.user_id = $1
        AND ea.status <> 'cancelled'

      ORDER BY ea.created_at DESC
      `,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("User details error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
