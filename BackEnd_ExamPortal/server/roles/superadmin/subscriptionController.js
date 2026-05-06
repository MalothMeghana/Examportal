const express = require("express");
const db = require("../../config/db");
const router = express.Router();
router.post("/", async (req, res) => {
  try {
    const { planTitle, price, billingCycle, features, createdBy } = req.body;

    if (!planTitle || !price || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: "Plan Title, Price and Billing Cycle are required",
      });
    }

    const query = `
      INSERT INTO mainexamportal.subscription_plans
      (plan_name, price, billing_cycle, features, created_by)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING *
    `;

    const result = await db.query(query, [
      planTitle,
      price,
      billingCycle.toLowerCase(),
      JSON.stringify(features || []),
      createdBy || null,
    ]);

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        sp.*,
        (
          SELECT COUNT(*)
          FROM mainexamportal.organization_subscription os
          WHERE os.plan_id = sp.plan_id
          AND os.is_active = TRUE
        ) AS active_clients
      FROM mainexamportal.subscription_plans sp
      ORDER BY sp.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/:planId", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM mainexamportal.subscription_plans WHERE plan_id=$1`,
      [req.params.planId]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:planId", async (req, res) => {
  try {
    const { planTitle, price, billingCycle, features, status } = req.body;

    const query = `
      UPDATE mainexamportal.subscription_plans
      SET 
        plan_name = $1,
        price = $2,
        billing_cycle = $3,
        features = $4::jsonb,
        status = COALESCE($5, status)
      WHERE plan_id = $6
      RETURNING *
    `;

    const result = await db.query(query, [
      planTitle,
      price,
      billingCycle.toLowerCase(),
      JSON.stringify(features || []),
      status || null,
      req.params.planId,
    ]);

    res.json({
      success: true,
      message: "Plan updated successfully",
      data: result.rows[0],
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.delete("/:planId", async (req, res) => {
  try {
    await db.query(
      `DELETE FROM mainexamportal.subscription_plans WHERE plan_id=$1`,
      [req.params.planId]
    );

    res.json({
      success: true,
      message: "Plan deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/assign", async (req, res) => {
  try {
    const { orgId, planId, durationMonths, createdBy } = req.body;

    if (!orgId || !planId || !durationMonths) {
      return res.status(400).json({
        success: false,
        message: "orgId, planId, durationMonths are required",
      });
    }

    await db.query(`
      UPDATE mainexamportal.organization_subscription
      SET is_active = FALSE, is_deleted = TRUE
      WHERE org_id = $1 AND is_active = TRUE
    `, [orgId]);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const result = await db.query(`
      INSERT INTO mainexamportal.organization_subscription
      (org_id, plan_id, start_date, end_date, is_active, created_by)
      VALUES ($1, $2, $3, $4, TRUE, $5)
      RETURNING *
    `, [
      orgId,
      planId,
      startDate,
      endDate,
      createdBy || null
    ]);

    res.json({
      success: true,
      message: "Subscription assigned successfully",
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get("/org/:orgId", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT os.*, sp.plan_name, sp.features
      FROM mainexamportal.organization_subscription os
      JOIN mainexamportal.subscription_plans sp
        ON sp.plan_id = os.plan_id
      WHERE os.org_id = $1
        AND os.is_active = TRUE
    `, [req.params.orgId]);

    res.json({ success: true, data: result.rows[0] });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;