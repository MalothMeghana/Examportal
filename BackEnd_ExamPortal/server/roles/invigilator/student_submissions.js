const express = require('express');
const pool = require('../../config/db.js');
const router = express.Router();

router.get("/exams", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
      SELECT
        e.exam_id,
        e.title,
        e.type,
        e.duration_min,
        COUNT(ea.attempt_id)::int AS total_attempts,

        COUNT(*) FILTER (
          WHERE ea.status = 'evaluated'
        )::int AS graded,

        COUNT(*) FILTER (
          WHERE ea.status = 'submitted'
        )::int AS pending,

        CASE
          WHEN COUNT(*) FILTER (WHERE ea.status = 'submitted') = 0
            AND COUNT(ea.attempt_id) > 0
            THEN 'Completed'
          ELSE 'In Progress'
        END AS exam_status

      FROM mainexamportal.exams e
      LEFT JOIN mainexamportal.exam_attempt ea
        ON ea.exam_id = e.exam_id

      WHERE e.invigilator_id = $1
        AND e.org_id = $2
        AND e.is_deleted = false

      GROUP BY e.exam_id, e.title, e.type, e.duration_min
      ORDER BY e.created_at DESC;
    `;


    const { rows } = await pool.query(query, [
      invigilatorId,
      org_Id
    ]);

    res.json({
      success: true,
      submissions: rows
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});



module.exports = router;
