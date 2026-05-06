import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import { useRealtimeAnalytics, usePolling } from "../../hooks/useRealtimeAnalytics";
import analyticsService from "../../services/analyticsService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Users, FileText, TrendingUp, Clock, RefreshCw, BarChart3 } from "lucide-react";

export default function AdminRealtimeAnalytics() {
  const [orgId, setOrgId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setOrgId(user.org_id || 'default_org');
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    const filters = {};
    if (filter !== "all") filters.examType = filter;
    return await analyticsService.getAdminDashboard(filters);
  }, [filter]);

  const fetchSummary = useCallback(async () => {
    return await analyticsService.getAdminSummary();
  }, []);

  const {
    data: dashboardResponse,
    loading: dashboardLoading,
    refresh: refreshDashboard
  } = usePolling(fetchDashboard, 15000, [filter]);

  const {
    data: summaryResponse,
    loading: summaryLoading,
    refresh: refreshSummary
  } = usePolling(fetchSummary, 15000, []);

  const { connected } = useRealtimeAnalytics({
    orgId,
    role: 'admin',
    enabled: !!orgId,
    onExamCreated: () => {
      setLastUpdate(new Date());
      refreshDashboard();
      refreshSummary();
    },
    onExamSubmitted: () => {
      refreshDashboard();
    },
    onExamGraded: () => {
      refreshDashboard();
      refreshSummary();
    }
  });

  useEffect(() => {
    if (dashboardResponse?.success) {
      const rawData = dashboardResponse.data;
      const normalized = {
        total_exams: rawData?.total_exams || rawData?.totalExams || rawData?.exam_count || 0,
        total_users: rawData?.total_users || rawData?.totalUsers || rawData?.user_count || 0,
        average_score: rawData?.average_score || rawData?.avgScore || rawData?.avg_percentage || 0,
        total_submissions: rawData?.total_submissions || rawData?.submissions || 0,
        pass_rate: rawData?.pass_rate || rawData?.passRate || 0,
        recent_exams: rawData?.recent_exams || rawData?.recentExams || rawData?.exams || [],
        exam_types: rawData?.exam_types || rawData?.examTypes || [],
      };
      setDashboardData(normalized);
    }
  }, [dashboardResponse]);

  useEffect(() => {
    if (summaryResponse?.success) {
      const rawData = summaryResponse.data;
      const normalized = {
        total_exams: rawData?.total_exams || rawData?.totalExams || 0,
        active_exams: rawData?.active_exams || rawData?.activeExams || 0,
        total_users: rawData?.total_users || rawData?.totalUsers || 0,
        active_users: rawData?.active_users || rawData?.activeUsers || 0,
        avg_score: rawData?.avg_score || rawData?.avgScore || rawData?.average_score || 0,
        pass_rate: rawData?.pass_rate || rawData?.passRate || 0,
        total_submissions: rawData?.total_submissions || rawData?.submissions || 0,
        pending_grading: rawData?.pending_grading || rawData?.pendingGrading || 0,
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

  const GRAY_COLORS = ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'];

  const examTypeData = (dashboardData?.exam_types || []).map((type, index) => ({
    name: type.type || type.name || `Type ${index + 1}`,
    value: type.count || type.value || 0,
  }));

  const recentExams = dashboardData?.recent_exams || [];
  const performanceData = recentExams.slice(0, 8).map((exam) => ({
    name: (exam.title || exam.exam_title || 'Exam').substring(0, 10),
    avgScore: parseFloat(exam.avg_score || exam.average_score || exam.avgScore || 0),
    submissions: exam.submissions || exam.submission_count || 0,
  }));

  const stats = [
    { label: "Total Exams", value: summaryData?.total_exams || dashboardData?.total_exams || 0, Icon: FileText, sub: (summaryData?.active_exams || 0) + " active" },
    { label: "Total Users", value: summaryData?.total_users || dashboardData?.total_users || 0, Icon: Users, sub: (summaryData?.active_users || 0) + " active" },
    { label: "Avg Score", value: parseFloat(summaryData?.avg_score || dashboardData?.average_score || 0).toFixed(1) + "%", Icon: TrendingUp, sub: "Pass rate: " + (summaryData?.pass_rate || dashboardData?.pass_rate || 0) + "%" },
    { label: "Submissions", value: summaryData?.total_submissions || dashboardData?.total_submissions || 0, Icon: BarChart3, sub: (summaryData?.pending_grading || 0) + " pending" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6 px-1 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor exam performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Updated {lastUpdate.toLocaleTimeString()}</span>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 py-2 px-4 rounded-lg bg-white dark:bg-[#111] text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All Exam Types</option>
          <option value="mcq">MCQ Only</option>
          <option value="written">Written Only</option>
          <option value="practical">Practical Only</option>
        </select>
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

        {/* Performance Overview */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Exam Performance</h3>
          <div className="h-64">
            {performanceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No performance data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                  <Bar dataKey="avgScore" fill="#374151" radius={[4, 4, 0, 0]} name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Exams Table */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Recent Exams</h3>
        {recentExams.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No exams found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exam Title</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Submissions</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Score</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pass Rate</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.slice(0, 10).map((exam, index) => {
                  const avgScore = parseFloat(exam.avg_score || exam.average_score || exam.avgScore || 0);
                  const passRate = parseFloat(exam.pass_rate || exam.passRate || 0);
                  return (
                    <tr key={exam.exam_id || index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{exam.title || exam.exam_title || 'N/A'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {exam.type || exam.exam_type || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">{exam.submissions || exam.submission_count || 0}</td>
                      <td className="py-3 px-3 text-center font-medium text-gray-900 dark:text-white">{avgScore.toFixed(1)}%</td>
                      <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">{passRate.toFixed(0)}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          exam.status === 'active' || exam.is_active ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                          'bg-gray-50 dark:bg-gray-900 text-gray-500'
                        }`}>
                          {exam.status || (exam.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
