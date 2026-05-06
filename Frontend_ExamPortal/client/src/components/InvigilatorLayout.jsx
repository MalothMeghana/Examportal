import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/NotificationProvider";

import {
  Bell,
  LayoutDashboard,
  FileText,
  ClipboardList,
  MessageCircle,
  LogOut,
  X,
  Menu,
  GraduationCap,
  Sun,
  Moon,
  Activity,
   Pencil,
} from "lucide-react";

import NotificationDropdown from "../common_files/NotificationDropdown";
import { getProfile, updateProfile, createProfileDetails } from "../common_files/profileApi";

/* ------------------- Reusable ProfileField Component ------------------- */
function ProfileField({ label, value, editable, onChange }) {
  return (
    <div className="flex flex-col w-full">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>

      <input
        value={value || ""}
        readOnly={!editable}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={`w-full px-3 py-2.5 rounded-md text-sm outline-none ${
          editable
            ? "bg-white border border-blue-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 cursor-not-allowed"
        } text-gray-900 dark:text-white`}
      />
    </div>
  );
}

/* ------------------- MAIN INVIGILATOR LAYOUT ------------------- */
export default function InvigilatorLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  /* ------------------- Theme ------------------- */
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  /* ------------------- Sidebar & Profile ------------------- */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);

  /* ------------------- Notifications ------------------- */
  const [openNotif, setOpenNotif] = useState(false);  // ✅ FIXED (was missing)
  const notifRef = useRef(null);
  const { notifications, setNotifications, unreadCount } = useNotifications();

  /* ------------------- PROFILE STATE ------------------- */
const [profile, setProfile] = useState({
  full_name: "",
  email: "",
  phone: "",
  gender: "",
  age: "",
  organization_name: "",
  organization_id: "",
  invigilator_id: "",
  joining_date: "",
});


  /* ------------------- Fetch Profile ------------------- */
  const fetchProfile = async () => {
    try {
      const res = await getProfile();

      if (res?.profile) {
       setProfile({
  full_name: res.profile.full_name || "",
  email: res.profile.email || "",
  phone: res.profile.phone || "",
  gender: res.profile.gender || "",
  age: res.profile.age || "",
  organization_name: res.profile.organization_name || "",
  organization_id: res.profile.org_id || "",
  asi_id: res.profile.asi_id || "",
  joining_date: res.profile.joining_date || "",
});

      }
    } catch (err) {
      console.error("PROFILE FETCH FAILED:", err.message);
    }
  };

  /* ------------------- Save Profile ------------------- */
  const handleSaveProfile = async () => {
    try {
      const payload = {
        full_name: profile.full_name,
        phone: profile.phone,
        gender: profile.gender,
        age: profile.age,
      };

      const res = await updateProfile(payload);

      if (res?.success) {
        setEditMode(false);
        setShowProfile(false);
      }
    } catch (err) {
      console.error("PROFILE UPDATE FAILED:", err.message);
    }
  };

  /* ------------------- Logout ------------------- */
  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate("/login");
  };

  /* ------------------- Menu List ------------------- */
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/invigilator/dashboard" },
    { icon: FileText, label: "Submission", path: "/invigilator/submission" },
    { icon: ClipboardList, label: "Grading Queue", path: "/invigilator/grading-queue" },
    { icon: Activity, label: "Analytics", path: "/invigilator/analytics" },
    { icon: MessageCircle, label: "Chatbox", path: "/invigilator/chatbox" },
  ];

  /* ------------------- UI ------------------- */
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-black">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-[#111] border-r dark:border-gray-800">
        <div className="h-16 px-6 flex items-center gap-2 border-b dark:border-gray-800">
          <GraduationCap size={26} className="text-blue-600" />
          <span className="text-xl font-semibold text-blue-600">ExamMarkPro</span>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`px-4 py-3 rounded flex items-center gap-3 text-sm ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                <item.icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="m-4 flex items-center gap-2 text-red-500"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
       <header className="h-16 px-4 md:px-6 flex items-center bg-white dark:bg-[#111] border-b dark:border-gray-800">
  
  {/* LEFT SIDE */}
  <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
    <Menu />
  </button>

  {/* PUSH EVERYTHING TO THE RIGHT */}
  <div className="ml-auto flex items-center gap-4">

    {/* THEME TOGGLE */}
    <button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
    >
      {theme === "dark" ? (
        <Sun size={20} className="text-yellow-400" />
      ) : (
        <Moon size={20} className="text-gray-600" />
      )}
    </button>

    {/* NOTIFICATIONS */}
    <div ref={notifRef} className="relative">
      <button onClick={() => setOpenNotif((p) => !p)}>
        <Bell />
      </button>

      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
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

    {/* PROFILE AVATAR */}
    <img
      src="/avatars/invigilator.png"
      className="w-10 h-10 rounded-full cursor-pointer border"
      onClick={() => {
        fetchProfile();
        setShowProfile(true);
        setEditMode(false);
      }}
    />

  </div>
</header>

        {/* PAGE BODY */}
        <main className="p-4 md:p-6 flex-1">{children}</main>
      </div>

      {/* ------------------- PROFILE MODAL ------------------- */}
{showProfile && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
    <div className="bg-white dark:bg-[#0B1222] rounded-2xl w-full max-w-lg p-8 shadow-2xl max-h-[92vh] overflow-y-auto relative">

      {/* Close button */}
      <button
        onClick={() => {
          setShowProfile(false);
          setEditMode(false);
        }}
        className="absolute right-5 top-5 text-gray-600 dark:text-gray-300"
      >
        <X size={24} />
      </button>

      {/* Title */}
      <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-6">
        User Profile
      </h2>

      {/* Avatar */}
<div className="flex justify-center mb-6 relative">
  <img
    src="/avatars/invigilator.png"
    className="w-28 h-28 rounded-full object-cover border-4 border-[#4f6df5]"
  />

  {/* EDIT ICON – FIXED TO EXTREME BOTTOM-RIGHT */}
  <button
    className="absolute bottom-1 right-1 bg-[#4f6df5] p-1.5 rounded-full shadow"
  >
    <Pencil size={14} className="text-white" />
  </button>
</div>

      {/* FORM CONTENT */}
      <div className="space-y-4">

        <ProfileField
          label="Full Name"
          value={profile.full_name}
          editable={editMode}
          onChange={(v) =>
            setProfile((p) => ({ ...p, full_name: v }))
          }
        />

        <ProfileField
          label="Email"
          value={profile.email}
          editable={false}
        />

        <ProfileField
          label="Phone"
          value={profile.phone}
          editable={editMode}
          onChange={(v) =>
            setProfile((p) => ({ ...p, phone: v }))
          }
        />

        <ProfileField
          label="Invigilator ID"
          value={profile.asi_id }
          editable={false}
        />

        <ProfileField
          label="Organization Name"
          value={profile.organization_name}
          editable={false}
        />

        <ProfileField
          label="Organization ID"
          value={profile.organization_id}
          editable={false}
        />

        {/* Gender + Age in two columns */}
        <div className="flex gap-4">
          <ProfileField
            label="Gender"
            value={profile.gender}
            editable={editMode}
            onChange={(v) =>
              setProfile((p) => ({ ...p, gender: v }))
            }
          />

          <ProfileField
            label="Age"
            value={profile.age}
            editable={editMode}
            onChange={(v) =>
              setProfile((p) => ({ ...p, age: v }))
            }
          />
        </div>

        {/* Joining date (optional) */}
        <ProfileField
          label="Joining Date"
          value={profile.joining_date}
          editable={false}
        />

      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          className="px-6 py-2.5 border border-[#4f6df5] text-[#4f6df5] rounded-md"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Cancel" : "Edit"}
        </button>

        {editMode && (
          <button
            className="px-6 py-2.5 bg-[#4f6df5] text-white rounded-md"
            onClick={handleSaveProfile}
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
