const express = require("express");
const db = require("../../config/db"); 

const router = express.Router();

function getContext(req) {
  return {
    userId: req.user?.id || null,
    role: req.user?.role?.toUpperCase() || null,
    orgId: req.user?.organizationId || req.user?.organization_id || null,
    query: req.query || {},
  };
}

async function validateUserOrg(userId, orgId) {
  if (!orgId) return true;

  try {
    const q = `SELECT org_id FROM mainexamportal.users WHERE user_id = $1`;
    const r = await db.query(q, [userId]);

    if (!r.rows.length) return false;
    return String(r.rows[0].org_id) === String(orgId);
  } catch (error) {
    console.warn("⚠️ User validation skipped:", error.message);
    return true;
  }
}

function formatAchievementRow(row) {
  return {
    id: row.achievement_id,
    title: row.title,
    description: row.description,
    criteria: row.criteria || null,
    status: row.unlocked_at ? "Unlocked" : "Locked",
    unlockedAt: row.unlocked_at || null,
  };
}

router.get("/overview", async (req, res) => {
  try {
    const { userId, role, orgId } = getContext(req);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (role !== "USER") {
      return res.status(403).json({
        success: false,
        message: "Access denied: USER role required",
      });
    }

    if (!(await validateUserOrg(userId, orgId))) {
      return res.status(403).json({
        success: false,
        message: "User does not belong to this organization",
      });
    }

    const q = `
      SELECT 
        a.achievement_id,
        a.title,
        a.description,
        a.criteria,
        ua.unlocked_at
      FROM mainexamportal.achievements a
      LEFT JOIN mainexamportal.user_achievements ua
        ON ua.achievement_id = a.achievement_id
       AND ua.user_id = $1
      WHERE a.is_deleted = FALSE
      ORDER BY a.achievement_id ASC
    `;
    const r = await db.query(q, [userId]);
    const rows = r.rows || [];

    const allAchievements = rows.map(formatAchievementRow);

    const total = allAchievements.length;
    const unlockedAchievements = allAchievements.filter(
      (a) => a.status === "Unlocked"
    );
    const unlocked = unlockedAchievements.length;
    const locked = total - unlocked;

    const recentAchievements = [...unlockedAchievements]
      .sort((a, b) => {
        const da = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dbt = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dbt - da; 
      })
      .slice(0, 5); 
    return res.json({
      success: true,
      data: {
        stats: {
          totalAchievements: total,
          unlocked,
          locked,
        },
        recentAchievements,
        allAchievements,
      },
    });
  } catch (err) {
    console.error("Achievements overview error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load achievements",
    });
  }
});


router.get("/stats", async (req, res) => {
  try {
    const { userId, role, orgId } = getContext(req);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
    if (role !== "USER") {
      return res.status(403).json({ success: false, message: "USER role required" });
    }
    if (!(await validateUserOrg(userId, orgId))) {
      return res.status(403).json({
        success: false,
        message: "User does not belong to this organization",
      });
    }

    const q = `
      SELECT 
        a.achievement_id,
        ua.unlocked_at
      FROM mainexamportal.achievements a
      LEFT JOIN mainexamportal.user_achievements ua
        ON ua.achievement_id = a.achievement_id
       AND ua.user_id = $1
      WHERE a.is_deleted = FALSE
    `;
    const r = await db.query(q, [userId]);
    const rows = r.rows || [];

    const total = rows.length;
    const unlocked = rows.filter((row) => row.unlocked_at).length;
    const locked = total - unlocked;

    return res.json({
      success: true,
      data: {
        totalAchievements: total,
        unlocked,
        locked,
      },
    });
  } catch (err) {
    console.error("Achievements stats error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load achievement stats",
    });
  }
});


router.get("/list", async (req, res) => {
  try {
    const { userId, role, orgId } = getContext(req);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
    if (role !== "USER") {
      return res.status(403).json({ success: false, message: "USER role required" });
    }
    if (!(await validateUserOrg(userId, orgId))) {
      return res.status(403).json({
        success: false,
        message: "User does not belong to this organization",
      });
    }

    const q = `
      SELECT 
        a.achievement_id,
        a.title,
        a.description,
        a.criteria,
        ua.unlocked_at
      FROM mainexamportal.achievements a
      LEFT JOIN mainexamportal.user_achievements ua
        ON ua.achievement_id = a.achievement_id
       AND ua.user_id = $1
      WHERE a.is_deleted = FALSE
      ORDER BY 
        CASE WHEN ua.unlocked_at IS NULL THEN 1 ELSE 0 END,
        ua.unlocked_at DESC NULLS LAST,
        a.achievement_id ASC
    `;
    const r = await db.query(q, [userId]);
    const rows = r.rows || [];

    const achievements = rows.map(formatAchievementRow);

    return res.json({
      success: true,
      data: achievements,
    });
  } catch (err) {
    console.error("Achievements list error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load achievements list",
    });
  }
});

// Default route for GET /achievements
router.get("/", async (req, res) => {
  try {
    const { userId, role, orgId } = getContext(req);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
    if (role !== "USER") {
      return res.status(403).json({ success: false, message: "USER role required" });
    }
    if (!(await validateUserOrg(userId, orgId))) {
      return res.status(403).json({
        success: false,
        message: "User does not belong to this organization",
      });
    }

    const q = `
      SELECT 
        a.achievement_id,
        a.title,
        a.description,
        a.criteria,
        ua.unlocked_at
      FROM mainexamportal.achievements a
      LEFT JOIN mainexamportal.user_achievements ua
        ON ua.achievement_id = a.achievement_id
       AND ua.user_id = $1
      WHERE a.is_deleted = FALSE
      ORDER BY 
        CASE WHEN ua.unlocked_at IS NULL THEN 1 ELSE 0 END,
        ua.unlocked_at DESC NULLS LAST,
        a.achievement_id ASC
    `;
    const r = await db.query(q, [userId]);
    const rows = r.rows || [];

    const achievements = rows.map(formatAchievementRow);

    return res.json({
      success: true,
      data: achievements,
    });
  } catch (err) {
    console.error("Get all achievements error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load achievements",
    });
  }
});

module.exports = router;
