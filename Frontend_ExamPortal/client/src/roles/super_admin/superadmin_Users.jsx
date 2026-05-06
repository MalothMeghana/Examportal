import React, { useState, useEffect, useMemo } from "react";
import api from "../../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { ChevronDown, Search } from "lucide-react";

export default function Superadmin_Users() {
  const API = "/super-admin/analytics/users";

  const [selectedType, setSelectedType] = useState("All");
  const [openDropdown, setOpenDropdown] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [activeUsers, setActiveUsers] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [dailyAccess, setDailyAccess] = useState([]);

  /* ---------- FETCH DATA FROM BACKEND ---------- */
  const fetchData = async () => {
    try {
      const res = await api.get(API);

      setActiveUsers(res.data.activeUsers);
      setOrgUsers(res.data.organizationUsers);
      setDailyAccess(res.data.dailyAccess);
    } catch (err) {
      console.error("Users analytics error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ---------- ACTIVE USERS GRAPH MAP ---------- */
  const activeUsersMapped = useMemo(() => {
    if (selectedType === "All") {
      return activeUsers.map((i) => ({
        month: i.month,
        admin: Number(i.admin),
        invigilator: Number(i.invigilator),
        user: Number(i.users),
      }));
    }

    return activeUsers.map((i) => ({
      month: i.month,
      value:
        selectedType === "Admins"
          ? Number(i.admin)
          : selectedType === "Invigilators"
          ? Number(i.invigilator)
          : Number(i.users),
    }));
  }, [selectedType, activeUsers]);

  /* ---------- ORG SEARCH FILTER ---------- */
  const filteredOrgs = orgUsers.filter((o) =>
    o.org.toLowerCase().includes(searchText.toLowerCase())
  );

  /* ---------- DAILY LOGIN GRAPH MAP ---------- */
  const dailyMapped = dailyAccess.map((i) => ({
    day: i.date,
    value: Number(i.count),
  }));

  return (
    <div className="pb-10 px-4">
      {/* PAGE TITLE */}
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Users
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Manage users activity
      </p>

      {/* ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACTIVE USERS */}
        <div className="bg-white dark:bg-[#111] p-5 rounded-2xl shadow border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Number of Active Users
            </h2>

            {/* DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(!openDropdown)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-100 dark:bg-[#1f2125] rounded-lg w-32"
              >
                <span className="text-black dark:text-white">
                  {selectedType}
                </span>
                <ChevronDown
                  size={18}
                  className={`transition ${
                    openDropdown ? "rotate-180" : ""
                  } text-black dark:text-white`}
                />
              </button>

              {openDropdown && (
                <div className="absolute mt-2 w-32 bg-white dark:bg-[#1f2125] shadow-xl border rounded-lg z-[1000]">
                  {["All", "Admins", "Invigilators", "Students"].map((opt) => (
                    <div
                      key={opt}
                      onClick={() => {
                        setSelectedType(opt);
                        setOpenDropdown(false);
                      }}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222] text-black dark:text-white"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GRAPH */}
          <div className="w-full h-[260px] sm:h-[300px] md:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              {selectedType === "All" ? (
                <LineChart data={activeUsersMapped}>
                  <CartesianGrid stroke="#444" strokeDasharray="5 5" />
                  <XAxis dataKey="month" tick={{ fill: "#ccc" }} />
                  <YAxis tick={{ fill: "#ccc" }} />
                  <Tooltip />

                  <Line dataKey="admin" stroke="#3366ff" strokeWidth={3} />
                  <Line dataKey="invigilator" stroke="#33cc99" strokeWidth={3} />
                  <Line dataKey="user" stroke="#ff3399" strokeWidth={3} />
                </LineChart>
              ) : (
                <LineChart data={activeUsersMapped}>
                  <CartesianGrid stroke="#444" strokeDasharray="5 5" />
                  <XAxis dataKey="month" tick={{ fill: "#ccc" }} />
                  <YAxis tick={{ fill: "#ccc" }} />
                  <Tooltip />
                  <Line dataKey="value" stroke="#4f6df5" strokeWidth={3} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* ORG USERS */}
        <div className="bg-white dark:bg-[#111] p-5 rounded-2xl shadow border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Organization User Count
            </h2>

            <div className="relative w-full sm:w-72">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                placeholder="Search Organization..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-12 pr-4 py-2 w-full bg-white dark:bg-[#1f2125] border rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-5">
            {filteredOrgs.map((i) => (
              <div key={i.org}>
                <div className="flex justify-between text-sm mb-1 text-black dark:text-white">
                  <span>{i.org}</span>
                  <span className="font-semibold">{i.users}</span>
                </div>

                <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full">
                  <div
                    className="h-full bg-[#4f6df5] rounded-full"
                    style={{ width: `${(i.users / 350) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DAILY LOGINS */}
      <div className="bg-white dark:bg-[#111] p-5 rounded-2xl shadow border mt-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          User Access (Daily Logins)
        </h2>

        <div className="w-full h-[260px] sm:h-[300px] md:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyMapped}>
              <CartesianGrid stroke="#444" strokeDasharray="5 5" />
              <XAxis dataKey="day" tick={{ fill: "#ccc" }} />
              <YAxis tick={{ fill: "#ccc" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f6df5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
