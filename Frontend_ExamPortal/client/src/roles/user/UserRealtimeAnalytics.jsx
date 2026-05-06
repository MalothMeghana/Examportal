import React, { useState, useEffect, useCallback } from "react";
import UserLayout from "../../components/UserLayout";
import { useRealtimeAnalytics, usePolling } from "../../hooks/useRealtimeAnalytics";
import analyticsService from "../../services/analyticsService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Trophy, TrendingUp, Clock, Award, RefreshCw } from "lucide-react";

export default function UserRealtimeAnalytics() {
  const [userId, setUserId] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserId(user.user_id || user.id);
        setOrgId(user.org_id || 'default_org');
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  const fetchPerformance = useCallback(async () => {
    if (!userId) return null;
    const filters = {};
    if (filter !== "all") filters.status = filter;
    return await analyticsService.getUserPerformance(userId, filters);
  }, [userId, filter]);

  const fetchSummary = useCallback(async () => {
    if (!userId) return null;
    return await analyticsService.getUserSummary(userId);
  }, [userId]);

  const {
    data: performanceResponse,
    loading: performanceLoading,
    refresh: refreshPerformance
  } = usePolling(fetchPerformance, 15000, [userId, filter]);

  const {
    data: summaryResponse,
    loading: summaryLoading,
    refresh: refreshSummary
  } = usePolling(fetchSummary, 15000, [userId]);

  const { connected } = useRealtimeAnalytics({
    orgId,
    userId,
    role: 'user',
    enabled: !!orgId && !!userId,
    onExamGraded: () => {
      setLastUpdate(new Date());
      refreshPerformance();
      refreshSummary();
    },
    onExamSubmitted: (data) => {
      if (data?.userId === userId) {
        refreshPerformance();
      }
    }
  });

  useEffect(() => {
    if (performanceResponse?.success) {
      const rawData = performanceResponse.data;
      const dataArray = Array.isArray(rawData) ? rawData : 
                        Array.isArray(rawData?.data) ? rawData.data :
                        Array.isArray(rawData?.exams) ? rawData.exams : [];
      setPerformanceData(dataArray);
    }
  }, [performanceResponse]);

  useEffect(() => {
    if (summaryResponse?.success) {
      const rawData = summaryResponse.data;
      const normalized = {
        total_exams_attempted: rawData?.total_exams_attempted || rawData?.total_exams || rawData?.examsTaken || 0,
        completed_count: rawData?.completed_count || rawData?.completed || rawData?.examsTaken || 0,
        passed_count: rawData?.passed_count || rawData?.passed || 0,
        failed_count: rawData?.failed_count || rawData?.failed || 0,
        avg_percentage: rawData?.avg_percentage || rawData?.average_score || rawData?.averageScore || 0,
        avg_time_taken_minutes: rawData?.avg_time_taken_minutes || rawData?.avg_time || rawData?.avgTime || 0,
      };
      setSummaryData(normalized);
    }
  }, [summaryResponse]);

  const chartData = performanceData.slice(0, 10).map((exam) => ({
    name: (exam.exam_title || exam.title || 'Exam').substring(0, 12),
    score: parseFloat(exam.percentage || exam.score_percentage || 0),
  }));

  const trendData = performanceData.slice(0, 10).map((exam, index) => ({
    exam: 'E' + (index + 1),
    score: parseFloat(exam.percentage || exam.score_percentage || 0),
  }));

  const handleRefresh = () => {
    refreshPerformance();
    refreshSummary();
    setLastUpdate(new Date());
  };

  const isLoading = performanceLoading || summaryLoading;

  const passRate = summaryData?.total_exams_attempted > 0
    ? ((summaryData.passed_count / summaryData.total_exams_attempted) * 100).toFixed(0)
    : 0;

  const stats = [
    { label: "Total Exams", value: summaryData?.total_exams_attempted || performanceData.length || 0, Icon: Award, sub: (summaryData?.completed_count || 0) + " completed" },
    { label: "Average Score", value: parseFloat(summaryData?.avg_percentage || 0).toFixed(1) + "%", Icon: TrendingUp, sub: (summaryData?.avg_percentage || 0) >= 50 ? "Good" : "Needs improvement" },
    { label: "Pass Rate", value: passRate + "%", Icon: Trophy, sub: (summaryData?.passed_count || 0) + " passed" },
    { label: "Avg Time", value: Math.round(summaryData?.avg_time_taken_minutes || 0) + " min", Icon: Clock, sub: "Per exam" },
  ];

  return (
    <UserLayout>
      <div className="mb-6 px-1 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Performance Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your exam performance</p>
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
          <option value="all">All Exams</option>
          <option value="passed">Passed Only</option>
          <option value="failed">Failed Only</option>
          <option value="pending">Pending Results</option>
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
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Exam Scores</h3>
          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No exam data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                  <Bar dataKey="score" fill="#374151" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Performance Trend</h3>
          <div className="h-64">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No trend data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="exam" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="score" stroke="#374151" strokeWidth={2} dot={{ fill: '#374151', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Exam History Table */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Exam History</h3>
        {performanceData.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No exams taken yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exam</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Percentage</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.slice(0, 15).map((exam, index) => {
                  const pct = parseFloat(exam.percentage || exam.score_percentage || 0);
                  const status = exam.result_status || exam.status || 'pending';
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{exam.exam_title || exam.title || 'N/A'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {exam.exam_type || exam.type || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">
                        {exam.score || exam.marks || 0}/{exam.total_marks || exam.max_marks || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-gray-900 dark:text-white">{pct.toFixed(1)}%</td>
                      <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">
                        {Math.round(exam.time_taken_minutes || exam.time_taken || 0)} min
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          status === 'passed' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                          status === 'failed' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                          'bg-gray-50 dark:bg-gray-900 text-gray-500'
                        }`}>
                          {status}
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
    </UserLayout>
  );
}
