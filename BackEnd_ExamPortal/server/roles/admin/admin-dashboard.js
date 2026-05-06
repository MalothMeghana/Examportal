const pool = require("../../config/db");

const getDashboardCounts = async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const activeUsers = (await pool.query(`
      SELECT COUNT(*) AS count
      FROM mainexamportal.users
      WHERE org_id = $1 AND status = 'active';
    `, [orgId])).rows[0].count;

    const studyMaterials = (await pool.query(`
      SELECT COUNT(*) AS count
      FROM mainexamportal.study_material
      WHERE org_id = $1 AND is_deleted = false;
    `, [orgId])).rows[0].count;

    const totalExams = (await pool.query(`
      SELECT COUNT(*) AS count
      FROM mainexamportal.exams
      WHERE org_id = $1 AND is_deleted = false;
    `, [orgId])).rows[0].count;

    const activeExams = (await pool.query(`
      SELECT COUNT(*) AS count
      FROM mainexamportal.exams
      WHERE org_id = $1 AND status = 'active' AND is_deleted = false;
    `, [orgId])).rows[0].count;

    const scheduledExams = (await pool.query(`
      SELECT COUNT(*) AS count
      FROM mainexamportal.exams
      WHERE org_id=$1 AND
       status = 'scheduled' AND is_deleted = false;
    `, [orgId])).rows[0].count;
    const completedExams = (await pool.query(`
      SELECT COUNT(*) AS count
      FROM mainexamportal.exams
       WHERE org_id=$1 AND
      status = 'completed' AND is_deleted = false;
    `, [orgId])).rows[0].count;

    const avgPerfData = (await pool.query(`
      SELECT 
        COALESCE(SUM(graded_marks), 0) AS total_obtained,
        COALESCE(SUM(total_marks), 0) AS total_possible
      FROM mainexamportal.exam_attempt
    `)).rows[0];

    let avgPerformance = 0;
    if (avgPerfData.total_possible > 0) {
      avgPerformance =
        (avgPerfData.total_obtained / avgPerfData.total_possible) * 100;
    }

    const lastMonthPerfData = (await pool.query(`
      SELECT 
        COALESCE(SUM(graded_marks), 0) AS total_obtained,
        COALESCE(SUM(total_marks), 0) AS total_possible
      FROM mainexamportal.exam_attempt
      WHERE created_at >= NOW() - INTERVAL '30 days';
    `)).rows[0];

    let lastMonthPerformance = 0;
    if (lastMonthPerfData.total_possible > 0) {
      lastMonthPerformance =
        (lastMonthPerfData.total_obtained /
          lastMonthPerfData.total_possible) *
        100;
    }

    const performanceChange = avgPerformance - lastMonthPerformance;

    const recentExams = (await pool.query(`
          SELECT
            e.exam_id,
            e.title,
            e.type,
            e.status,
            e.duration_min,
            ed.total_questions,
            ed.start_date,
            ed.end_date
        FROM mainexamportal.exams e
        JOIN mainexamportal.exam_details ed
            ON e.exam_id = ed.exam_id
        WHERE e.org_id = $1
          AND e.is_deleted = false
        ORDER BY ed.start_date DESC
        LIMIT 4;
    `, [orgId])).rows;

    return res.json({
      success: true,
      cards: {
        activeUsers: activeUsers,
        studyMaterials: studyMaterials,
        totalExams: totalExams,
        activeExams: activeExams,
        scheduledExams: scheduledExams,
        completedExams: completedExams,
        avgPerformance: avgPerformance,
        performanceChange: performanceChange
      },
      recent_exams: recentExams
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ "Server error":err.message });
  }
};

module.exports = { getDashboardCounts };