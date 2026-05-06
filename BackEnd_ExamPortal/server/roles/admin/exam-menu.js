const pool = require("../../config/db");
const express = require("express");

const router = express.Router();


router.get("/invigilator/search", async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { query = "" } = req.query;

    const result = await pool.query(
      `SELECT asi_id, full_name, email
       FROM mainexamportal.asi_users
       WHERE org_id = $1
         AND role = 'invigilator'
         AND full_name ILIKE $2
       LIMIT 10`,
      [orgId, `%${query}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



router.post("/", async (req, res) => {
  try {
    const {
      title,
      type,
      description,
      startDate,
      endDate,
      duration,
      questions,
      totalMarks,
      negativeMarking,
      invigilators 
    } = req.body;

    if (!title || !type || !startDate || !endDate || !questions) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (invigilators && !Array.isArray(invigilators)) {
      return res.status(400).json({ message: "Invigilators must be an array" });
    }

    const orgId = req.user.organizationId;
    const createdBy = req.user.id;

    
    const invigilatorIds = invigilators?.map(i => i.id) || [];
    const invigilatorNames = invigilators?.map(i => i.name) || [];

    await pool.query("BEGIN");

    const examInsert = await pool.query(
      `INSERT INTO mainexamportal.exams
        (org_id, created_by, title, type, duration_min, status, is_deleted,
         invigilator_ids, invigilator_names)
       VALUES ($1,$2,$3,$4,$5,'scheduled',false,$6,$7)
       RETURNING exam_id`,
      [
        orgId,
        createdBy,
        title,
        type,
        duration || 0,
        invigilatorIds,      
        invigilatorNames     
      ]
    );

    const examId = examInsert.rows[0].exam_id;

    await pool.query(
      `INSERT INTO mainexamportal.exam_details
        (exam_id, description, total_questions, total_marks,
         negative_marking, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        examId,
        description || "",
        questions,
        totalMarks || 0,
        negativeMarking || 0,
        startDate,
        endDate
      ]
    );

    await pool.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      examId,
      invigilators
    });

  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Exam creation failed:", error);
    res.status(500).json({ error: error.message });
  }
});



router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await pool.query(
      `
      SELECT
        e.exam_id,
        e.title,
        e.type,
        e.duration_min,
        e.invigilator_ids,
        e.invigilator_names,

        ed.start_date,
        ed.end_date,
        ed.total_questions,
        ed.total_marks,

        CASE
          WHEN e.status = 'cancelled' THEN 'cancelled'
          WHEN ed.start_date > NOW() THEN 'scheduled'
          WHEN ed.end_date < NOW() THEN 'completed'
          ELSE 'active'
        END AS status,

        COALESCE(
          (SELECT COUNT(*)
           FROM mainexamportal.exam_attempt er
           WHERE er.exam_id = e.exam_id),
          0
        ) AS attempt_count,

        COALESCE(
          (SELECT ROUND(AVG(er.graded_marks), 2)
           FROM mainexamportal.exam_attempt er
           WHERE er.exam_id = e.exam_id),
          0
        ) AS avg_score

      FROM mainexamportal.exams e
      JOIN mainexamportal.exam_details ed
        ON ed.exam_id = e.exam_id

      WHERE e.org_id = $1
        AND e.is_deleted = false

      ORDER BY ed.start_date DESC
      `,
      [orgId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.get("/:id", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const exam = await pool.query(
      `SELECT
  e.*,
  ed.exam_id,
  ed.description,
  ed.total_questions,
  ed.total_marks,
  ed.negative_marking,
TO_CHAR(ed.start_date, 'YYYY-MM-DD') AS start_date,
TO_CHAR(ed.end_date, 'YYYY-MM-DD')   AS end_date
FROM mainexamportal.exams e
LEFT JOIN mainexamportal.exam_details ed
       ON ed.exam_id = e.exam_id
WHERE e.exam_id = $1
  AND e.org_id = $2
  AND e.is_deleted = false;
`,
      [req.params.id, orgId]
    );


    res.json({
      success: true,
      data: {
        ...exam.rows[0],
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.put("/:id", async (req, res) => {
  try {
    const { title, type, duration, totalQuestions } = req.body;
    const examId = req.params.id;
    const orgId = req.user.organizationId;

    await pool.query("BEGIN");

    const examResult = await pool.query(
      `UPDATE mainexamportal.exams
       SET title=$1, type=$2, duration_min=$3
       WHERE exam_id=$4 AND org_id=$5 AND is_deleted=false
       RETURNING *`,
      [title, type, duration, examId, orgId]
    );

    if (!examResult.rowCount) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Exam not found" });
    }

    const detailsResult = await pool.query(
      `UPDATE mainexamportal.exam_details
       SET total_questions=$1
       WHERE exam_id=$2
       RETURNING *`,
      [totalQuestions, examId]
    );

    await pool.query("COMMIT");

    res.json({
      success: true,
      data: {
        exam: examResult.rows[0],
        examDetails: detailsResult.rows[0]
      }
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    await pool.query(
      `UPDATE mainexamportal.exams
       SET is_deleted=true
       WHERE exam_id=$1 AND org_id=$2`,
      [req.params.id, orgId]
    );

    res.json({ success: true, message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
