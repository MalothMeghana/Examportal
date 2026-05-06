const express = require("express");

const superAdminController = require("../roles/superadmin/superAdminDashboard");
const clientController = require("../roles/superadmin/clientController");
const subscriptionController = require("../roles/superadmin/subscriptionController");
const analyticsController = require("../roles/superadmin/analyticsController");
const profileRoutes = require('../common_files/profileController.js');
const notificationRoutes  = require('../utils/notificationController.js');

const { verifyToken,authorizeRole } = require("../authentication/verifyToken");

const router = express.Router();
router.use(verifyToken,authorizeRole("superadmin"));

router.use("/dashboard", superAdminController);
router.use("/clients", clientController);
router.use("/subscriptions", subscriptionController);
router.use("/analytics", analyticsController);
router.use('/profile', profileRoutes);

module.exports = router;