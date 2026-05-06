const express = require("express");
const router = express.Router();
const { verifyToken,authorizeRole }=require("../authentication/verifyToken.js");
const { getDashboardCounts } = require("../roles/admin/admin-dashboard");
const reports = require("../roles/admin/admin-reports");
const examManagement=require("../roles/admin/exam-management.js")
const examMenu=require("../roles/admin/exam-menu.js")
const userManagement=require("../roles/admin/user-management.js")
const studyMaterial=require("../roles/admin/study-material.js")
const analytics=require("../roles/admin/analytics.js")
const profileRoutes=require("../common_files/profileController.js")
const notificationRoutes =require("../utils/notificationController.js")


router.use(verifyToken,authorizeRole('admin'));
router.get("/dashboard",getDashboardCounts);
router.use("/questions/:id",examManagement);
router.use("/exams",examMenu);
router.use("/users",userManagement);
router.use("/study-materials",studyMaterial);
router.use("/analytics",analytics);
router.use("/reports", reports);
router.use("/profile", profileRoutes);



module.exports = router;
