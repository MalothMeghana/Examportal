import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import {
  Users,
  CheckCircle,
  X,
  UserCheck,
  User,
  BarChart2,
  Clock,
  RefreshCcw,
} from "lucide-react";

export default function Superadmin_Dashboard() {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState("impersonate");

  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [isImpersonateLoading, setIsImpersonateLoading] = useState(false);

  const [impersonateForm, setImpersonateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const [orgForm, setOrgForm] = useState({
    fullName: "",
    description: "",
  });

  const [summary, setSummary] = useState({
    totalClients: 0,
    totalClientsChange: "+0% from last month",
    activeSubscribers: 0,
    activeSubscribersChange: "+0% from last month",
    totalUsers: 0,
    totalUsersChange: "+0% from last month",
    totalRevenue: "$0",
    revenueTarget: "Target $0 annually",
    uptime: "0%",
    uptimeStatus: "Calculating uptime...",
    renewalRate: "0%",
    renewalRateChange: "No data available",
  });

  const [clientsData, setClientsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const BASE = "/super-admin/dashboard";

  const fetchSummary = async () => {
    try {
      const res = await api.get(`${BASE}/summary`);
      const data = res.data.data || {};
      
      // Update state with backend data, fallback to defaults if fields are missing
      setSummary({
        totalClients: data.totalClients || 0,
        totalClientsChange: data.totalClientsChange || "+0% from last month",
        activeSubscribers: data.activeSubscribers || 0,
        activeSubscribersChange: data.activeSubscribersChange || "+0% from last month",
        totalUsers: data.totalUsers || 0,
        totalUsersChange: data.totalUsersChange || "+0% from last month",
        totalRevenue: data.totalRevenue || "$0",
        revenueTarget: data.revenueTarget || "Target $0 annually",
        uptime: data.uptime || "0%",
        uptimeStatus: data.uptimeStatus || "Calculating uptime...",
        renewalRate: data.renewalRate || "0%",
        renewalRateChange: data.renewalRateChange || "No data available",
      });
    } catch (err) {
      console.error("Dashboard summary error:", err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get(`${BASE}/clients`);
      setClientsData(res.data.data);
    } catch (err) {
      console.error("Clients loading error:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchClients();
  }, []);

  const totalPages = Math.max(1, Math.ceil(clientsData.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [clientsData, pageSize, totalPages]);

  const getStatusColor = (status) => {
    if (status === "Active")
      return "bg-green-100 text-green-700 dark:bg-[#14341c] dark:text-green-300";
    if (status === "Trial")
      return "bg-yellow-100 text-yellow-700 dark:bg-[#3b2f12] dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-[#3b1717] dark:text-red-300";
  };

  const handleToolClick = (key) => {
    setActiveTool(key);

    if (key === "impersonate") {
      setShowImpersonateModal(true);
    } else if (key === "roles") {
      navigate("/super-admin/clients");
    } else if (key === "settings") {
      setShowComingSoonModal(true);
    }
  };

  const handleSaveImpersonate = async () => {
    try {
      // Validate form fields
      if (!impersonateForm.fullName || !impersonateForm.email || !impersonateForm.phone) {
        alert("Please fill in all required fields");
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(impersonateForm.email)) {
        alert("Please enter a valid email address");
        return;
      }

      // Validate phone format
      if (impersonateForm.phone.trim().length < 10) {
        alert("Please enter a valid phone number");
        return;
      }

      setIsImpersonateLoading(true);

      console.log("Sending impersonate request with:", {
        fullName: impersonateForm.fullName.trim(),
        email: impersonateForm.email.trim(),
        phone: impersonateForm.phone.trim(),
      });

      const res = await api.post(`${BASE}/impersonate-superadmin`, {
        fullName: impersonateForm.fullName.trim(),
        email: impersonateForm.email.trim(),
        phone: impersonateForm.phone.trim(),
      });

      console.log("Impersonate response status:", res.status);
      console.log("Impersonate response data:", res.data);

      // Check if the response indicates success
      if (res.data && res.data.success) {
        // Reset form and close modal on success
        setShowImpersonateModal(false);
        setImpersonateForm({ fullName: "", email: "", phone: "" });
        alert("SuperAdmin created successfully! Email has been sent with login credentials.");
        fetchSummary();
        fetchClients();
      } else {
        const errorMsg = res.data?.message || "Failed to create superadmin";
        console.warn("Response success is false:", errorMsg);
        alert(errorMsg);
      }
    } catch (err) {
      console.error("Full error object:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      
      let msg = "Failed to create superadmin";
      
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.status === 409) {
        msg = "Email already exists. Please use a different email.";
      } else if (err.response?.status === 400) {
        msg = "Invalid input. Please check all fields.";
      } else if (err.response?.status === 500) {
        msg = "Server error. Please try again later.";
      } else if (err.message) {
        msg = err.message;
      }
      
      console.error("Final error message:", msg);
      alert(msg);
    } finally {
      setIsImpersonateLoading(false);
    }
  };



  const summaryCards = [
    {
      icon: <Users size={28} className="text-[#4f6df5]" />,
      value: summary.totalClients,
      label: "Total Clients",
      sub: summary.totalClientsChange,
    },
    {
      icon: <UserCheck size={28} className="text-[#4f6df5]" />,
      value: summary.activeSubscribers,
      label: "Active Subscribers",
      sub: summary.activeSubscribersChange,
    },
    {
      icon: <User size={28} className="text-[#4f6df5]" />,
      value: summary.totalUsers,
      label: "Total Users",
      sub: summary.totalUsersChange,
    },
    {
      icon: <BarChart2 size={28} className="text-[#4f6df5]" />,
      value: summary.totalRevenue,
      label: "Total Revenue",
      sub: summary.revenueTarget,
    },
    {
      icon: <Clock size={28} className="text-[#4f6df5]" />,
      value: summary.uptime,
      label: "Website Uptime",
      sub: summary.uptimeStatus,
    },
    {
      icon: <RefreshCcw size={28} className="text-[#4f6df5]" />,
      value: summary.renewalRate,
      label: "Subscription Renewal Rate",
      sub: summary.renewalRateChange,
    },
  ];

  return (
    <div
      className="
        w-full 
        px-4 sm:px-6 pb-6 
        text-[#1a1f36] dark:text-[#e6e6e6]
        bg-[#f5f6fa] dark:bg-[#181a1e]
        overflow-x-hidden
      "
    >
      <h1 className="text-2xl sm:text-3xl font-bold">
        Welcome, <span className="text-[#4f6df5]">Super Admin</span>
      </h1>

      <p className="text-gray-600 dark:text-[#9da3ae] mt-1 text-sm sm:text-base">
        Here’s an overview of your platform’s key metrics and performance.
      </p>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mt-6">
        {summaryCards.map((item, index) => (
          <div
            key={index}
            className="
              bg-white dark:bg-[#1f2125]
              rounded-2xl shadow-sm p-6
              border border-[#e5e7eb] dark:border-[#2a2c31]
            "
          >
            <div className="flex items-center gap-4">
              <div
                className="
                  w-14 h-14 rounded-xl
                  bg-[#eef2ff] dark:bg-[#272a35]
                  flex items-center justify-center
                "
              >
                {item.icon}
              </div>

              <div>
                <h2 className="text-3xl font-bold">{item.value}</h2>
                <p className="text-gray-600 dark:text-[#9da3ae] text-sm">
                  {item.label}
                </p>
              </div>
            </div>

            <div className="border-b my-4 border-[#eceff5] dark:border-[#2a2c31]"></div>

            <p className="text-gray-500 dark:text-[#9da3ae] text-sm">
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ADMIN TOOLS + SYSTEM STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* ADMIN TOOLS */}
        <div
          className="
            bg-white dark:bg-[#1f2125]
            rounded-2xl shadow-sm p-4 sm:p-6
            border border-[#e5e7eb] dark:border-[#2a2c31]
          "
        >
          <h2 className="text-lg font-semibold mb-4">Admin Tools</h2>

          {[
            { key: "impersonate", label: "Impersonate SuperAdmin" },
            { key: "roles", label: "Manage Roles & Permissions" },
            { key: "settings", label: "Platform Settings" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleToolClick(btn.key)}
              className={`w-full py-2.5 rounded-lg font-medium mb-3 text-sm transition ${activeTool === btn.key
                  ? "bg-[#4f6df5] text-white"
                  : "bg-white dark:bg-[#272a35] border border-gray-300 dark:border-[#34363c] text-gray-700 dark:text-[#c7c7c7] hover:bg-gray-50 dark:hover:bg-[#30333a]"
                }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* WEBSITE STATUS */}
        <div
          className="
            bg-white dark:bg-[#1f2125]
            rounded-2xl shadow-sm p-4 sm:p-6
            border border-[#e5e7eb] dark:border-[#2a2c31]
          "
        >
          <h2 className="text-xl font-semibold mb-6">
            Website & Subscription Overview
          </h2>

          <div className="flex justify-between mb-6">
            <p className="text-[17px] font-semibold">Website Status:</p>
            <div className="inline-flex items-center gap-2 bg-[#eef2ff] dark:bg-[#272a35] px-3 py-1.5 rounded-full text-sm">
              <CheckCircle size={16} className="text-[#4f6df5]" />
              Operational
            </div>
          </div>

          <div className="flex justify-between mb-6">
            <p className="text-[17px] font-semibold">Subscription System:</p>
            <div className="inline-flex items-center gap-2 bg-[#e6fbe7] dark:bg-[#1d3523] px-3 py-1.5 rounded-full text-sm">
              <CheckCircle size={16} className="text-green-600 dark:text-green-300" />
              Active
            </div>
          </div>

          <p className="text-gray-600 dark:text-[#9da3ae] text-[15px]">
            All core systems are running smoothly. No critical issues detected.
          </p>
        </div>
      </div>

      {/* CLIENTS TABLE */}
      <div
        className="
          bg-white dark:bg-[#1f2125]
          rounded-2xl shadow-sm p-4 sm:p-6 mt-10
          border border-[#e5e7eb] dark:border-[#2a2c31]
          w-full
        "
      >
        <div className="mb-4">
          <h2 className="text-xl font-semibold">All Clients</h2>
          <p className="text-gray-600 dark:text-[#9da3ae] text-sm">
            Manage and monitor all client organizations
          </p>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden sm:block mt-3">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#e8edff] dark:bg-[#23262b] text-[#4f6df5]">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Users</th>
                <th className="py-3 px-4">Exam</th>
                <th className="py-3 px-4">Revenue</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {clientsData
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((c, i) => (
                  <tr key={i} className="border-b dark:border-[#2a2c31]">
                    <td className="py-4 px-4">{c.organization}</td>
                    <td className="py-4 px-4">{c.subscriptionPlan}</td>
                    <td className="py-4 px-4">{c.users}</td>
                    <td className="py-4 px-4">{c.exam}</td>
                    <td className="py-4 px-4">{c.revenue}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="sm:hidden grid gap-3 mt-4">
          {clientsData
            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
            .map((c, i) => (
            <div
              key={i}
              className="border rounded-xl p-3 bg-white dark:bg-[#1f2125]"
            >
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold text-sm">{c.organization}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] ${getStatusColor(
                    c.status
                  )}`}
                >
                  {c.status}
                </span>
              </div>

              <p className="text-[11px] mb-2">
                Plan: <span className="font-medium">{c.subscriptionPlan}</span>
              </p>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-gray-500">Users</p>
                  <p className="font-semibold">{c.users}</p>
                </div>
                <div>
                  <p className="text-gray-500">Exams</p>
                  <p className="font-semibold">{c.exam}</p>
                </div>
                <div>
                  <p className="text-gray-500">Revenue</p>
                  <p className="font-semibold">{c.revenue}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* PAGINATION CONTROLS */}
        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-lg border ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Prev
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-lg border ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Next
            </button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Rows:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="border rounded-lg p-1 bg-white dark:bg-[#272a35]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      {/* ------------------ MODALS ------------------ */}

      {/* Impersonate Admin Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="
              bg-white dark:bg-[#1f2125]
              text-black dark:text-white
              rounded-2xl w-[92%] sm:w-[520px] p-6 relative
              border border-gray-200 dark:border-[#2a2c31]
            "
          >
            <h2 className="text-xl font-semibold text-[#4f6df5] dark:text-[#8095ff]">
              Impersonate SuperAdmin
            </h2>

            <X
              size={22}
              className="absolute top-4 right-4 cursor-pointer text-gray-700 dark:text-gray-300"
              onClick={() => setShowImpersonateModal(false)}
            />

            <div className="mt-5">
              <label className="block text-gray-600 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                className="
                  w-full border p-3 rounded-lg mt-2
                  bg-white dark:bg-[#272a35]
                  border-gray-300 dark:border-[#34363c]
                  text-black dark:text-white
                "
                value={impersonateForm.fullName}
                onChange={(e) =>
                  setImpersonateForm({
                    ...impersonateForm,
                    fullName: e.target.value,
                  })
                }
              />

              <label className="block mt-4 text-gray-600 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                className="
                  w-full border p-3 rounded-lg mt-2
                  bg-white dark:bg-[#272a35]
                  border-gray-300 dark:border-[#34363c]
                  text-black dark:text-white
                "
                value={impersonateForm.email}
                onChange={(e) =>
                  setImpersonateForm({
                    ...impersonateForm,
                    email: e.target.value,
                  })
                }
              />

              <label className="block mt-4 text-gray-600 dark:text-gray-300">
                Phone
              </label>
              <input
                type="text"
                className="
                  w-full border p-3 rounded-lg mt-2
                  bg-white dark:bg-[#272a35]
                  border-gray-300 dark:border-[#34363c]
                  text-black dark:text-white
                "
                value={impersonateForm.phone}
                onChange={(e) =>
                  setImpersonateForm({
                    ...impersonateForm,
                    phone: e.target.value,
                  })
                }
              />

              <button
                onClick={handleSaveImpersonate}
                disabled={isImpersonateLoading}
                className="block mx-auto mt-6 bg-[#4f6df5] hover:bg-[#3d51c4] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-8 rounded-lg transition"
              >
                {isImpersonateLoading ? "Creating..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

    

      {/* COMING SOON MODAL */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
          <div className="bg-white dark:bg-[#1f2125] p-8 rounded-2xl w-full max-w-sm shadow-xl">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="bg-blue-100 dark:bg-blue-900/40 rounded-full p-4">
                  <Clock size={40} className="text-[#4f6df5]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                Coming Soon
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We are currently working on this feature. It will be available soon.
              </p>
              <button
                onClick={() => setShowComingSoonModal(false)}
                className="bg-[#4f6df5] text-white py-2.5 px-8 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
}
