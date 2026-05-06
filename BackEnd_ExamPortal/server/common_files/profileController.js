const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../authentication/verifyToken");
const { hashPassword } = require("../common_files/bcrypt");


router.get("/profile", verifyToken, async (req, res) => {
  const { id, role } = req.user;

  if (!id || !role) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    let query;

    if (role === "user") {
      query = `
        SELECT
          d.name AS full_name,
          u.email,
          d.mobile AS phone,
          o.name_of_org AS organization_name,
          u.org_id,
          d.gender,
          d.age
        FROM mainexamportal.users u
        LEFT JOIN mainexamportal.user_details d
          ON u.user_id = d.user_id AND d.is_deleted = FALSE
        LEFT JOIN mainexamportal.organizations o
          ON u.org_id = o.org_id
        WHERE u.user_id = $1
          AND u.is_deleted = FALSE
      `;
    }

   
    else if (["admin", "superadmin", "invigilator"].includes(role)) {
      query = `
        SELECT
          u.full_name,
          u.email,
          d.mobile AS phone,
          ${
            role === "superadmin"
              ? "NULL AS organization_name, NULL AS org_id"
              : "o.name_of_org AS organization_name, u.org_id"
          },
          d.gender,
          d.age
        FROM mainexamportal.asi_users u
        LEFT JOIN mainexamportal.asi_details d
          ON u.asi_id = d.asi_id AND d.is_deleted = FALSE
        LEFT JOIN mainexamportal.organizations o
          ON u.org_id = o.org_id
        WHERE u.asi_id = $1
          AND u.is_deleted = FALSE
      `;
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    const result = await db.query(query, [id]);

    res.json({
      success: true,
      profile: result.rows[0] || null,
      hasDetails: !!result.rows[0]?.phone,
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/profile", verifyToken, async (req, res) => {
  const { id, role } = req.user;
  const { full_name, phone, gender, age } = req.body;

  if (!id || !role) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    
    if (role === "user") {
      const exists = await db.query(
        `SELECT 1 FROM mainexamportal.user_details WHERE user_id = $1 AND is_deleted = FALSE`,
        [id]
      );

      if (exists.rows.length) {
        return res.status(409).json({ message: "Details already exist" });
      }

      await db.query(
        `
        INSERT INTO mainexamportal.user_details
          (user_id, name, mobile, gender, age)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [id, full_name || null, phone, gender, age]
      );
    }


  else if (["admin", "superadmin", "invigilator"].includes(role)) {
  
  const userRes = await db.query(
    `SELECT full_name FROM mainexamportal.asi_users WHERE asi_id = $1`,
    [id]
  );

  if (!userRes.rows.length) {
    return res.status(404).json({ message: "User not found" });
  }

  const fullName = userRes.rows[0].full_name;

  const exists = await db.query(
    `SELECT 1 FROM mainexamportal.asi_details 
     WHERE asi_id = $1 AND is_deleted = FALSE`,
    [id]
  );

  if (exists.rows.length) {
    return res.status(409).json({
      message: "Details already exist. Use PUT to update.",
    });
  }

  await db.query(
    `
    INSERT INTO mainexamportal.asi_details
      (asi_id, name, mobile, gender, age,created_by)
    VALUES ($1, $2, $3, $4, $5,$6)
    `,
    [id, fullName, phone, gender, age,id]
  );
}
 else {
      return res.status(400).json({ message: "Invalid role" });
    }

    res.status(201).json({
      success: true,
      message: "Profile details created successfully",
    });
  } catch (error) {
    console.error("CREATE PROFILE DETAILS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/profile", verifyToken, async (req, res) => {
  const { id, role } = req.user;
  const { full_name, phone, gender, age, newPassword } = req.body;

  if (!id || !role) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    if (role === "user") {
      if (full_name) {
        await db.query(
          `UPDATE mainexamportal.user_details SET name = $1 WHERE user_id = $2`,
          [full_name, id]
        );
      }

      await db.query(
        `
        UPDATE mainexamportal.user_details
        SET mobile = COALESCE($1, mobile),
            gender = COALESCE($2, gender),
            age = COALESCE($3, age)
        WHERE user_id = $4
        `,
        [phone, gender, age, id]
      );

      if (newPassword) {
        const hashed = await hashPassword(newPassword);
        await db.query(
          `
          UPDATE mainexamportal.users
          SET password_hash = $1
          WHERE user_id = $2
          `,
          [hashed, id]
        );
      }
    }


    else if (["admin", "superadmin", "invigilator"].includes(role)) {
      if (full_name) {
        await db.query(
          `
          UPDATE mainexamportal.asi_users
          SET full_name = $1
          WHERE asi_id = $2
          `,
          [full_name, id]
        );

        await db.query(
          `
          UPDATE mainexamportal.asi_details
          SET name = $1
          WHERE asi_id = $2
          `,
          [full_name, id]
        );
      }

      await db.query(
        `
        UPDATE mainexamportal.asi_details
        SET mobile = COALESCE($1, mobile),
            gender = COALESCE($2, gender),
            age = COALESCE($3, age)
        WHERE asi_id = $4
        `,
        [phone, gender, age, id]
      );

      if (newPassword) {
        const hashed = await hashPassword(newPassword);
        await db.query(
          `
          UPDATE mainexamportal.asi_users
          SET password_hash = $1
          WHERE asi_id = $2
          `,
          [hashed, id]
        );
      }
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
