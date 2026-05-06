import React, { useEffect, useState, useCallback } from "react";
import { useRealtimeAnalytics, usePolling } from "../../hooks/useRealtimeAnalytics";
import analyticsService from "../../services/analyticsService";
import { Users, Clock, CheckCircle, AlertCircle, Wifi, WifiOff } from "lucide-react";
import toast from "react-hot-toast";

export default function InvigilatorRealtimeAnalytics() {
  const [invigilatorId, setInvigilatorId] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [liveExams, setLiveExams] = useState([]);
  const [dashboardData, setDashboardData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Get invigilatorId, orgId, userId from session/context
  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setInvigilatorId(user.invigilator_id || user.user_id || user.id);
      setOrgId(user.org_id || 'default_org');
      setUserId(user.user_id || user.id);
    }
  }, []);

  // Fetch live monitoring data (5-second polling for real-time)
  const fetchLiveData = useCallback(async () => {
    if (!invigilatorId || !orgId) return null;
    return await analyticsService.getInvigilatorLive(invigilatorId, orgId);
  }, [invigilatorId, orgId]);

  // Fetch dashboard data (30-second polling)
  const fetchDashboard = useCallback(async () => {
    if (!invigilatorId || !orgId) return null;
    return await analyticsService.getInvigilatorDashboard(invigilatorId, orgId);
  }, [invigilatorId, orgId]);

  // Setup 5-second polling for live data (critical for proctoring)
  const {
    data: liveResponse,
    loading: liveLoading,
    refresh: refreshLive
  } = usePolling(fetchLiveData, 5000, [invigilatorId, orgId]);

  // Setup 30-second polling for dashboard
  const {
    data: dashboardResponse,
    loading: dashboardLoading,
    refresh: refreshDashboard
  } = usePolling(fetchDashboard, 30000, [invigilatorId, orgId]);

  // Setup WebSocket for instant updates
  const { connected, error: socketError } = useRealtimeAnalytics({
    orgId,
    userId,
    invigilatorId,
    role: 'invigilator',
    enabled: !!orgId && !!userId && !!invigilatorId,
    onExamSubmitted: (data) => {
      toast.success(`Student submitted: ${data.examTitle || 'Exam'}`);
      setLastUpdate(new Date());
      refreshLive();
      refreshDashboard();
    },
    onExamStarted: (data) => {
      toast(`New exam attempt started`, { icon: '🚀' });
      setLastUpdate(new Date());
      refreshLive();
    },
    onMonitoringUpdate: (data) => {
      refreshLive();
    }
  });

  // Update state when data changes
  useEffect(() => {
    if (liveResponse?.success) {
      setLiveExams(liveResponse.data || []);
      setLastUpdate(new Date());
    }
  }, [liveResponse]);

  useEffect(() => {
    if (dashboardResponse?.success) {
      setDashboardData(dashboardResponse.data || []);
    }
  }, [dashboardResponse]);

  // Calculate totals
  const totalActiveStudents = liveExams.reduce((sum, exam) => 
    sum + (exam.active_attempts || 0), 0
  );
  const totalCompletedToday = liveExams.reduce((sum, exam) => 
    sum + (exam.completed_attempts || 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1b1c1f] p-8 transition-all">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Live Exam Monitoring
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Real-time student activity and exam proctoring
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            connected 
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Live (5s refresh)' : 'Offline'}
          </div>
          
          {/* Last Update */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          
          {/* Manual Refresh */}
          <button
            onClick={() => {
              refreshLive();
              refreshDashboard();
              setLastUpdate(new Date());
            }}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-[#23272A] rounded-xl p-6 shadow border border-gray-200 dark:border-[#2f3237]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Students
            </h3>
            <Users className="text-indigo-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {totalActiveStudents}
          </p>
          <p className="text-xs text-green-600 mt-1">
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-1"></span>
            Currently taking exams
          </p>
        </div>

        <div className="bg-white dark:bg-[#23272A] rounded-xl p-6 shadow border border-gray-200 dark:border-[#2f3237]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Completed Today
            </h3>
            <CheckCircle className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {totalCompletedToday}
          </p>
          <p className="text-xs text-gray-500 mt-1">Finished submissions</p>
        </div>

        <div className="bg-white dark:bg-[#23272A] rounded-xl p-6 shadow border border-gray-200 dark:border-[#2f3237]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Exams
            </h3>
            <Clock className="text-yellow-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {liveExams.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Ongoing assessments</p>
        </div>

        <div className="bg-white dark:bg-[#23272A] rounded-xl p-6 shadow border border-gray-200 dark:border-[#2f3237]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Alert Status
            </h3>
            <AlertCircle className="text-red-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            0
          </p>
          <p className="text-xs text-gray-500 mt-1">No issues detected</p>
        </div>
      </div>

      {/* Live Exam Cards */}
      <div className="space-y-6">
        {liveLoading && liveExams.length === 0 ? (
          <div className="bg-white dark:bg-[#23272A] rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading live data...</p>
          </div>
        ) : liveExams.length === 0 ? (
          <div className="bg-white dark:bg-[#23272A] rounded-xl p-8 text-center">
            <Clock className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Active Exams
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              There are currently no students taking exams. Check back soon!
            </p>
          </div>
        ) : (
          liveExams.map((exam, index) => (
            <div 
              key={exam.exam_id || index} 
              className="bg-white dark:bg-[#23272A] rounded-xl shadow border border-gray-200 dark:border-[#2f3237] overflow-hidden"
            >
              {/* Exam Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      {exam.exam_title || 'Exam'}
                    </h2>
                    <p className="text-indigo-100 text-sm">
                      Exam ID: {exam.exam_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                      <span className="text-white font-bold text-lg">
                        {exam.active_attempts || 0} Active
                      </span>
                    </div>
                    <p className="text-indigo-100 text-xs mt-1">
                      {exam.completed_attempts || 0} Completed
                    </p>
                  </div>
                </div>
              </div>

              {/* Students List */}
              <div className="p-6">
                {!exam.students_list || exam.students_list.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No active students at the moment
                  </p>
                ) : (
                  <div className="space-y-3">
                    {exam.students_list.map((student, idx) => {
                      const timeElapsed = student.time_elapsed_minutes || 0;
                      const statusColor = 
                        student.status === 'completed' ? 'green' :
                        student.status === 'in_progress' ? 'yellow' : 'gray';

                      return (
                        <div 
                          key={student.user_id || idx}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1b1c1f] rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                              <span className="text-indigo-600 dark:text-indigo-300 font-semibold">
                                {(student.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            
                            {/* Student Info */}
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                {student.name || 'Unknown Student'}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {student.email || 'No email'}
                              </p>
                            </div>
                          </div>

                          {/* Status and Time */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Time Elapsed
                              </p>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {Math.floor(timeElapsed)} min
                              </p>
                            </div>
                            
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              statusColor === 'green' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : statusColor === 'yellow'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                            }`}>
                              {student.status || 'unknown'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Display */}
      {socketError && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Real-time connection unavailable: {socketError}. Using 5-second polling fallback.
          </p>
        </div>
      )}
    </div>
  );
}
