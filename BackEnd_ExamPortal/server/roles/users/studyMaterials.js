
const express = require("express");
const db = require("../../config/db.js");

const router = express.Router();



function getUser(req) {
  return {
    userId: req.user?.id || null,
    orgId: req.user?.organizationId || req.user?.organization_id || null,
    role: req.user?.role ? String(req.user.role).toUpperCase() : null,
  };
}

async function validateUserOrg(userId, orgId) {
  if (!orgId) return false;

  try {
    const result = await db.query(
      `SELECT org_id FROM mainexamportal.users WHERE user_id = $1`,
      [userId]
    );

    if (!result.rows.length) return false;

    return String(result.rows[0].org_id) === String(orgId);
  } catch (error) {
    // If table doesn't exist, skip validation temporarily
    console.warn("⚠️ User validation skipped (table not found):", error.message);
    return false;
  }
}



router.get("/", async (req, res) => {
  try {
    const { userId, orgId, role } = getUser(req); // All variables used for auth/validation

    if (!userId)
      return res.status(400).json({ success: false, message: "User not authenticated" });

    if (role !== "USER")
      return res.status(403).json({ success: false, message: "Only USER access allowed" });

    const belongsToOrg = await validateUserOrg(userId, orgId);
    if (!belongsToOrg)
      return res.status(403).json({ success: false, message: "Invalid organization access" });

    const category = req.query.category || null;

    let query = `
      SELECT 
        material_id,
        title,
        description,
        type,
        created_at
      FROM mainexamportal.study_material
      WHERE org_id = $1 AND is_deleted = FALSE
    `;

    const params = [orgId];

    if (category) {
      params.push(category);
      query += ` AND LOWER(type) = LOWER($${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: result.rows.map(item => ({
        id: item.material_id,
        title: item.title,
        description: item.description,
        type: item.type,
        uploadedOn: item.created_at
      })),
    });

  } catch (error) {
    console.error("Study Materials Error →", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch study materials"
    });
  }
});



router.get("/categories", async (req, res) => {
  try {
    const categories = [
      "Model Question Paper",
      "Test Paper",
      "Monk Test Paper",
      "Lab Manual"
    ];

    return res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error("Category List Error →", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories"
    });
  }
});



router.get("/:id", async (req, res) => {
  try {
    const { userId, orgId, role } = getUser(req); // All variables used for auth/validation
    const materialId = req.params.id;

    if (!userId)
      return res.status(400).json({ success: false, message: "User not authenticated" });

    if (role !== "USER")
      return res.status(403).json({ success: false, message: "Only USER access allowed" });

    const belongs = await validateUserOrg(userId, orgId);
    if (!belongs)
      return res.status(403).json({ success: false, message: "Invalid organization access" });

    const result = await db.query(
      `
      SELECT 
        material_id,
        title,
        description,
        type,
        created_at
      FROM mainexamportal.study_material
      WHERE material_id = $1 AND org_id = $2 AND is_deleted = FALSE
      `,
      [materialId, orgId]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: "Material not found" });

    const m = result.rows[0];

    return res.json({
      success: true,
      data: {
        id: m.material_id,
        title: m.title,
        description: m.description,
        type: m.type,
        uploadedOn: m.created_at
      }
    });

  } catch (error) {
    console.error("View Material Error →", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load study material details"
    });
  }
});

module.exports = router;