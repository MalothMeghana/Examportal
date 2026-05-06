const express = require("express");
const router = express.Router();
const pool = require("../../config/db");


router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      storageUrl,
      firebaseAccessToken
    } = req.body;

    const orgId = req.user.organizationId;

    if (!title || !type || !storageUrl) {
      return res.status(400).json({
        message: "Title, type and storageUrl are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO mainexamportal.study_material
        (title, description, type, storage_url, firebase_access_token, org_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        title,
        description || "",
        type,
        storageUrl,
        firebaseAccessToken || "",
        orgId
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Create Study Material Error:", error);
    res.status(500).json({ error: "Failed to add study material" });
  }
});


router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await pool.query(
      `SELECT
        material_id,
        title,
        description,
        type,
        storage_url AS "storageUrl",
        firebase_access_token AS "firebaseAccessToken",
        TO_CHAR(created_at, 'YYYY-MM-DD') AS upload_date
       FROM mainexamportal.study_material
       WHERE org_id = $1
         AND is_deleted = false
       ORDER BY created_at DESC`,
      [orgId]
    );

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Fetch Study Materials Error:", error);
    res.status(500).json({ error: "Failed to fetch study materials" });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const { title, description, type, storageUrl } = req.body;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE mainexamportal.study_material SET
        title = $1,
        description = $2,
        type = $3,
        storage_url = $4
       WHERE material_id = $5
         AND is_deleted = false
       RETURNING *`,
      [
        title,
        description || "",
        type,
        storageUrl,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Study material not found" });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Update Study Material Error:", error);
    res.status(500).json({ error: "Update failed" });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE mainexamportal.study_material SET
        is_deleted = true WHERE material_id = $1
       RETURNING material_id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Study material not found" });
    }

    return res.json({
      success: true,
      message: "Study material deleted"
    });

  } catch (error) {
    console.error("Delete Study Material Error:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
