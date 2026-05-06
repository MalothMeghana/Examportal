import React, { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../api";
import NotificationDropdown from "../common_files/NotificationDropdown";
import { useNotifications } from "../hooks/NotificationProvider";
import { disconnectSocket } from "../common_files/Socket";







import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart2,
  DollarSign,
  MessageCircle,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  Users,
  Sun,
  Moon,
  Activity,
} from "lucide-react";


function AdminProfile({ onClose, profile, setProfile }) {
  const [isEdit, setIsEdit] = useState(false);
  const [temp, setTemp] = useState(profile);

  useEffect(() => {
    setTemp(profile);
  }, [profile]);

  const handleSave = () => {
    setProfile(temp);
    setIsEdit(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]">
      <div className="bg-white dark:bg-[#1a1a1a] w-[90%] max-w-lg rounded-2xl shadow-xl p-6 relative text-black dark:text-white transition max-h-[90vh] overflow-y-auto">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
        >
          <X size={22} className="text-gray-700 dark:text-gray-300" />
        </button>

      
        <h2 className="text-2xl font-semibold text-center my-3">
          User Profile
        </h2>

    
        <div className="flex justify-center mb-6">
          <img
            src="/avatars/superadmin.png"
            alt="profile"
            className="w-28 h-28 rounded-full object-cover border-4 border-[#4f6df5]"
          />
        </div>

    
        <div className="flex flex-col gap-4">

          <div>
            <label className="text-sm">Full Name</label>
            <input
              disabled={!isEdit}
              value={temp.name}
              onChange={(e) => setTemp({ ...temp, name: e.target.value })}
              className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-[#242424]"
            />
          </div>

          <div>
            <label className="text-sm">Email</label>
            <input
              disabled={!isEdit}
              value={temp.email}
              onChange={(e) => setTemp({ ...temp, email: e.target.value })}
              className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-[#242424]"
            />
          </div>

          <div>
            <label className="text-sm">Phone</label>
            <input
              disabled={!isEdit}
              value={temp.phone}
              onChange={(e) => setTemp({ ...temp, phone: e.target.value })}
              className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-[#242424]"
            />
          </div>

          <div>
            <label className="text-sm">Gender</label>
            <input
              disabled={!isEdit}
              value={temp.gender || "Male"}
              onChange={(e) => setTemp({ ...temp, gender: e.target.value })}
              className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-[#242424]"
            />
          </div>

          <div>
            <label className="text-sm">Age</label>
            <input
              disabled={!isEdit}
              value={temp.age}
              onChange={(e) => setTemp({ ...temp, age: e.target.value })}
              className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-[#242424]"
            />
          </div>
        </div>

       
        <div className="flex justify-center gap-4 mt-6 pb-2">
          <button
            onClick={() => {
              if (isEdit) setTemp(profile);
              setIsEdit(!isEdit);
            }}
            className="px-8 py-2 rounded-lg border border-[#4f6df5] text-[#4f6df5] hover:bg-[#e8edff]"
          >
            {isEdit ? "Cancel" : "Edit"}
          </button>

          <button
            onClick={handleSave}
            disabled={!isEdit}
            className={`px-8 py-2 rounded-lg bg-[#4f6df5] text-white ${
              !isEdit && "opacity-50 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}


export function Superadmin_Navbar({ setOpenProfile }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [openNotif, setOpenNotif] = useState(false);
  const notifRef = useRef(null);

  const { notifications, setNotifications, unreadCount } = useNotifications();

  // Toggle light/dark theme
  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  // Apply theme
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (!notifRef.current) return;
      if (!notifRef.current.contains(e.target)) setOpenNotif(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="w-screen md:w-[calc(100vw-256px)] h-16 bg-white dark:bg-[#1a1a1a] flex items-center justify-between px-3 sm:px-6 fixed top-0 left-0 md:left-64 right-0 z-40">
      <div className="ml-0 md:ml-64"></div>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* THEME SWITCH */}
        <button
          onClick={toggleTheme}
          className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* NOTIFICATIONS */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenNotif((prev) => !prev);
            }}
            className="relative flex items-center justify-center p-2"
          >
            <Bell size={22} className="text-black dark:text-white" />

            {/* RED BADGE FOR UNREAD NOTIFICATIONS */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* DROPDOWN */}
          {openNotif && (
            <NotificationDropdown
              notifications={notifications}
              setNotifications={setNotifications}
            />
          )}
        </div>

        {/* PROFILE IMAGE */}
        <img
          src="/avatars/superadmin.png"
          alt="profile"
          className="w-10 h-10 rounded-full cursor-pointer"
          onClick={() => setOpenProfile(true)}
        />
      </div>
    </div>
  );
}


// export function Superadmin_Navbar({ setOpenProfile }) {
//   const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
//   const [openNotif, setOpenNotif] = useState(false);
//   const notifRef = useRef(null);

//   const { notifications, setNotifications, unreadCount } = useNotifications();

//   // Toggle theme
//   const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

//   useEffect(() => {
//     document.documentElement.classList.toggle("dark", theme === "dark");
//     localStorage.setItem("theme", theme);
//   }, [theme]);

//   // Close dropdown on outside click
//   useEffect(() => {
//     const handleOutside = (e) => {
//       if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
//     };
//     document.addEventListener("mousedown", handleOutside);
//     return () => document.removeEventListener("mousedown", handleOutside);
//   }, []);

//   return (
//     <div className="w-screen md:w-[calc(100vw-256px)] h-16 bg-white dark:bg-[#1a1a1a] flex items-center justify-between px-3 sm:px-6 fixed top-0 left-0 md:left-64 right-0 z-40">
//       <div className="ml-0 md:ml-64"></div>

//       <div className="flex items-center gap-3 sm:gap-6">
//         {/* THEME SWITCH */}
//         <button
//           onClick={toggleTheme}
//           className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
//         >
//           {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
//         </button>

//         {/* NOTIFICATIONS */}
//         <div ref={notifRef} className="relative">
//           <button
//             type="button"
//             onMouseDown={(e) => e.stopPropagation()}
//             onClick={(e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               setOpenNotif((prev) => !prev);
//             }}
//             className="relative flex items-center justify-center p-2"
//           >
//             <Bell size={22} className="text-black dark:text-white" />
//             {unreadCount > 0 && (
//               <span className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center">
//                 {unreadCount}
//               </span>
//             )}
//           </button>

//           {openNotif && (
//             <NotificationDropdown
//               notifications={notifications}
//               setNotifications={setNotifications}
//             />
//           )}
//         </div>

//         {/* PROFILE IMAGE */}
//         <img
//           src="/avatars/superadmin.png"
//           alt="profile"
//           className="w-10 h-10 rounded-full cursor-pointer"
//           onClick={() => setOpenProfile(true)}
//         />
//       </div>
//     </div>
//   );
// }


export function Superadmin_Sidebar() {
  const [open, setOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = ()=>{
     disconnectSocket(); 
    sessionStorage.clear();
    localStorage.clear();
    navigate('/login');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`md:hidden fixed top-5 left-4 z-[60] bg-white dark:bg-[#222] p-2 rounded-lg shadow ${
          open ? "hidden" : "inline-flex"
        }`}
      >
        <Menu size={24} className="text-[#4f6df5]" />
      </button>

      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-[#111] px-6 py-6 z-50 transition-transform duration-300 overflow-y-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="md:hidden flex justify-end mb-4">
            <button
              onClick={() => setOpen(false)}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
            >
              <X size={22} className="text-[#4f6df5]" />
            </button>
          </div>

          <div className="text-[22px] flex items-center gap-2 font-semibold text-[#4f6df5] mb-8">
            <span className="text-3xl">🎓</span>
            <span>ExamMarkPro</span>
          </div>

          <div className="flex flex-col gap-2 text-[15px]">
            <NavLink
              to="/super-admin/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg ${
                  isActive
                    ? "bg-[#E8EDFF] text-[#4f6df5]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>

            <NavLink
              to="/super-admin/clients"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg ${
                  isActive
                    ? "bg-[#E8EDFF] text-[#4f6df5]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <Building2 size={20} /> Client Management
            </NavLink>

            <NavLink
              to="/super-admin/subscriptions"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg ${
                  isActive
                    ? "bg-[#E8EDFF] text-[#4f6df5]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <CreditCard size={20} /> Subscription
            </NavLink>

            <button
              onClick={() => setAnalyticsOpen(!analyticsOpen)}
              className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-3">
                <BarChart2 size={20} /> Analytics
              </span>
              <ChevronDown
                size={18}
                className={`${analyticsOpen ? "rotate-180" : ""} transition`}
              />
            </button>

            {analyticsOpen && (
              <div className="ml-10 flex flex-col gap-1">
                <NavLink
                  to="/super-admin/revenue"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md ${
                      isActive
                        ? "bg-[#E8EDFF] text-[#4f6df5]"
                        : "dark:text-gray-200 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  <DollarSign size={18} /> Revenue
                </NavLink>

                <NavLink
                  to="/super-admin/analytics"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md ${
                      isActive
                        ? "bg-[#E8EDFF] text-[#4f6df5]"
                        : "dark:text-gray-200 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  <Activity size={18} /> Real-Time Analytics
                </NavLink>

                <NavLink
                  to="/super-admin/users"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md ${
                      isActive
                        ? "bg-[#E8EDFF] text-[#4f6df5]"
                        : "dark:text-gray-200 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  <Users size={18} /> Users
                </NavLink>
              </div>
            )}

            <NavLink
              to="/super-admin/chatbox"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg ${
                  isActive
                    ? "bg-[#E8EDFF] text-[#4f6df5]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <MessageCircle size={20} /> Chatbox
            </NavLink>
          </div>

          <div className="mt-auto pt-6">
            <button className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-red-600 transition" onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 md:hidden z-40"
        />
      )}
    </>
  );
}


export default function Superadmin_Layout({ children }) {
  const [openProfile, setOpenProfile] = useState(false);

  const [profile, setProfile] = useState({
    name: "Sarah Johnson",
    email: "sara.joh@example.com",
    phone: "+91 1234567890",
    age: "35",
    gender: "Male",
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] flex">
      <Superadmin_Sidebar />

      <div className="ml-0 md:ml-64 flex-1 flex flex-col min-h-screen">
        <Superadmin_Navbar setOpenProfile={setOpenProfile} />

        <main className="w-screen md:w-[calc(100vw-256px)] flex-1 p-4 sm:p-6 mt-16">{children}</main>

        {openProfile && (
          <AdminProfile
            profile={profile}
            setProfile={setProfile}
            onClose={() => setOpenProfile(false)}
          />
        )}
      </div>
    </div>
  );
}
