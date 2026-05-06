const express = require("express");
const router = express.Router();

const {verifyToken} = require("../authentication/verifyToken.js");

const dashboardController = require("../roles/users/userDashboard.js");
const userExamsController = require("../roles/users/userExams.js");
const studyMaterialsController = require("../roles/users/studyMaterials.js");
const userAnalyticsController = require("../roles/users/userAnalytics.js");
const userAchievementsController = require("../roles/users/userAchievements.js");
const profileRoutes = require('../common_files/profileController.js');
const notificationRoutes = require('../utils/notificationController.js');

router.use(
  "/",
  verifyToken,
  (req, res, next) => {
    const userRole = String(req.user?.role || "").toUpperCase();

    if (userRole !== "USER") {
      return res.status(403).json({
        success: false,
        message: "Access denied: USER role required",
      });
    }

    next();
  }
);


router.use("/dashboard", dashboardController);
router.use("/study-materials", studyMaterialsController);
router.use("/analytics", userAnalyticsController);
router.use("/achievements", userAchievementsController);
router.use('/profile', profileRoutes);
router.use("/", userExamsController);

module.exports = router;
