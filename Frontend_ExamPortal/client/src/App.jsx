import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { NotificationProvider } from "./hooks/NotificationProvider";
import { Toaster } from "react-hot-toast";

/* ================= LAZY IMPORTS ================= */

// Super Admin
const Superadmin_Layout = lazy(() => import("./components/Superadmin_Layout"));
const Superadmin_Dashboard = lazy(() => import("./roles/super_admin/superadmin_Dashboard"));
const Superadmin_ClientManagement = lazy(() => import("./roles/super_admin/superadmin_ClientManagement"));
const Superadmin_SubscriptionManagement = lazy(() => import("./roles/super_admin/superadmin_SubscriptionManagement"));
const Superadmin_Revenue = lazy(() => import("./roles/super_admin/superadmin_Revenue"));
const SuperadminRealtimeAnalytics = lazy(() => import("./roles/super_admin/SuperadminRealtimeAnalytics"));
const Superadmin_Users = lazy(() => import("./roles/super_admin/superadmin_Users"));
const Superadmin_Chatbox = lazy(() => import("./roles/super_admin/superadmin_Chatbox"));

// Admin
const AdminDashboard = lazy(() => import("./roles/admin/AdminDashboard"));
const AdminExamMenu = lazy(() => import("./roles/admin/AdminExamMenu"));
const AdminExamManagement = lazy(() => import("./roles/admin/AdminExamManagement"));
const AdminUserManagement = lazy(() => import("./roles/admin/AdminUserManagement"));
const AdminStudyMaterials = lazy(() => import("./roles/admin/AdminStudyMaterials"));
const AdminRealtimeAnalytics = lazy(() => import("./roles/admin/AdminRealtimeAnalytics"));
const AdminChatbox = lazy(() => import("./roles/admin/AdminChatbox"));
const AdminReports = lazy(() => import("./roles/admin/AdminReports"));

// Invigilator
const InvigilatorLayout = lazy(() => import("./components/InvigilatorLayout"));
const InvigilatorDashboard = lazy(() => import("./roles/invigilator/Invigilatordashboard"));
const InvigilatorSubmissions = lazy(() => import("./roles/invigilator/InvigilatorSubmissions"));
const InvigilatorGradingQueue = lazy(() => import("./roles/invigilator/InvigilatorGradingQueue"));
const InvigilatorRealtimeMonitoring = lazy(() => import("./roles/invigilator/InvigilatorRealtimeMonitoring"));
const InvigilatorChatBox = lazy(() => import("./roles/invigilator/InvigilatorChatBox"));

// User
const UserDashboard = lazy(() => import("./roles/user/UserDashboard"));
const UserMyExam = lazy(() => import("./roles/user/UserMyExam"));
const UserExamPage = lazy(() => import("./roles/user/Exam"));
const UserStudyMaterials = lazy(() => import("./roles/user/UserStudyMaterials"));
const UserRealtimeAnalytics = lazy(() => import("./roles/user/UserRealtimeAnalytics"));
const UserAchievements = lazy(() => import("./roles/user/UserAchievements"));
const UserChatbox = lazy(() => import("./roles/user/UserChatbox"));

// Common
const Mainlogin = lazy(() => import("./common_files/Mainlogin"));
const Userlogin = lazy(() => import("./common_files/Userlogin"));
const Register = lazy(() => import("./common_files/Register"));
const ProtectedRoute = lazy(() => import("./ProtectedRoute"));
const PageNotFound = lazy(() => import("./PageNotFound"));
const UnAuthorize = lazy(() => import("./UnAuthorize"));

export default function App() {
  return (
    <>
     <NotificationProvider>
      <Toaster position="top-right" />

      <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
        <Routes>

          {/* DEFAULT */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* ===== AUTH ===== */}
          <Route path="/login" element={<Userlogin />} />
          <Route path="/main-login" element={<Mainlogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<UnAuthorize />} />

          {/* ===== SUPER ADMIN ===== */}
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Superadmin_Layout><Superadmin_Dashboard /></Superadmin_Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin/clients"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Superadmin_Layout><Superadmin_ClientManagement /></Superadmin_Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin/subscriptions"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Superadmin_Layout><Superadmin_SubscriptionManagement /></Superadmin_Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin/revenue"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Superadmin_Layout><Superadmin_Revenue /></Superadmin_Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin/users"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Superadmin_Layout><Superadmin_Users /></Superadmin_Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin/analytics"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Superadmin_Layout><SuperadminRealtimeAnalytics /></Superadmin_Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin/chatbox"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Superadmin_Layout><Superadmin_Chatbox /></Superadmin_Layout>
              </ProtectedRoute>
            }
          />

          {/* ===== ADMIN ===== */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/exams" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminExamMenu />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/exam-management" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminExamManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminUserManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/materials" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminStudyMaterials />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminRealtimeAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/chat" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminChatbox />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminReports/>
              </ProtectedRoute>
            } 
          />

          {/* ===== INVIGILATOR ===== */}
          <Route
            path="/invigilator/dashboard"
            element={
              <ProtectedRoute allowedRoles={["invigilator"]}>
                <InvigilatorLayout><InvigilatorDashboard /></InvigilatorLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invigilator/submission"
            element={
              <ProtectedRoute allowedRoles={["invigilator"]}>
                <InvigilatorLayout><InvigilatorSubmissions /></InvigilatorLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invigilator/grading-queue"
            element={
              <ProtectedRoute allowedRoles={["invigilator"]}>
                <InvigilatorLayout><InvigilatorGradingQueue /></InvigilatorLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invigilator/analytics"
            element={
              <ProtectedRoute allowedRoles={["invigilator"]}>
                <InvigilatorLayout><InvigilatorRealtimeMonitoring /></InvigilatorLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invigilator/chatbox"
            element={
              <ProtectedRoute allowedRoles={["invigilator"]}>
                <InvigilatorLayout><InvigilatorChatBox /></InvigilatorLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== USER ===== */}
          <Route 
            path="/user/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/exams" 
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserMyExam />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/exam/:examId" 
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserExamPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/study-materials" 
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserStudyMaterials />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/analytics" 
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserRealtimeAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/achievements" 
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserAchievements />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/chatbox" 
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserChatbox />
              </ProtectedRoute>
            } 
          />

          {/* 404 */}
          <Route path="*" element={<PageNotFound />} />

        </Routes>
      </Suspense>
       </NotificationProvider>
    </>
  );
}
