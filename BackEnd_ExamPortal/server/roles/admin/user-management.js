const pool = require("../../config/db");
const express = require("express");
const router = express.Router();

const bcrypt = require("../../common_files/bcrypt");
const {sendMail} = require("../../utils/mailService");



router.post("/invigilators", async (req, res) => {

  try {
    const adminId = req.user.id;
    const orgId = req.user.organizationId;
    let { name, email, mobile, gender, age } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    if (gender) {
      gender = gender.toLowerCase();
      if (!["male", "female", "other"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be 'male', 'female', or 'other'"
        });
      }
    }

    
    await pool.query("BEGIN");

    /* ---------- EMAIL CHECK ---------- */
    const emailCheck = await pool.query(
      `SELECT asi_id, org_id 
       FROM mainexamportal.asi_users 
       WHERE email = $1 AND is_deleted = false`,
      [email]
    );

    if (emailCheck.rows.length > 0) {
      await pool.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message:
          emailCheck.rows[0].org_id === orgId
            ? "Email already exists in your organization"
            : "Email already exists in another organization"
      });
    }

    /* ---------- MOBILE CHECK ---------- */
    if (mobile) {
      const mobileCheck = await pool.query(
        `SELECT ad.asi_id
         FROM mainexamportal.asi_details ad
         JOIN mainexamportal.asi_users au ON au.asi_id = ad.asi_id
         WHERE ad.mobile = $1
         AND ad.is_deleted = false
         AND au.is_deleted = false`,
        [mobile]
      );

      if (mobileCheck.rows.length > 0) {
        await pool.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Mobile number already registered"
        });
      }
    }

    /* ---------- CREATE USER ---------- */
    const rawPassword = generateRandomPassword(10);
    const passwordHash = await bcrypt.hashPassword(rawPassword);

    const userResult = await pool.query(
      `INSERT INTO mainexamportal.asi_users
       (email, password_hash, role, org_id, status, created_at, is_deleted, created_by)
       VALUES ($1, $2, 'invigilator', $3, 'active', NOW(), false, $4)
       RETURNING asi_id, email`,
      [email, passwordHash, orgId, adminId]
    );

    const asiId = userResult.rows[0].asi_id;

    /* ---------- INSERT DETAILS (FIXED) ---------- */
    await pool.query(
      `INSERT INTO mainexamportal.asi_details
       (asi_id, name, mobile, age, gender, created_at, is_deleted)
       VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
      [asiId, name, mobile || null, age || null, gender || null]
    );

    /* ---------- SEND MAIL ---------- */
    await sendMail(
      email,
      "Your Invigilator Account Credentials",
      `
      <h3>Welcome to ExamPortal</h3>
      <p>Hello <b>${name}</b>,</p>
      <p>Your invigilator account has been created.</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Password:</b> ${rawPassword}</p>
      <p>Please change your password after first login.</p>
      <br/>
      <p>Regards,<br/>ExamPortal Team</p>
      `
    );

    await pool.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Invigilator created successfully",
      data: {
        asi_id: asiId,
        name,
        email,
        role: "invigilator"
      }
    });

  } catch (error) {
     await pool.query("ROLLBACK");

    console.error("❌ Create Invigilator Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create invigilator",
      error: error.message
    });
  } 
});


router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { role = "all", search = "" } = req.query;

    const searchValue = `%${search.toLowerCase()}%`;
    let queries = [];

    
    if (role === "all" || role === "student") {
      queries.push(`
        SELECT
          u.user_id AS id,
          ud.name,
          u.email,
          ud.mobile,
          'student' AS role,
          u.status,
          TO_CHAR(u.created_at, 'YYYY-MM-DD') AS enroll_date
        FROM mainexamportal.users u
        JOIN mainexamportal.user_details ud
             ON u.user_id = ud.user_id
        WHERE u.org_id = $1
          AND u.is_deleted = false
          AND ud.is_deleted = false
          AND (
            LOWER(ud.name) LIKE $2
            OR LOWER(u.email) LIKE $2
          )
      `);
    }

    
    if (role === "all" || role === "invigilator") {
      queries.push(`
        SELECT
          au.asi_id AS id,
          ad.name,
          au.email,
          ad.mobile,
          au.role,
          au.status,
          TO_CHAR(au.created_at, 'YYYY-MM-DD') AS enroll_date
        FROM mainexamportal.asi_users au
        JOIN mainexamportal.asi_details ad
             ON au.asi_id = ad.asi_id
        WHERE au.org_id = $1
          AND au.role = 'invigilator'
          AND au.is_deleted = false
          AND ad.is_deleted = false
          AND (
            LOWER(ad.name) LIKE $2
            OR LOWER(au.email) LIKE $2
          )
      `);
    }

    
    if (role === "all" || role === "admin") {
      queries.push(`
        SELECT
          au.asi_id AS id,
          ad.name,
          au.email,
          ad.mobile,
          au.role,
          au.status,
          TO_CHAR(au.created_at, 'YYYY-MM-DD') AS enroll_date
        FROM mainexamportal.asi_users au
        JOIN mainexamportal.asi_details ad
             ON au.asi_id = ad.asi_id
        WHERE au.org_id = $1
          AND au.role = 'admin'
          AND au.is_deleted = false
          AND ad.is_deleted = false
          AND (
            LOWER(ad.name) LIKE $2
            OR LOWER(au.email) LIKE $2
          )
      `);
    }

    if (queries.length === 0) {
      return res.status(400).json({ message: "Invalid role filter" });
    }

    const finalQuery = `
      ${queries.join(" UNION ALL ")}
      ORDER BY enroll_date DESC
    `;

    const result = await pool.query(finalQuery, [orgId, searchValue]);

    res.json({
      success: true,
      count: result.rowCount,
      users: result.rows
    });

  } catch (error) {
    console.error("User Management Search Error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const userId = req.params.id;
    const { role } = req.query;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    
    if (role === "student") {
      const result = await pool.query(
        `
        SELECT
          u.user_id,
          ud.name,
          u.email,
          u.status,
          ud.age,
          ud.gender,
          ud.mobile,
          TO_CHAR(u.created_at, 'YYYY-MM-DD') AS enroll_date
        FROM mainexamportal.users u
        JOIN mainexamportal.user_details ud
             ON ud.user_id = u.user_id
        WHERE u.user_id = $1
          AND u.org_id = $2
          AND u.is_deleted = false
          AND ud.is_deleted = false
        `,
        [userId, orgId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = result.rows[0];

      return res.json({
        success: true,
        data: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role: "student",
          status: user.status,
          enrollDate: user.enroll_date,
          age: user.age,
          gender: user.gender,
          phone: user.mobile
        }
      });
    }

    if (role === "invigilator" || role === "admin") {
      const result = await pool.query(
        `
        SELECT
          au.asi_id,
          ad.name,
          au.email,
          au.role,
          au.status,
          ad.age,
          ad.gender,
          ad.mobile,
          TO_CHAR(au.created_at, 'YYYY-MM-DD') AS enroll_date
        FROM mainexamportal.asi_users au
        JOIN mainexamportal.asi_details ad
             ON ad.asi_id = au.asi_id
        WHERE au.asi_id = $1
          AND au.org_id = $2
          AND au.is_deleted = false
          AND ad.is_deleted = false
        `,
        [userId, orgId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = result.rows[0];

      return res.json({
        success: true,
        data: {
          id: user.asi_id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          enrollDate: user.enroll_date,
          age: user.age,
          gender: user.gender,
          phone: user.mobile
        }
      });
    }

    return res.status(400).json({ message: "Invalid role" });

  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const userId = req.params.id;
    const { role } = req.query; 

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    
    if (role === "student") {
      const check = await pool.query(
        `SELECT user_id
         FROM mainexamportal.users
         WHERE user_id = $1 AND org_id = $2 AND is_deleted = false`,
        [userId, orgId]
      );

      if (check.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      await pool.query(
        `UPDATE mainexamportal.users
        SET is_deleted=true
         WHERE user_id = $1 AND org_id = $2`,
        [userId, orgId]
      );

      return res.json({
        success: true,
        message: "User deleted successfully"
      });
    }

    if (role === "invigilator" || role === "admin") {
      const check = await pool.query(
        `SELECT role
         FROM mainexamportal.asi_users
         WHERE asi_id = $1 AND org_id = $2 AND is_deleted = false`,
        [userId, orgId]
      );

      if (check.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      if (check.rows[0].role === "admin") {
        return res.status(403).json({ message: "Admin cannot be deleted" });
      }

      await pool.query(
        `UPDATE mainexamportal.asi_users
        SET is_deleted=true
         WHERE asi_id = $1 AND org_id = $2`,
        [userId, orgId]
      );

      return res.json({
        success: true,
        message: "Invigilator deleted successfully"
      });
    }

    return res.status(400).json({ message: "Invalid role" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function generateRandomPassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

module.exports = router;
