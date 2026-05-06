const express = require("express");
const db = require("../../config/db");
const { hashPassword, comparePassword } = require("../../common_files/bcrypt");
const router = express.Router();
router.get("/summary", async (req, res) => {
  try {
    const totalClients = await db.query(
      `SELECT COUNT(*) AS total FROM mainexamportal.organizations`
    );

    const totalUsers = await db.query(
      `SELECT COUNT(*) AS total FROM mainexamportal.asi_users`
    );
    res.json({
      success: true,
      data: {
        totalClients: Number(totalClients.rows[0].total),
        activeSubscribers: 0,    
        totalUsers: Number(totalUsers.rows[0].total),
        totalRevenue: "$0",
        uptime: "99.99%",
        renewalRate: "88%"
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
      error: err.message
    });
  }
});
router.get("/clients", async (req, res) => {
  try {
    const orgs = await db.query(`
      SELECT org_id, name, description, created_at
      FROM mainexamportal.organizations
      ORDER BY created_at DESC
    `);

    const clientData = [];

    for (const org of orgs.rows) {
      const userCount = await db.query(
        `SELECT COUNT(*) AS total FROM mainexamportal.asi_users WHERE org_id = $1`,
        [org.org_id]
      );
      clientData.push({
        organization: org.name,
        subscriptionPlan: null, 
        users: Number(userCount.rows[0].total),
        exam: 0,                
        revenue: 0,              
        status: "Active",
        createdAt: org.created_at
      });
    }

    res.json({ success: true, data: clientData });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch clients",
      error: err.message
    });
  }
});
router.post("/impersonate-superadmin", async (req, res) => {
  let client;
  try {
    client = await db.connect();
    const { fullName, email, phone, password,age,gender } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName, email, phone and password are required",
      });
    }

    await client.query("BEGIN");
    const emailExists = await client.query(
      `SELECT 1 FROM mainexamportal.asi_users WHERE email = $1 AND is_deleted = false`,
      [email]
    );

    if (emailExists.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }
    // const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPassword = await hashPassword(password);
    const userResult = await client.query(
      `
      INSERT INTO mainexamportal.asi_users (
        email,
        password_hash,
        role,
        status,
        is_deleted,
        full_name,
        created_at
      )
      VALUES ($1, $2, 'superadmin', 'active', false, $3, NOW())
      RETURNING asi_id
      `,
      [email, hashedPassword, fullName]
    );
    const asi_id = userResult.rows[0].asi_id;
    await client.query(
      `
      INSERT INTO mainexamportal.asi_details (
        asi_id,
        name,
        mobile,
        age,
        gender,
        is_deleted,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, false, NOW())
      `,
      [asi_id, fullName, phone,age,gender]
    );
    await client.query("COMMIT");
    res.status(201).json({
      success: true,
      message: "Superadmin impersonated successfully",
      asi_id,
    });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }
    res.status(500).json({
      success: false,
      message: "Failed to impersonate superadmin",
      error: err.message,
    });
  } finally {
    if (client) client.release(); 
  }
  }
);
router.put("/organization/update/:org_id", async (req, res) => {
  try {
    const { org_id } = req.params;
    const { fullName, description } = req.body;

    if (!fullName || !description) {
      return res.status(400).json({
        success: false,
        message: "Full Name and Description are required"
      });
    }

    await db.query(
      `UPDATE mainexamportal.organizations SET name = $1, description = $2 WHERE org_id = $3`,
      [fullName, description, org_id]
    );

    res.json({
      success: true,
      message: "Organization updated successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update organization",
      error: err.message
    });
  }
});
router.get("/subscriptions", (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Subscription module not implemented yet"
  });
});
router.get("/activity", (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "User activity logs not implemented"
  });
});
module.exports = router;
