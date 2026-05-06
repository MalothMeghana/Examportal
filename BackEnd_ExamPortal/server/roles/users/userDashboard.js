

const express = require("express");
const db = require("../../config/db");

 const router = express.Router();

function getUser(req) {
  console.log(req.user,"userDetails")
  return {
    userId: req.user?.id || null,
    orgId: req.user?.organizationId || req.user?.organization_id || null,
    role: req.user?.role ? String(req.user.role).toUpperCase() : null,
  };
}

async function validateUserOrg(userId, orgId) {
  if (!orgId) return false;

  const result = await db.query(
    `SELECT org_id FROM mainexamportal.users WHERE user_id = $1`,
    [userId]
  );

  if (!result.rows.length) return false;

  return String(result.rows[0].org_id) === String(orgId);
}



router.get("/overview", async (req, res) => {
  try {
    const { userId, orgId, role } = getUser(req);

    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (role !== "USER") return res.status(403).json({ success: false, message: "USER only access" });

    const belongs = await validateUserOrg(userId, orgId);
    if (!belongs) return res.status(403).json({ success: false, message: "Invalid organization access" });

    const [
      totalExamsResult,
      activeExamsResult,
      attemptedResult,
      scoreResult,
      materialsResult,
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total_exams 
         FROM mainexamportal.exams 
         WHERE is_deleted = FALSE AND org_id = $1`,
        [orgId]
      ),

      db.query(
        `SELECT COUNT(*) AS active_exams
         FROM mainexamportal.exams e
         LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = e.exam_id
         WHERE ed.start_date <= NOW()
           AND ed.end_date >= NOW()
           AND e.is_deleted = FALSE
           AND e.org_id = $1`,
        [orgId]
      ),

      db.query(
        `SELECT COUNT(DISTINCT exam_id) AS attempted_exams
         FROM mainexamportal.exam_attempt
         WHERE user_id = $1`,
        [userId]
      ),

      db.query(
        `SELECT COALESCE(ROUND(AVG(mcq_score), 2), 0) AS average_score
         FROM mainexamportal.exam_attempt
         WHERE user_id = $1 AND mcq_score IS NOT NULL`,
        [userId]
      ),

      db.query(
        `SELECT COUNT(*) AS study_materials
         FROM mainexamportal.study_material
         WHERE org_id = $1 AND is_deleted = FALSE`,
        [orgId]
      ),
    ]);

    const totalExams = Number(totalExamsResult.rows[0].total_exams);
    const activeExams = Number(activeExamsResult.rows[0].active_exams);
    const attempted = Number(attemptedResult.rows[0].attempted_exams);
    const averageScore = Number(scoreResult.rows[0].average_score);
    const studyMaterials = Number(materialsResult.rows[0].study_materials);

    return res.json({
      success: true,
      data: {
        totalExams,
        activeExams,
        attempted,
        remainingExams: Math.max(0, totalExams - attempted), // FIXED: correct remaining logic
        averageScore,
        studyMaterials,
      },
    });
  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load dashboard overview" });
  }
});



router.get("/performance", async (req, res) => {
  try {
    const { userId, role } = getUser(req);

    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (role !== "USER") return res.status(403).json({ success: false, message: "USER only access" });

    const points = await db.query(
      `SELECT 
          DATE(started_at) AS date,
          ROUND(AVG(mcq_score), 2) AS avg_score
       FROM mainexamportal.exam_attempt
       WHERE user_id = $1 AND mcq_score IS NOT NULL
       GROUP BY DATE(started_at)
       ORDER BY DATE(started_at) ASC`,
      [userId]
    );

    return res.json({
      success: true,
      data: points.rows.map(row => ({
        date: row.date,
        score: Number(row.avg_score),
      })),
    });
  } catch (error) {
    console.error("Performance Graph Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load performance graph" });
  }
});



router.get("/upcoming-exams", async (req, res) => {
  try {
    const { userId, orgId, role } = getUser(req);

    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (role !== "USER") return res.status(403).json({ success: false, message: "USER only access" });

    const belongs = await validateUserOrg(userId, orgId);
    if (!belongs) return res.status(403).json({ success: false, message: "Invalid organization access" });

    const exams = await db.query(
      `SELECT 
          e.exam_id AS id,
          e.title,
          ed.start_date AS start_time,
          e.type AS exam_mode
       FROM mainexamportal.exams e
       LEFT JOIN mainexamportal.exam_details ed ON ed.exam_id = e.exam_id
       WHERE ed.start_date > NOW()
         AND e.is_deleted = FALSE
         AND e.org_id = $1
       ORDER BY ed.start_date ASC
       LIMIT 5`,
      [orgId]
    );

    return res.json({
      success: true,
      data: exams.rows.map(exam => ({
        id: exam.id,
        title: exam.title,
        date: exam.start_time,
        tag: exam.exam_mode?.toUpperCase() === "CODING" ? "Coding" : "MCQs",
      })),
    });
  } catch (error) {
    console.error("Upcoming Exams Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load upcoming exams" });
  }
});



router.get("/achievements", async (req, res) => {
  try {
    const { userId, role } = getUser(req);

    if (!userId) return res.status(400).json({ success: false, message: "User not authenticated" });
    if (role !== "USER") return res.status(403).json({ success: false, message: "USER only access" });

    const achievements = await db.query(
      `SELECT 
          a.achievement_id AS id,
          a.title,
          a.description,
          ua.unlocked_at AS created_at
       FROM mainexamportal.user_achievements ua
       JOIN mainexamportal.achievements a ON a.achievement_id = ua.achievement_id
       WHERE ua.user_id = $1 AND a.is_deleted = FALSE
       ORDER BY ua.unlocked_at DESC
       LIMIT 10`,
      [userId]
    );

    return res.json({
      success: true,
      data: achievements.rows,
    });
  } catch (error) {
    console.error("Achievements Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load achievements" });
  }
});

module.exports = router;
