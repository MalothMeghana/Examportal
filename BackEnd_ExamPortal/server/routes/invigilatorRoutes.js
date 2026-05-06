const express = require("express");
const {verifyToken,authorizeRole} = require("../authentication/verifyToken.js");
const invigilatorDashboard = require('../roles/invigilator/invigilatorDashboard.js')
const submissions = require('../roles/invigilator/student_submissions.js')
const updategrade = require('../roles/invigilator/updateGrade.js');
const analytics = require('../roles/invigilator/analytics.js')
const profileRoutes = require('../common_files/profileController.js')
const  notificationRoutes  = require('../utils/notificationController.js')
const router = express.Router();

router.use(verifyToken, authorizeRole('invigilator'));

router.use("/dashboard", invigilatorDashboard);
router.use('/submissions', submissions)
router.use('/grading-queue', updategrade)
router.use('/updategrade', updategrade)
router.use('/analytics', analytics)
router.use('/profile', profileRoutes)

module.exports = router;