const express = require("express");
const pool = require("../../config/db");
const router = express.Router();


router.get("/summary", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    
    const pending = await pool.query(
      `
      SELECT COUNT(*)::int AS pending
      FROM mainexamportal.exam_attempt a
      JOIN mainexamportal.exams e ON e.exam_id = a.exam_id
      WHERE a.status = 'submitted'
        AND e.invigilator_id = $1
        AND e.org_id = $2
      `,
      [invigilatorId, org_Id]
    );

    
    const graded = await pool.query(
      `
      SELECT COUNT(*)::int AS graded
      FROM mainexamportal.exam_attempt a
      JOIN mainexamportal.exams e ON e.exam_id = a.exam_id
      WHERE a.status = 'evaluated'
        AND e.invigilator_id = $1
        AND e.org_id = $2
      `,
      [invigilatorId, org_Id]
    );

    
    const total = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM mainexamportal.exam_attempt a
      JOIN mainexamportal.exams e ON e.exam_id = a.exam_id
      WHERE e.invigilator_id = $1 AND e.org_id = $2
      `,
      [invigilatorId, org_Id]
    );

    
    const examsCreated = await pool.query(
      `
      SELECT COUNT(*)::int AS exams_created
      FROM mainexamportal.exams
      WHERE invigilator_id = $1 AND org_id = $2
      AND is_deleted=false
      `,
      [invigilatorId, org_Id]
    );

    return res.json({
      success: true,
      summary: {
        pending_review: pending.rows[0].pending,
        graded: graded.rows[0].graded,
        total_submissions: total.rows[0].total,
        exams_created: examsCreated.rows[0].exams_created,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


router.get("/recent", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
     SELECT 
         ea.attempt_id,
         ea.started_at,
         ea.status,
         ud.name AS student_name,
         e.title AS exam_title
      FROM mainexamportal.exam_attempt ea
      JOIN mainexamportal.users u 
      ON u.user_id = ea.user_id
      JOIN mainexamportal.user_details ud 
      ON ud.user_id = u.user_id
      JOIN mainexamportal.exams e 
      ON e.exam_id = ea.exam_id
      WHERE e.invigilator_id = $1
      AND e.org_id = $2
      AND ea.status = 'submitted'      
      AND ud.is_deleted = false
      AND u.is_deleted = false
      ORDER BY ea.started_at DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, [invigilatorId, org_Id]);

    return res.json({ success: true, recent_submissions: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});



router.get("/progress", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
      SELECT
        e.exam_id,
        e.title AS exam_title,
        COUNT(ea.attempt_id)::int AS total_attempts,
        COUNT(*) FILTER(WHERE ea.status='evaluated'):: int AS graded_attempts

      FROM mainexamportal.exams e
      LEFT JOIN mainexamportal.exam_attempt ea ON ea.exam_id = e.exam_id
      WHERE e.invigilator_id = $1
       AND e.org_id = $2
       AND e.is_deleted=false
      GROUP BY e.exam_id,e.title
      ORDER BY e.created_at DESC;
    `;
    
    const {rows}=await pool.query(query,[
      invigilatorId,
      org_Id
    ]);

     const progress=rows.map(r=>({
      exam_title:r.exam_title,
      graded:r.graded_attempts,
      total:r.total_attempts,
      percentage:
        r.total_attempts === 0
        ?0
        :Math.round((r.graded_attempts / r.total_attempts)* 100)
     }));
     res.json({
      success:true,
      grading_progress:progress
     });
    }catch(err)
    {
      res.status(500).json({
        success:false,
        error:err.message
      });
    }
  });


router.get("/activity", async (req, res) => {
  try {
    const invigilatorId = req.user.id;
    const org_Id = req.user.organizationId;

    const query = `
      SELECT
        ea.attempt_id,
        ud.name AS student_name,
        e.title AS exam_title,
        ea.total_marks,
        ea.graded_at
      FROM mainexamportal.exam_attempt ea
      JOIN mainexamportal.exams e
        ON e.exam_id = ea.exam_id
      JOIN mainexamportal.users u
        ON u.user_id = ea.user_id
      JOIN mainexamportal.user_details ud
        ON ud.user_id = u.user_id
      WHERE ea.status = 'evaluated'
        AND ea.graded_by = $1
        AND e.org_id = $2
      ORDER BY ea.graded_at DESC
      LIMIT 5;
    `;

     const { rows }=await pool.query(query,[
      invigilatorId,
      org_Id,
     ])
     res.json({
      success:true,
      grading_activity:rows
     });
    }catch(err)
    {
      res.status(500).json({
        success:false,
        error:err.message
      });
    }
  });

module.exports = router;
