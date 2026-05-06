
const express = require("express");
const db = require("../../config/db.js");
const router = express.Router();

function getContext(req) {
  return {
    userId: req.user?.id || null,
    userRole: req.user?.role ? String(req.user.role).toUpperCase() : null,
    orgId: req.user?.organizationId || req.user?.organization_id || null,
  };
}

function formatRank(rank) {
  if (!rank) return null;
  const r = Number(rank);
  const suffix = ["th", "st", "nd", "rd"];
  const v = r % 100;
  return r + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

router.get("/summary", async (req, res) => {
  try {
    const { userId, userRole, orgId } = getContext(req);
    if (!userId || userRole !== "USER")
      return res.status(403).json({ success: false });

    const q = `
      SELECT
        (SELECT COUNT(*) FROM exams
         WHERE is_deleted = false ${orgId ? "AND org_id = $2" : ""}) AS total_exams,
        COUNT(DISTINCT ea.exam_id) AS attempted
      FROM exam_attempt ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.user_id = $1
        AND ea.status = 'submitted'
        AND e.is_deleted = false
        ${orgId ? "AND e.org_id = $2" : ""}
    `;

    const r = await db.query(q, orgId ? [userId, orgId] : [userId]);
    const row = r.rows[0] || {};

    const total = Number(row.total_exams || 0);
    const attempted = Number(row.attempted || 0);

    res.json({
      success: true,
      data: {
        totalExams: total,
        attempted,
        pending: Math.max(total - attempted, 0),
        completionRate: total
          ? Number(((attempted / total) * 100).toFixed(1))
          : 0,
      },
    });
  } catch (e) {
    console.error("SUMMARY ERROR:", e);
    res.status(500).json({ success: false });
  }
});

router.get("/performance", async (req, res) => {
  try {
    const { userId, userRole, orgId } = getContext(req);
    if (!userId || userRole !== "USER")
      return res.status(403).json({ success: false });

    const statsQ = `
      SELECT
        ROUND(AVG(ea.percentage),1) AS avg,
        MAX(ea.percentage) AS max,
        MIN(ea.percentage) AS min
      FROM exam_attempt ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.user_id = $1
        AND ea.status = 'submitted'
        AND e.is_deleted = false
        ${orgId ? "AND e.org_id = $2" : ""}
    `;

    const recentQ = `
      SELECT ea.percentage
      FROM exam_attempt ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.user_id = $1
        AND ea.status = 'submitted'
        AND e.is_deleted = false
        ${orgId ? "AND e.org_id = $2" : ""}
      ORDER BY ea.ended_at DESC
      LIMIT 2
    `;

    const [stats, recent] = await Promise.all([
      db.query(statsQ, orgId ? [userId, orgId] : [userId]),
      db.query(recentQ, orgId ? [userId, orgId] : [userId]),
    ]);

    let improvement = 0;
    if (recent.rows.length === 2) {
      improvement = recent.rows[0].percentage - recent.rows[1].percentage;
    }

    res.json({
      success: true,
      data: {
        averageScore: Number(stats.rows[0]?.avg || 0),
        highestScore: Number(stats.rows[0]?.max || 0),
        lowestScore: Number(stats.rows[0]?.min || 0),
        improvement: Number(improvement.toFixed(1)), // 🔥 FIGMA MATCH
      },
    });
  } catch (e) {
    console.error("PERFORMANCE ERROR:", e);
    res.status(500).json({ success: false });
  }
});

router.get("/ranks", async (req, res) => {
  try {
    const { userId, userRole, orgId } = getContext(req);
    if (!userId || userRole !== "USER")
      return res.status(403).json({ success: false });

    const q = `
      SELECT *
      FROM (
        SELECT
          ea.user_id,
          ea.exam_id,
          ea.percentage,
          RANK() OVER (
            PARTITION BY ea.exam_id
            ORDER BY ea.percentage DESC
          ) AS exam_rank,
          RANK() OVER (
            ORDER BY ea.percentage DESC
          ) AS overall_rank,
          ea.ended_at
        FROM exam_attempt ea
        JOIN exams e ON e.exam_id = ea.exam_id
        WHERE ea.status = 'submitted'
          AND e.is_deleted = false
          ${orgId ? "AND e.org_id = $2" : ""}
      ) ranked
      WHERE ranked.user_id = $1
      ORDER BY ranked.ended_at DESC
    `;

    const r = await db.query(q, orgId ? [userId, orgId] : [userId]);

    if (!r.rows.length) {
      return res.json({
        success: true,
        data: {
          averageRank: null,
          lastExamRank: null,
          bestExamRank: null,
          overallSubjectRank: null,
        },
      });
    }

    const examRanks = r.rows.map(x => x.exam_rank);
    const overallRanks = r.rows.map(x => x.overall_rank);

    const avgRank =
      examRanks.reduce((a, b) => a + b, 0) / examRanks.length;

    res.json({
      success: true,
      data: {
        averageRank: formatRank(Math.round(avgRank)),     // 🔥 FIGMA
        lastExamRank: formatRank(examRanks[0]),
        bestExamRank: formatRank(Math.min(...examRanks)),
        overallSubjectRank: formatRank(Math.min(...overallRanks)), // 🔥 FIGMA
      },
    });
  } catch (e) {
    console.error("RANK ERROR:", e);
    res.status(500).json({ success: false });
  }
});


router.get("/monthly-assessment", async (req, res) => {
  try {
    const { userId, userRole, orgId } = getContext(req);
    const { period } = req.query;

    if (!userId || userRole !== "USER")
      return res.status(403).json({ success: false });

    const interval = period === "1year" ? "1 year" : "6 months";

    const q = `
      SELECT
        TO_CHAR(ea.ended_at, 'Mon YYYY') AS month,
        ROUND(AVG(ea.percentage),1) AS average_score
      FROM exam_attempt ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.user_id = $1
        AND ea.status = 'submitted'
        AND ea.ended_at >= CURRENT_DATE - INTERVAL '${interval}'
        AND e.is_deleted = false
        ${orgId ? "AND e.org_id = $2" : ""}
      GROUP BY month
      ORDER BY MIN(ea.ended_at)
    `;

    const r = await db.query(q, orgId ? [userId, orgId] : [userId]);

    res.json({
      success: true,
      period: interval,
      data: r.rows,
    });
  } catch (e) {
    console.error("MONTHLY ERROR:", e);
    res.status(500).json({ success: false });
  }
});


router.get("/exam-wise-performance", async (req, res) => {
  try {
    const { userId, userRole, orgId } = getContext(req);
    if (!userId || userRole !== "USER")
      return res.status(403).json({ success: false });

    const q = `
      SELECT
        e.exam_id,
        e.title,
        ea.percentage AS score,
        ea.ended_at
      FROM exam_attempt ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.user_id = $1
        AND ea.status = 'submitted'
        AND e.is_deleted = false
        ${orgId ? "AND e.org_id = $2" : ""}
      ORDER BY ea.ended_at DESC
    `;

    const r = await db.query(q, orgId ? [userId, orgId] : [userId]);

    res.json({
      success: true,
      data: r.rows,
    });
  } catch (e) {
    console.error("EXAM-WISE ERROR:", e);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
