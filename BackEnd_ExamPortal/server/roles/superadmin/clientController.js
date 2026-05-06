const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../../config/db");
const transporter = require("../../utils/mailService");

// ✅ ADD THIS
const { broadcastToRole } = require("../../utils/notificationController");

const router = express.Router();

function generateRandomPassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendLoginEmail(to, fullName, role, orgName, password) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: `Your ${role} Login for ${orgName}`,
      html: `
        <h2>Welcome, ${fullName}</h2>
        <p>Your <b>${role}</b> account for <b>${orgName}</b> has been created.</p>

        <p><b>Login Email:</b> ${to}</p>
        <p><b>Temporary Password:</b> ${password}</p>

        <p>Please login and change your password immediately.</p>
        <br/>
        <p>Regards,<br/>ExamMarkPro Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📩 Login Email Sent To:", to);
  } catch (err) {
    console.error("❌ EMAIL SEND ERROR:", err.message);
  }
}

router.post("/", async (req, res) => {
  try {
    const { organizationName, description, email, role, fullName } = req.body;

    if (!organizationName || !email || !role || !fullName) {
      return res.status(400).json({
        success: false,
        message:
          "Organization Name, Email, Role, and Contact Person Name are required",
      });
    }

    const checkEmail = await db.query(
      `SELECT asi_id FROM mainexamportal.asi_users WHERE email=$1`,
      [email]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const newOrgIdResult = await db.query(
      `SELECT mainexamportal.generate_org_id() AS org_id`
    );
    const newOrgId = newOrgIdResult.rows[0].org_id;

    const org = await db.query(
      `INSERT INTO mainexamportal.organizations 
        (org_id, name, description, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [newOrgId, organizationName, description]
    );

    const tempPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await db.query(
      `INSERT INTO mainexamportal.asi_users 
        (email, password_hash, role, status, org_id, full_name)
       VALUES ($1, $2, $3, 'active', $4, $5)
       RETURNING *`,
      [email, passwordHash, role.toLowerCase(), newOrgId, fullName]
    );

    sendLoginEmail(email, fullName, role, organizationName, tempPassword);

    // ✅ NOTIFICATION (Use existing template: "Integration Alert" -> needs {orgname})
    try {
      await broadcastToRole("super admin", "super admin", "Integration Alert", {
        orgname: organizationName,
      });
    } catch (e) {
      console.error("Notification failed (create org):", e.message);
    }

    return res.status(201).json({
      success: true,
      message: "Organization and admin created successfully",
      organization: {
        ...org.rows[0],
        contact_person: fullName,
        contact_email: email,
        subscription: null,
      },
      contactUser: user.rows[0],
      loginPassword: tempPassword,
    });
  } catch (err) {
    console.error("CREATE ORG ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const orgs = await db.query(`
      SELECT 
        o.*,

        (
          SELECT full_name
          FROM mainexamportal.asi_users au
          WHERE au.org_id = o.org_id
            AND LOWER(au.role) = 'admin'
          ORDER BY au.created_at ASC
          LIMIT 1
        ) AS contact_person,

        (
          SELECT email
          FROM mainexamportal.asi_users au
          WHERE au.org_id = o.org_id
            AND LOWER(au.role) = 'admin'
          ORDER BY au.created_at ASC
          LIMIT 1
        ) AS contact_email,

        (
          SELECT sp.plan_name
          FROM mainexamportal.organization_subscription os
          JOIN mainexamportal.subscription_plans sp 
            ON sp.plan_id = os.plan_id
          WHERE os.org_id = o.org_id
            AND os.is_active = TRUE
            AND os.is_deleted = FALSE
          LIMIT 1
        ) AS subscription

      FROM mainexamportal.organizations o
      ORDER BY o.created_at DESC
    `);

    res.json({ success: true, data: orgs.rows });
  } catch (err) {
    console.error("GET ORGS ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:orgId/info", async (req, res) => {
  try {
    const orgId = req.params.orgId;

    const org = await db.query(
      `SELECT * FROM mainexamportal.organizations WHERE org_id=$1`,
      [orgId]
    );

    if (org.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const totals = {
      totalExams: Number(
        (
          await db.query(
            `SELECT COUNT(*) FROM mainexamportal.exams 
             WHERE org_id=$1 AND is_deleted=false`,
            [orgId]
          )
        ).rows[0].count
      ),
      totalAdmins: Number(
        (
          await db.query(
            `SELECT COUNT(*) FROM mainexamportal.asi_users 
             WHERE org_id=$1 AND role='admin'`,
            [orgId]
          )
        ).rows[0].count
      ),
      totalInvigilators: Number(
        (
          await db.query(
            `SELECT COUNT(*) FROM mainexamportal.asi_users 
             WHERE org_id=$1 AND role='invigilator'`,
            [orgId]
          )
        ).rows[0].count
      ),
      totalStudents: Number(
        (
          await db.query(
            `SELECT COUNT(*) FROM mainexamportal.users WHERE org_id=$1`,
            [orgId]
          )
        ).rows[0].count
      ),
    };

    res.json({ success: true, data: { ...org.rows[0], totals } });
  } catch (err) {
    console.error("ORG INFO ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/:orgId/users", async (req, res) => {
  try {
    const { email, role, fullName } = req.body;
    const orgId = req.params.orgId;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Full Name is required",
      });
    }

    const exists = await db.query(
      `SELECT 1 FROM mainexamportal.asi_users WHERE email=$1`,
      [email]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // fetch org name for placeholders
    const orgR = await db.query(
      `SELECT name FROM mainexamportal.organizations WHERE org_id=$1`,
      [orgId]
    );
    const orgname = orgR.rows[0]?.name || orgId;

    const tempPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await db.query(
      `INSERT INTO mainexamportal.asi_users 
        (email, password_hash, role, status, org_id, full_name)
       VALUES ($1, $2, $3, 'active', $4, $5)
       RETURNING *`,
      [email, passwordHash, role.toLowerCase(), orgId, fullName]
    );

    sendLoginEmail(email, fullName, role, orgId, tempPassword);

    // ✅ NOTIFICATION (existing template: "Audit/Compliance Report" -> needs {orgname})
    try {
      await broadcastToRole(
        "super admin",
        "super admin",
        "Audit/Compliance Report",
        { orgname }
      );
    } catch (e) {
      console.error("Notification failed (add user):", e.message);
    }

    res.status(201).json({
      success: true,
      user: user.rows[0],
      loginPassword: tempPassword,
    });
  } catch (err) {
    console.error("ADD USER ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/users/:userId", async (req, res) => {
  try {
    // get orgname before delete (for template placeholders)
    const uR = await db.query(
      `SELECT org_id FROM mainexamportal.asi_users WHERE asi_id=$1`,
      [req.params.userId]
    );
    const orgId = uR.rows[0]?.org_id;

    let orgname = "Unknown";
    if (orgId) {
      const orgR = await db.query(
        `SELECT name FROM mainexamportal.organizations WHERE org_id=$1`,
        [orgId]
      );
      orgname = orgR.rows[0]?.name || orgId;
    }

    await db.query(`DELETE FROM mainexamportal.asi_users WHERE asi_id=$1`, [
      req.params.userId,
    ]);

    // ✅ NOTIFICATION (existing template: "Security Alert" -> needs {orgname})
    try {
      await broadcastToRole("super admin", "super admin", "Security Alert", {
        orgname,
      });
    } catch (e) {
      console.error("Notification failed (delete user):", e.message);
    }

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/users/:userId/role", async (req, res) => {
  try {
    const { role } = req.body;

    // get orgname before update
    const u0 = await db.query(
      `SELECT org_id FROM mainexamportal.asi_users WHERE asi_id=$1`,
      [req.params.userId]
    );
    const orgId = u0.rows[0]?.org_id;

    let orgname = "Unknown";
    if (orgId) {
      const orgR = await db.query(
        `SELECT name FROM mainexamportal.organizations WHERE org_id=$1`,
        [orgId]
      );
      orgname = orgR.rows[0]?.name || orgId;
    }

    const user = await db.query(
      `UPDATE mainexamportal.asi_users 
       SET role=$1 
       WHERE asi_id=$2
       RETURNING *`,
      [role.toLowerCase(), req.params.userId]
    );

    // ✅ NOTIFICATION (existing template: "Role Management" -> needs {role} + {orgname})
    try {
      await broadcastToRole("super admin", "super admin", "Role Management", {
        role: role.toLowerCase(),
        orgname,
      });
    } catch (e) {
      console.error("Notification failed (update role):", e.message);
    }

    res.json({ success: true, user: user.rows[0] });
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/users/:userId/status", async (req, res) => {
  try {
    const { status } = req.body;

    // get orgname before update
    const u0 = await db.query(
      `SELECT org_id FROM mainexamportal.asi_users WHERE asi_id=$1`,
      [req.params.userId]
    );
    const orgId = u0.rows[0]?.org_id;

    let orgname = "Unknown";
    if (orgId) {
      const orgR = await db.query(
        `SELECT name FROM mainexamportal.organizations WHERE org_id=$1`,
        [orgId]
      );
      orgname = orgR.rows[0]?.name || orgId;
    }

    const user = await db.query(
      `UPDATE mainexamportal.asi_users 
       SET status=$1 
       WHERE asi_id=$2
       RETURNING *`,
      [status.toLowerCase(), req.params.userId]
    );

    // ✅ NOTIFICATION (existing template: "System Health Alert" -> needs {timestamp})
    try {
      await broadcastToRole("super admin", "super admin", "System Health Alert", {
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Notification failed (update status):", e.message);
    }

    res.json({ success: true, user: user.rows[0] });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:orgId", async (req, res) => {
  try {
    const { organizationName, description, status } = req.body;

    const result = await db.query(
      `UPDATE mainexamportal.organizations
       SET name=$1, description=$2, status=$3
       WHERE org_id=$4
       RETURNING *`,
      [organizationName, description, status, req.params.orgId]
    );

    // ✅ NOTIFICATION (existing template: "Automated Update" -> needs {timestamp})
    try {
      await broadcastToRole("super admin", "super admin", "Automated Update", {
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Notification failed (update org):", e.message);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE ORG ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:orgId", async (req, res) => {
  try {
    // get orgname before delete
    const orgR = await db.query(
      `SELECT name FROM mainexamportal.organizations WHERE org_id=$1`,
      [req.params.orgId]
    );
    const orgname = orgR.rows[0]?.name || req.params.orgId;

    await db.query(`DELETE FROM mainexamportal.organizations WHERE org_id=$1`, [
      req.params.orgId,
    ]);

    // ✅ NOTIFICATION (existing template: "Org Performance" -> needs {orgname})
    try {
      await broadcastToRole("super admin", "super admin", "Org Performance", {
        orgname,
      });
    } catch (e) {
      console.error("Notification failed (delete org):", e.message);
    }

    res.json({ success: true, message: "Organization deleted" });
  } catch (err) {
    console.error("DELETE ORG ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
