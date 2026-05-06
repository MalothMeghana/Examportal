import { useEffect, useState } from "react";
import UserLayout from "../../components/UserLayout";
import api from "../../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { FileText, TrendingUp, Trophy, BookOpen } from "lucide-react";

function StatCard({ icon: Icon, value, label, helper }) {
  return (
    <div className="bg-white dark:bg-[#0F1216] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm px-5 py-4 flex flex-col">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#EEF2FF] dark:bg-blue-900/30 flex items-center justify-center">
          <Icon size={22} className="text-[#4F46E5]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[20px] font-semibold leading-tight text-gray-900 dark:text-white">
            {value}
          </span>
          <span className="text-[13px] text-gray-600 dark:text-gray-300 mt-1">
            {label}
          </span>
        </div>
      </div>

      <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-800 my-3"></div>

      <span className="text-[12px] text-gray-500 dark:text-gray-400">
        {helper}
      </span>
    </div>
  );
}

function ExamTag({ label }) {
  return (
    <span className="px-4 py-[6px] text-[12px] font-medium rounded-md bg-[#EEF2FF] text-[#4F46E5] border border-[#DDE3FF]">
      {label}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    attempted: 0,
    remainingExams: 0,
    averageScore: 0,
    studyMaterials: 0
  });

  const [performanceData, setPerformanceData] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    loadOverview();
    loadPerformance();
    loadUpcoming();
    loadAchievements();
  }, []);
  
  const loadOverview = async () => {
    try {
      const res = await api.get("/user/dashboard/overview");
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Overview API error:", err);
    }
  };

  const loadPerformance = async () => {
    try {
      const res = await api.get("/user/dashboard/performance");
      if (res.data?.success) {
        setPerformanceData(
          res.data.data.map(d => ({
            day: new Date(d.date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric"
            }),
            score: d.score
          }))
        );
      }
    } catch (err) {
      console.error("Performance API error:", err);
    }
  };

  const loadUpcoming = async () => {
    try {
      const res = await api.get("/user/dashboard/upcoming-exams");
      if (res.data?.success) {
        setUpcomingExams(
          res.data.data.map(e => ({
            id: e.id,
            name: e.title,
            date: new Date(e.date).toLocaleDateString(),
            time: new Date(e.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            tag: e.tag
          }))
        );
      }
    } catch (err) {
      console.error("Upcoming exams API error:", err);
    }
  };

  const loadAchievements = async () => {
  try {
    const res = await api.get("/user/dashboard/achievements");
    if (res.data?.success) {
      setAchievements(res.data.data || []);
    } else {
      setAchievements([]);
    }
  } catch (err) {
    console.error("Achievements API error:", err);
    setAchievements([]);
  }
};

  return (
    <UserLayout>
      <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-[#0D1117] text-gray-900 dark:text-white">
        <div className="max-w-6xl mx-auto space-y-6">

          <div className="pt-2">
            <h2 className="text-2xl sm:text-[26px] font-semibold tracking-tight">
              Welcome Back, Student!
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track your progress and upcoming exams
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={FileText} value={stats.totalExams} label="Total Exams" helper={`${stats.activeExams} currently active`} />
            <StatCard icon={Trophy} value={stats.attempted} label="Attempted" helper={`${stats.remainingExams} remaining`} />
            <StatCard icon={TrendingUp} value={`${stats.averageScore}%`} label="Average Score" helper="Across all attempts" />
            <StatCard icon={BookOpen} value={stats.studyMaterials} label="Study Materials" helper="Available resources" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#0F1216] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold">Performance Progress</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your score trend over time
              </p>

              <div className="h-56 mt-2 flex items-center justify-center">
                {performanceData.length === 0 ? (
                  <span className="text-gray-500">No performance data yet</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <LineChart data={performanceData}>
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#0F1216] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold">Upcoming Exams</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your scheduled exams
              </p>

              <div className="mt-4 space-y-3.5">
                {upcomingExams.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No upcoming exams
                  </div>
                ) : (
                  upcomingExams.map(exam => (
                    <div key={exam.id} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{exam.name}</span>
                        <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {exam.date} • {exam.time}
                        </span>
                      </div>
                      <ExamTag label={exam.tag} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="pb-4">
            <h3 className="text-sm font-semibold">Recent Achievements</h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.length === 0 ? (
                <div className="col-span-3 text-center text-gray-500 py-8">
                  No recent achievements
                </div>
              ) : (
                achievements.map(item => (
                  <div key={item.id} className="flex items-start gap-4 rounded-2xl bg-white dark:bg-[#0F1216] border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4">
                    <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Trophy size={20} className="text-blue-600 dark:text-blue-300" />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-tight">
                        {item.title}
                      </span>
                      <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </span>
                      <span className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </UserLayout>
  );
}
