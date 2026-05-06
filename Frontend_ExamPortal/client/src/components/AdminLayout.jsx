import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";

import { getProfile,createProfileDetails, updateProfile, verifyPassword } from "../common_files/profileApi";

import NotificationDropdown from "../common_files/NotificationDropdown";
import { useNotifications } from "../hooks/NotificationProvider";

import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  MessageSquare,
  Menu,
  X,
  Bell,
  LogOut,
  Sun,
  Moon,
  Activity,
} from "lucide-react";


const ROLE_AVATARS = {
  admin: "/avatars/admin.png",
  superadmin: "/avatars/superadmin.png",
  invigilator: "/avatars/invigilator.png",
  user: "/avatars/user.png",
};

const PROFILE_FIELDS = [
  ["full_name", "Full Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["organization_name", "Organization Name"],
  ["org_id", "Organization ID"],
  ["gender", "Gender"],
  ["age", "Age"],
];

const MENU_ITEMS = [
  { id: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "/admin/exams", label: "Exam Menu", icon: <FileText size={18} /> },
  { id: "/admin/exam-management", label: "Exam Management", icon: <Users size={18} /> },
  { id: "/admin/users", label: "User Management", icon: <Users size={18} /> },
  { id: "/admin/materials", label: "Study Materials", icon: <BookOpen size={18} /> },
  { id: "/admin/analytics", label: "Analytics", icon: <Activity size={18} /> },
  { id: "/admin/reports", label: "Reports", icon: <FileText size={18} /> },
  { id: "/admin/chat", label: "Chatbox", icon: <MessageSquare size={18} /> },
];

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
       disconnectSocket(); 
      sessionStorage.clear();
      localStorage.clear();
      
      
      navigate('/login');
    }
  };

  const role = localStorage.getItem("role") || "admin";
  const roleAvatar = ROLE_AVATARS[role] || ROLE_AVATARS.user;



  // Initialize theme from localStorage, default to light mode
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return "light"; // Default to light mode
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
  const [hasDetails, setHasDetails] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    organization_name: "",
    org_id: "",
    gender: "",
    age: "",
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
const fetchProfile = useCallback(async () => {
  try {
    console.log("🔵 Fetching profile...");
    const data = await getProfile(); 
    console.log("🟢 Profile API response:", data);
    
    if (data?.profile) {
      console.log("✅ Profile data received:", data.profile);
      setProfileForm(prev => ({
        ...prev,
        ...data.profile,
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));

      setHasDetails(data.hasDetails || false);
    } else {
      console.warn("⚠️ No profile in response:", data);
    }
    setPasswordError("");
    setPasswordVerified(false);
  } catch (err) {
    console.warn("Profile fetch failed:", err?.message);
    setPasswordError("");
    setPasswordVerified(false);
  }
}, []);

  useEffect(() => {
    if (profileOpen) fetchProfile();
  }, [profileOpen, fetchProfile]);
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    if (name === "oldPassword" && passwordError) {
      setPasswordError("");
    }
  };

  const handleVerifyPassword = async () => {
    console.log("Verify password clicked, oldPassword:", profileForm.oldPassword);
    
    if (!profileForm.oldPassword) {
      setPasswordError("Please enter your current password");
      setPasswordVerified(false);
      return;
    }

    if (profileForm.oldPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      setPasswordVerified(false);
      return;
    }

    setVerifyingPassword(true);
    setPasswordError("");

    try {
      console.log("🔵 Calling verify-password API with password parameter...");
      // Call API at same path as change-password endpoint
      const response = await api.post("/verify-password", {
        password: profileForm.oldPassword,
      });
      console.log("🟢 Verify response:", response.data);
      
      if (response?.data?.success === true) {
        setPasswordVerified(true);
        setPasswordError("");
        console.log("✅ Password verified successfully");
      } else if (response?.data?.success === false) {
        setPasswordVerified(false);
        setPasswordError(response.data.message || "Current password is incorrect");
        console.log("❌ Password verification failed:", response.data.message);
      } else {
        setPasswordVerified(true);
        setPasswordError("");
      }
    } catch (err) {
      console.error("❌ Password verification error:", err?.response?.status, err?.response?.data?.message || err?.message);
      
      // Handle 404 - wrong endpoint path
      if (err?.response?.status === 404) {
        console.warn("⚠️ Verify-password endpoint not found (404). Check backend routing.");
        setPasswordError("Verification endpoint not available. Please contact admin.");
        setPasswordVerified(false);
        return;
      }
      
      // For other errors, don't use fallback - require proper verification
      setPasswordError(err?.response?.data?.message || "Password verification failed");
      setPasswordVerified(false);
    } finally {
      setVerifyingPassword(false);
    }
  };
  const handleSaveProfile = async () => {
  if (profileForm.newPassword || profileForm.confirmNewPassword) {
    if (!profileForm.newPassword || !profileForm.confirmNewPassword) {
      setPasswordError("Both password fields are required");
      return;
    }

    if (profileForm.newPassword !== profileForm.confirmNewPassword) {
      setPasswordError("Passwords do not match!");
      return;
    }

    if (!passwordVerified) {
      setPasswordError("Please verify your current password first");
      return;
    }
  }

  try {
    let res;

    if (!hasDetails) {
      res = await createProfileDetails({
        phone: profileForm.phone,
        gender: profileForm.gender,
        age: profileForm.age,
      });
    }
  
    else {
      const payload = {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        gender: profileForm.gender,
        age: profileForm.age,
      };

      res = await updateProfile(payload);
    }

    if (res?.success || res?.data?.success) {
      let passwordChangeSuccess = true;
      
      if (profileForm.newPassword && passwordVerified) {
        try {
          console.log("🔵 Changing password with currentPassword and newPassword...");
          const passwordRes = await api.put("/change-password", {
            currentPassword: profileForm.oldPassword,
            newPassword: profileForm.newPassword,
          });
          console.log("🟢 Password change response:", passwordRes);
          
          if (passwordRes?.data?.success === false) {
            console.error("❌ Password change failed:", passwordRes.data.message);
            setPasswordError(passwordRes.data.message || "Password change failed");
            passwordChangeSuccess = false;
          } else if (passwordRes?.data?.success === true) {
            console.log("✅ Password changed successfully");
            passwordChangeSuccess = true;
          }
        } catch (passwordErr) {
          console.error("❌ Password change error:", passwordErr?.response?.data?.message || passwordErr?.message);
          setPasswordError(passwordErr?.response?.data?.message || "Password change failed. Please try again.");
          passwordChangeSuccess = false;
        }
      }

      // Only close modal and reset if everything succeeded
      if (passwordChangeSuccess) {
        setEditMode(false);
        setProfileOpen(false);
        setPasswordError("");
        setPasswordVerified(false);
        setProfileForm(prev => ({
          ...prev,
          oldPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        }));
      }
    }
  } catch (err) {
    setPasswordError("Failed to update profile. Please try again.");
    console.error(err?.message || "Profile update failed");
  }
  };

  const [openNotif, setOpenNotif] = useState(false);
  const notifRef = useRef(null);
  const { notifications, setNotifications, unreadCount } = useNotifications();

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setOpenNotif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-black text-black dark:text-white">

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden">
          <aside className="w-64 h-[100dvh] bg-white dark:bg-[#0a0a0a] p-6">
            <button onClick={() => setSidebarOpen(false)} className="mb-6">
              <X />
            </button>
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.id}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
                  pathname === item.id
                    ? "bg-[#E8EDFF] dark:bg-[#1a2447] text-[#4f6df5]"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
            
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg mb-2 mt-auto text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </aside>
        </div>
      )}

    
      <aside className="hidden md:flex md:flex-col w-64 bg-white dark:bg-[#0a0a0a] p-6">
        <div className="flex items-center gap-2 text-xl font-bold text-[#4f6df5] mb-6">
          <GraduationCap /> ExamMarkPro
        </div>
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
              pathname === item.id
                ? "bg-[#E8EDFF] dark:bg-[#1a2447] text-[#4f6df5]"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
            }`}
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
  
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg mt-auto text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </aside>

    
      <div className="flex-1 flex flex-col">
<header className="min-h-16 px-6 bg-white dark:bg-[#0d0d0d] border-b flex items-center">
 
  <div className="flex items-center gap-3">
    <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
      <Menu />
    </button>
  </div>

  <div className="ml-auto flex items-center gap-4">
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {theme === "dark" ? (
        <Sun size={20} className="text-yellow-400" />
      ) : (
        <Moon size={20} className="text-gray-600" />
      )}
    </button>

    <div ref={notifRef} className="relative">
      <button onClick={() => setOpenNotif((p) => !p)}>
        <Bell size={18} />
      </button>

      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center">
          {unreadCount}
        </span>
      )}

      {openNotif && (
        <NotificationDropdown
          notifications={notifications}
          setNotifications={setNotifications}
        />
      )}
    </div>

    <img
      src={roleAvatar}
      onClick={() => setProfileOpen(true)}
      className="w-10 h-10 rounded-full cursor-pointer border"
    />
  </div>
</header>

        <main className="p-4 flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">{children}</main>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1a1a] max-w-lg w-full rounded-xl p-5 relative">
            <X
              onClick={() => setProfileOpen(false)}
              className="absolute right-4 top-4 cursor-pointer"
            />

            <h2 className="text-xl font-semibold text-center mb-4">Profile</h2>

            <div className="flex justify-center mb-5">
              <img
                src={roleAvatar}
                className="w-24 h-24 rounded-full border-4 border-[#4f6df5]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROFILE_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <label className="text-sm block mb-1">{label}</label>
                  <input
                    name={key}
                    type={key === "age" ? "number" : "text"}
                    value={profileForm[key] || ""}
                    disabled={!editMode || key === "email"}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700"
                  />
                </div>
              ))}
            </div>

            {editMode && (
              <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700">
                <h3 className="text-sm font-semibold mb-3">Change Password (Optional)</h3>
                
                {!passwordVerified ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm block mb-1">Current Password</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          name="oldPassword"
                          value={profileForm.oldPassword || ""}
                          onChange={handleProfileChange}
                          placeholder="Enter current password"
                          className="flex-1 px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPassword}
                          disabled={verifyingPassword || !profileForm.oldPassword}
                          className="px-3 py-2 bg-[#4f6df5] text-white rounded text-sm disabled:opacity-50 hover:bg-blue-600"
                        >
                          {verifyingPassword ? "Verifying..." : "Verify"}
                        </button>
                      </div>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-red-500">{passwordError}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400">Password verified successfully</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm block mb-1">New Password</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={profileForm.newPassword || ""}
                          onChange={handleProfileChange}
                          placeholder="Enter new password"
                          className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm block mb-1">Confirm Password</label>
                        <input
                          type="password"
                          name="confirmNewPassword"
                          value={profileForm.confirmNewPassword || ""}
                          onChange={handleProfileChange}
                          placeholder="Confirm password"
                          className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-sm"
                        />
                      </div>
                    </div>
                    
                    {profileForm.newPassword && profileForm.newPassword !== profileForm.confirmNewPassword && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>
                )}
              </div>
            )}

            

            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => setEditMode((p) => !p)}
                className="px-4 py-2 border rounded text-[#4f6df5]"
              >
                {editMode ? "Cancel" : "Edit"}
              </button>

              {editMode && (
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-[#4f6df5] text-white rounded"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
