import React from "react";
import { Bell } from "lucide-react";

export default function NotificationDropdown({ notifications = [], setNotifications }) {
  const onMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const onClearAll = () => {
    setNotifications([]); // Provider handles localStorage
  };

  return (
    <div className="absolute top-12 right-0 z-[9999] w-[calc(100vw-1.5rem)] sm:w-[340px] md:w-[380px] max-w-[380px] bg-white dark:bg-[#1f2125] shadow-xl border border-gray-200 dark:border-[#2a2c31] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-black dark:text-white">
          Notifications
        </h2>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium">
          <button onClick={onMarkAllRead} className="text-[#4f6df5] hover:underline whitespace-nowrap">
            Mark all read
          </button>
          <button onClick={onClearAll} className="text-[#4f6df5] hover:underline whitespace-nowrap">
            Clear All
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2">
        {notifications.length > 0 ? (
          notifications.map((n, idx) => (
            <div
              key={n.template_id ? `${n.template_id}-${n.time}` : idx}
              className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2c31] transition"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#eef2ff] dark:bg-[#2a2c31] flex items-center justify-center flex-shrink-0">
                  <Bell className="text-[#4f6df5]" size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[14px] sm:text-[15px] text-black dark:text-white truncate">
                      {n.title}
                    </h3>
                    {!n.read && <span className="w-2 h-2 bg-[#4f6df5] rounded-full flex-shrink-0" />}
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 break-words">{n.desc}</p>

                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {n.time ? new Date(n.time).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-sm sm:text-base text-gray-500 dark:text-gray-400 py-6">
            No notifications
          </p>
        )}
      </div>
    </div>
  );
}
