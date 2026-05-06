import React, { useCallback } from "react";
import {
  Eye, FileCheck, AlertTriangle, Users, RefreshCw, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { baseUrl } from "../../config";
import { useRealtimeData } from "../../hooks/useRealtimeData";

const POLL_INTERVAL = 10000;

export default function Invigilatordashboard() {
  const token = sessionStorage.getItem("token");

  const fetchDashboard = useCallback(async () => {
    const response = await fetch(`${baseUrl}/invigilator/dashboard`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return response.json();
  }, [token]);

  const { data, loading, lastUpdated, refresh } = useRealtimeData({
    fetchFn: fetchDashboard,
    interval: POLL_INTERVAL,
    enabled: !!token,
    dependencies: [token],
  });

  const dashboardData = data || {
    activeExams: 0,
    studentsOnline: 0,
    pendingGrading: 0,
    flaggedAttempts: 0,
    gradingProgress: [],
    recentActivity: [],
  };

  const stats = [
    { label: "Active Exams", value: dashboardData.activeExams, Icon: Eye, sub: "Currently monitored" },
    { label: "Students Online", value: dashboardData.studentsOnline, Icon: Users, sub: "Taking exams now" },
    { label: "Pending Grading", value: dashboardData.pendingGrading, Icon: FileCheck, sub: "Awaiting review" },
    { label: "Flagged", value: dashboardData.flaggedAttempts, Icon: AlertTriangle, sub: "Needs attention" },
  ];

  const chartData = dashboardData.gradingProgress?.map((item) => ({
    name: item.examName || item.name,
    graded: item.graded || 0,
    pending: item.pending || 0,
  })) || [];

  const formatLastUpdated = (date) =>
    date ? date.toLocaleTimeString() : "";

  return (
    <>
      <div className="mb-6 px-1 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Invigilator Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor exams & grading queue
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <button
            onClick={refresh}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-500" : "bg-green-500"}`} />
            <span className="text-xs text-gray-400">
              {loading ? "Syncing..." : "Live"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, Icon, sub }) => (
          <div key={label} className="bg-white dark:bg-[#111] border dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Icon size={18} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t dark:border-gray-800">{sub}</p>
          </div>
        ))}
      </div>

      {/* Grading Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-[#111] border dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">Grading Progress</h3>
          <div className="h-52">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="graded" fill="#374151" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No grading data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#111] border dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {dashboardData.recentActivity?.length ? (
              dashboardData.recentActivity.slice(0, 5).map((activity, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                    <Clock size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.studentName} - {activity.exam}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-400">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
