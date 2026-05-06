import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useRealtimeAnalytics, usePolling } from "../../hooks/useRealtimeAnalytics";
import analyticsService from "../../services/analyticsService";
import { Building2, Users, FileText, TrendingUp, RefreshCw } from "lucide-react";

const GRAY_COLORS = ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'];

export default function SuperAdminRealtimeAnalytics() {
  const [userId, setUserId] = useState(null);
  const [dashboardData, setDashboardData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserId(user.user_id || user.id);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    const filters = {};
    if (selectedOrg) filters.orgId = selectedOrg;
    return await analyticsService.getSuperAdminDashboard(filters);
  }, [selectedOrg]);

  const fetchSummary = useCallback(async () => {
    return await analyticsService.getSuperAdminSummary();
  }, []);

  const {
    data: dashboardResponse,
    loading: dashboardLoading,
    refresh: refreshDashboard
  } = usePolling(fetchDashboard, 15000, [selectedOrg]);

  const {
    data: summaryResponse,
    loading: summaryLoading,
    refresh: refreshSummary
  } = usePolling(fetchSummary, 15000, []);

  const { connected } = useRealtimeAnalytics({
    orgId: 'global',
    userId,
    role: 'superadmin',
    enabled: !!userId,
    onExamSubmitted: () => {
      setLastUpdate(new Date());
      refreshDashboard();
      refreshSummary();
    },
    onExamGraded: () => {
      setLastUpdate(new Date());
      refreshDashboard();
      refreshSummary();
    },
    onExamStarted: () => {
      refreshDashboard();
    }
  });

  useEffect(() => {
    if (dashboardResponse?.success) {
      const rawData = dashboardResponse.data;
      setDashboardData(Array.isArray(rawData) ? rawData : rawData?.organizations || rawData?.data || []);
    }
  }, [dashboardResponse]);

  useEffect(() => {
    if (summaryResponse?.success) {
      const rawData = summaryResponse.data;
      const normalized = {
        total_organizations: rawData?.total_organizations || rawData?.totalOrgs || rawData?.org_count || 0,
        total_users: rawData?.total_users || rawData?.totalUsers || rawData?.user_count || 0,
        total_exams: rawData?.total_exams || rawData?.totalExams || rawData?.exam_count || 0,
        avg_score: rawData?.avg_score || rawData?.avgScore || rawData?.average_score || 0,
        total_submissions: rawData?.total_submissions || rawData?.submissions || 0,
        active_exams: rawData?.active_exams || rawData?.activeExams || 0,
      };
      setSummaryData(normalized);
    }
  }, [summaryResponse]);

  const handleRefresh = () => {
    refreshDashboard();
    refreshSummary();
    setLastUpdate(new Date());
  };

  const isLoading = dashboardLoading || summaryLoading;

  // Organization activity chart data
  const orgActivityData = dashboardData.reduce((acc, item) => {
    const existing = acc.find(org => org.name === item.org_name);
    if (existing) {
      existing.exams += 1;
      existing.students += item.total_students_attempted || 0;
    } else {
      acc.push({
        name: (item.org_name || 'Unknown').substring(0, 12),
        exams: 1,
        students: item.total_students_attempted || 0
      });
    }
    return acc;
  }, []);

  // Exam type distribution for pie chart
  const examTypeData = dashboardData.reduce((acc, exam) => {
    const type = exam.exam_type || 'Unknown';
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, []);

  const stats = [
    { label: "Organizations", value: summaryData?.total_organizations || 0, Icon: Building2, sub: "Active clients" },
    { label: "Total Users", value: summaryData?.total_users || 0, Icon: Users, sub: "Across all orgs" },
    { label: "Total Exams", value: summaryData?.total_exams || dashboardData.length || 0, Icon: FileText, sub: (summaryData?.active_exams || 0) + " active" },
    { label: "Avg Score", value: parseFloat(summaryData?.avg_score || 0).toFixed(1) + "%", Icon: TrendingUp, sub: (summaryData?.total_submissions || 0) + " submissions" },
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Global Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor performance across all organizations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Updated {lastUpdate.toLocaleTimeString()}</span>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-3">
        <select
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 py-2 px-4 rounded-lg bg-white dark:bg-[#111] text-sm text-gray-900 dark:text-white min-w-[200px]"
        >
          <option value="">All Organizations</option>
          {Array.from(new Set(dashboardData.map(d => d.org_id))).map(orgId => {
            const orgData = dashboardData.find(d => d.org_id === orgId);
            return (
              <option key={orgId} value={orgId}>
                {orgData?.org_name || orgId}
              </option>
            );
          })}
        </select>
        {selectedOrg && (
          <button
            onClick={() => setSelectedOrg("")}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Clear
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, Icon, sub }) => (
          <div key={label} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Icon size={18} className="text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Organization Activity */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Organization Activity</h3>
          <div className="h-64">
            {orgActivityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No organization data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orgActivityData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                  <Bar dataKey="exams" fill="#374151" radius={[4, 4, 0, 0]} name="Exams" />
                  <Bar dataKey="students" fill="#9ca3af" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Exam Type Distribution */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Exam Type Distribution</h3>
          <div className="h-64">
            {examTypeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No exam type data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={examTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {examTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GRAY_COLORS[index % GRAY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Organization Details</h3>
        {dashboardData.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No organization data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organization</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exam</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Students</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Score</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.slice(0, 15).map((item, index) => {
                  const avgScore = parseFloat(item.avg_score || item.average_score || 0);
                  const passRate = parseFloat(item.pass_rate || 0);
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{item.org_name || 'N/A'}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{item.exam_title || item.title || 'N/A'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {item.exam_type || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">{item.total_students_attempted || 0}</td>
                      <td className="py-3 px-3 text-center font-medium text-gray-900 dark:text-white">{avgScore.toFixed(1)}%</td>
                      <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">{passRate.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
