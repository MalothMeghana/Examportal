const express = require("express");
const pool = require("../../config/db");
const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
      SELECT
        COUNT(*) FILTER (WHERE ea.status='evaluated' AND ea.graded_by=$1) AS total_graded,
        COUNT(*) FILTER (WHERE ea.status='submitted') AS pending,
        (SELECT COUNT(*)
         FROM mainexamportal.exams
         WHERE invigilator_id=$1 AND org_id=$2 AND is_deleted=false) AS total_exams,
       ROUND(
           AVG(
              EXTRACT(EPOCH FROM(ea.graded_at-ea.started_at))/60
           )
       )AS avg_time_min

       FROM mainexamportal.exam_attempt ea
       JOIN mainexamportal.exams e
          ON e.exam_id=ea.exam_id
       WHERE e.org_id=$2;
    `;

    const result = await pool.query(query, [invigilatorId, org_Id]);
    return res.json({ success: true,
      total_graded:result.rows[0].total_graded || 0,
      pending:result.rows[0].pending || 0,
      total_exams:result.rows[0].total_exams||0,
      avg_time_min: result.rows[0].avg_time_min ||0
  
    });
      } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


router.get("/breakdown", async (req, res) => {
  try {
    console.log("Logged in user:",req.user.id);
    console.log("Org ID:",req.user.organizationId);
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
      SELECT
         COUNT(*) FILTER (WHERE type='Coding') AS coding_exams,
         /*
         COUNT(*) FILTER (WHERE type='Descriptive') AS descriptive_exams,
         COUNT(*) FILTER (WHERE type='Mixed') AS mixed_exams,
         */
         COUNT(*) AS total_exams
      FROM mainexamportal.exams
      WHERE invigilator_id = $1
        AND org_id = $2
        AND is_deleted = false;
    `;


    const result = await pool.query(query, [invigilatorId, org_Id]);

    return res.json({ 
      success: true, 
      grading_breakdown: result.rows[0] 
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

router.get("/grade-activity", async (req, res) => {
  try {
    const invigilatorId = req.user.id;

    const query = `
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'evaluated'
          AND graded_by = $1
          AND DATE(graded_at) = CURRENT_DATE
        ) AS graded_today,

       
        COUNT(*) FILTER (
          WHERE status = 'evaluated'
          AND graded_by = $1
          AND DATE_TRUNC('week', graded_at) = DATE_TRUNC('week', CURRENT_DATE)
        ) AS graded_week,

        
        COUNT(*) FILTER (
          WHERE status = 'evaluated'
          AND graded_by = $1
          AND DATE_TRUNC('month', graded_at) = DATE_TRUNC('month', CURRENT_DATE)
        ) AS graded_month,

       
        COUNT(*) FILTER (
          WHERE status = 'evaluated'
          AND graded_by = $1
          AND DATE_TRUNC('year', graded_at) = DATE_TRUNC('year', CURRENT_DATE)
        ) AS graded_year
      FROM mainexamportal.exam_attempt;
    `;

    const result = await pool.query(query, [invigilatorId]);

    return res.json({
      success: true,
      grade_activity: result.rows[0]
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


router.get("/attempts/monthly", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
      SELECT
        TO_CHAR(ea.started_at, 'YYYY Mon') AS month,
        COUNT(*)::int AS attempts
      FROM mainexamportal.exam_attempt ea
      JOIN mainexamportal.exams e ON e.exam_id = ea.exam_id
      WHERE e.invigilator_id=$1 AND e.org_id=$2
      GROUP BY month
      ORDER BY MIN(ea.started_at)
    `;

    const result= await pool.query(query, [invigilatorId, org_Id]);
    return res.json({ success: true, monthly_attempts: result.rows });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/attempts/exam-types", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
      SELECT 
         e.title AS exam_title,
         e.type AS exam_type,
         COUNT(ea.attempt_id) AS attempt_count
      FROM mainexamportal.exams e
      LEFT JOIN mainexamportal.exam_attempt ea
          ON ea.exam_id=e.exam_id
      WHERE e.invigilator_id=$1
         AND e.org_id=$2
         AND e.is_deleted=false
      GROUP BY e.exam_id,e.title,e.type
      ORDER BY attempt_count DESC;
    `;

    const result = await pool.query(query, [invigilatorId, org_Id]);
    return res.json({ success: true, exam_attempts_trend: result.rows });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
