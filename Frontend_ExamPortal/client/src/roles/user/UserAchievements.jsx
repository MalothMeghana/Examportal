import UserLayout from "../../components/UserLayout";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api";

function StatusBadge({ status }) {
  const base =
    "px-3 py-[3px] rounded-md text-[11px] font-medium inline-flex items-center justify-center";

  return status === "Unlocked" ? (
    <span className={`${base} bg-[#E3E8FF] text-[#4B6BFB] dark:bg-[#3d4280] dark:text-white`}>
      Unlocked
    </span>
  ) : (
    <span className={`${base} bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300`}>
      Locked
    </span>
  );
}

function AchievementIcon({ status }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] dark:bg-[#2c2f45] flex items-center justify-center shrink-0">
      <Trophy
        size={22}
        strokeWidth={1.8}
        className={status === "Unlocked" ? "text-[#4B6BFB] dark:text-white" : "text-gray-400"}
      />
    </div>
  );
}

export default function Achievements() {
  const [stats, setStats] = useState({
    totalAchievements: 0,
    unlocked: 0,
    locked: 0,
  });

  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await api.get("/user/achievements/overview",
      );

      if (res.data?.success) {
        setStats(res.data.data.stats);
        setAchievements(res.data.data.allAchievements);
      }
    } catch (err) {
      console.error(err);
    }
  };

  
  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B1222] px-1 sm:px-3 py-2 mt-[-14px]">
        <div className="max-w-[1300px] mx-auto w-full">

          <div className="mb-5 mt-1">
            <h1 className="text-[26px] font-semibold text-gray-900 dark:text-white">
              Achievements
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track your milestones and accomplishments
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-3 mt-1">
            {[
              { label: "Total Achievements", value: stats.totalAchievements },
              { label: "Number of Achievements", value: stats.unlocked },
              { label: "Locked Achievements", value: stats.locked },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white dark:bg-[#1a1c29] h-[130px] rounded-2xl
                border border-gray-200 dark:border-gray-700
                shadow-[0_4px_18px_rgba(0,0,0,0.08)]
                px-6 pt-4 flex flex-col"
              >
                <span className="text-[32px] font-semibold dark:text-white leading-tight">
                  {item.value}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white mt-3">
            Recent Achievements
          </h2>

          {achievements.length === 0 && (
            <div className="flex items-center justify-center h-[160px] text-sm text-gray-500 dark:text-gray-400">
              No achievements found
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4 mb-10">
            {achievements.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-[#1a1c29]
                rounded-2xl border border-gray-200 dark:border-gray-700
                shadow-[0_4px_18px_rgba(0,0,0,0.08)]
                p-6 flex gap-5"
              >
                <AchievementIcon status={item.status} />

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[15px] font-semibold dark:text-white">
                      {item.title}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-[6px]">
                    {item.description}
                  </p>

                  {item.unlockedAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-[4px]">
                      Unlocked on {new Date(item.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </UserLayout>
  );
}

