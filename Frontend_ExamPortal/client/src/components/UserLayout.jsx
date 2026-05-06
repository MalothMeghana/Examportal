import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NotificationDropdown from "../common_files/NotificationDropdown";
import { getProfile, updateProfile, createProfileDetails } from "../common_files/profileApi";
import { useNotifications } from "../hooks/NotificationProvider";


import {
  Bell,
  Menu,
  LayoutDashboard,
  FileText,
  BookOpen,
  MessageCircle,
  Trophy,
  LogOut,
  GraduationCap,
  X,
  Pencil,
  Sun,
  Moon,
  Activity,
} from "lucide-react";

function ProfileField({ label, value, editable, onChange }) {
  return (
    <div className="flex flex-col w-full">
      <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
        {label}
      </label>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!editable}
        className={`w-full px-3 py-2.5 rounded-md text-sm outline-none ${
          editable
            ? "bg-white border border-[#6B76FF] focus:ring-2 focus:ring-[#6B76FF] dark:bg-gray-800 dark:border-[#6B76FF]"
            : "bg-gray-100 border border-gray-300 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed"
        } text-gray-900 dark:text-white`}
      />
    </div>
  );
}

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const notifRef = useRef(null);
  const fileInputRef = useRef(null);
  // Initialize dark mode from localStorage, default to light mode
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme === "dark";
    return false; // Default to light mode
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Toggle dark mode function
  const toggleDarkMode = () => setIsDark(prev => !prev);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasDetails, setHasDetails] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const DEFAULT_AVATAR = "/avatars/user.png";
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATAR);
  
  const [draft, setDraft] = useState({
  full_name: "",
  email: "",
  phone: "",
  org_id: "",
  organization_name: "",
  gender: "",
  age: "",
  avatar: DEFAULT_AVATAR,
});

  useEffect(() => {
    if (!isProfileOpen) return;

    (async () => {
      try {
        const res = await getProfile();
        if (res?.profile) {
        setDraft({
          full_name: res.profile.full_name || "",
          email: res.profile.email || "",
          phone: res.profile.phone || "",
          org_id: res.profile.org_id || "",
          organization_name: res.profile.organization_name || "",
          gender: res.profile.gender || "",
          age: res.profile.age || "",
          avatar: DEFAULT_AVATAR,
        });

        setProfileImage(res.profile.avatar || DEFAULT_AVATAR);
        setHasDetails(Boolean(res.hasDetails));
      }

      } catch (err) {
        console.warn("Profile fetch failed:", err.message);
      }
    })();
  }, [isProfileOpen]);

  const saveProfile = async () => {
  try {
    let res;
    if (!hasDetails) {
      res = await createProfileDetails({
        phone: draft.phone,
        gender: draft.gender,
        age: draft.age,
      });
    }
    else {
      res = await updateProfile({
        full_name: draft.full_name,
        phone: draft.phone,
        gender: draft.gender?.toLowerCase(),
        age: draft.age,
      });
    }

    if (res?.success) {
      setIsEditingProfile(false);
      setIsProfileOpen(false);
    }
  } catch (err) {
    console.warn("Profile update failed:", err.message);
    alert("Profile update failed");
  }
};

  const [openNotif, setOpenNotif] = useState(false);

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

  const menu = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/user/dashboard" },
    { label: "My Exam", icon: FileText, path: "/user/exams" },
    { label: "Study Materials", icon: BookOpen, path: "/user/study-materials" },
    { label: "Analytics", icon: Activity, path: "/user/analytics" },
    { label: "Achievements", icon: Trophy, path: "/user/achievements" },
    { label: "Chatbox", icon: MessageCircle, path: "/user/chatbox" },
  ];

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117]">
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-gray-900 shadow-lg transition-transform duration-300 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-64 md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 h-16 px-6">
          <GraduationCap size={22} className="text-[#3641EC]" />
          <span className="text-lg font-semibold text-[#3641EC]">
            ExamMarkPro
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-4 mt-4 flex-1">
          {menu.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={label}
                to={path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition ${
                  active
                    ? "bg-blue-50 text-[#3641EC] dark:bg-blue-900/30 dark:text-blue-200 font-semibold"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={18} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full text-sm px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden md:pl-64">
        <header className="h-16 bg-white dark:bg-gray-900 px-4 sm:px-8 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-gray-600" />
              )}
            </button>
            <div ref={notifRef} className="relative">
              <button onClick={() => setOpenNotif(!openNotif)}>
                <Bell className="text-gray-700 dark:text-gray-200" 
                 size={18} />
              </button>

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center">
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
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-9 h-9 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700"
            >
              <img
                src={profileImage || DEFAULT_AVATAR}
                onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                className="w-full h-full object-cover"
                alt="profile"
              />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-[#0B1222] rounded-2xl w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex justify-end">
              <button onClick={() => {
                setIsProfileOpen(false);
                setIsEditingProfile(false);
              }}>
                <X  className="text-gray-700 dark:text-gray-300" 
                size={24} />
              </button>
            </div>

            <h2 className="text-xl font-semibold text-center mb-6 text-gray-900 dark:text-white">
              User Profile
            </h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = URL.createObjectURL(f);
                setProfileImage(url);
                setDraft((p) => ({
                        ...p,
                      avatar: url,
                    }));
              }}
            />

            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <img
                      src={profileImage || DEFAULT_AVATAR}
                      onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                      className="w-28 h-28 rounded-full object-cover"
                    />
                  <button
                    className="absolute bottom-1 right-1 bg-[#3641EC] p-1 rounded-full"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Pencil size={14} className="text-white" />
                  </button>
              </div>
            </div>

            <div className="space-y-4">
              <ProfileField label="Full Name" value={draft.full_name} editable={isEditingProfile} onChange={(v) => setDraft(p => ({ ...p, full_name: v }))} />
              <ProfileField label="Email" value={draft.email} editable={false} />
              <ProfileField label="Phone" value={draft.phone} editable={isEditingProfile} onChange={(v) => setDraft(p => ({ ...p, phone: v }))} />
              <ProfileField label="Organization Name" value={draft.organization_name} editable={false} />
              <ProfileField label="Organization ID" value={draft.org_id} editable={false} />
              <div className="flex gap-4">
                <ProfileField label="Gender" value={draft.gender} editable={isEditingProfile} onChange={(v) => setDraft(p => ({ ...p, gender: v }))} />
                <ProfileField label="Age" value={draft.age} editable={isEditingProfile} onChange={(v) => setDraft(p => ({ ...p, age: v }))} />
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-8">
              <button
                className="px-8 py-2.5 border border-[#3641EC] text-[#3641EC] rounded-md"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                {isEditingProfile ? "Cancel" : "Edit"}
              </button>

              {isEditingProfile && (
                <button
                  className="px-8 py-2.5 bg-[#3641EC] text-white rounded-md"
                  onClick={saveProfile}
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
