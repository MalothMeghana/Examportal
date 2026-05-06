// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useMemo,
//   useState,
//   useCallback,
//   useRef,
// } from "react";
// import { initializeSocket, onNotification, offNotification } from "../common_files/Socket";

// const NotificationContext = createContext(null);

// export function NotificationProvider({ children }) {
//   const [notifications, setNotifications] = useState([]);
//   const didInit = useRef(false);

//   // Load from localStorage on mount
//   useEffect(() => {
//     const saved = localStorage.getItem("notifications");
//     if (saved) {
//       try {
//         setNotifications(JSON.parse(saved));
//       } catch {
//         console.error("❌ Invalid notifications cache");
//       }
//     }
//   }, []);

//   // Persist notifications
//   useEffect(() => {
//     localStorage.setItem("notifications", JSON.stringify(notifications));
//   }, [notifications]);

//   // Socket handler
//   const handler = useCallback((data) => {
//     const payload = Array.isArray(data) ? data[0] : data;
//     if (!payload) return;

//     setNotifications((prev) => {
//       // prevent duplicates
//       const exists = prev.some((n) => n.template_id === payload.template_id && n.time === payload.time);
//       if (exists) return prev;
//       return [{ ...payload, read: payload.read ?? false }, ...prev];
//     });
//   }, []);

//   // Initialize socket
//   useEffect(() => {
//     const token = sessionStorage.getItem("token") || localStorage.getItem("token");
//     if (!token || didInit.current) return;
//     didInit.current = true;

//     const socket = initializeSocket();
//     if (!socket) return;

//     if (socket.connected) onNotification(handler);
//     else socket.once("connect", () => onNotification(handler));

//     return () => offNotification();
//   }, [handler]);

//   const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

//   const value = useMemo(() => ({ notifications, setNotifications, unreadCount }), [notifications, unreadCount]);

//   return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
// }

// export function useNotifications() {
//   const ctx = useContext(NotificationContext);
//   if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
//   return ctx;
// }
/* @refresh reset */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { initializeSocket, onNotification, offNotification } from "../common_files/Socket";
import api from "../api";

const NotificationContext = createContext(null);

const safeParse = (value, fallback = []) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const dedupeNotifications = (items = []) => {
  const seen = new Set();
  return items.filter((n) => {
    const key = n?.template_id
      ? `${n.template_id}-${n.time}`
      : `${n?.title ?? ""}-${n?.desc ?? ""}-${n?.time ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function NotificationProvider({ children }) {
  const role = sessionStorage.getItem("role") || localStorage.getItem("role") || "";
  const storageKey = role ? `notifications_${role}` : "notifications";
  const legacyKey = "notifications";

  const loadNotifications = () => {
    const current = safeParse(localStorage.getItem(storageKey), []);
    if (current.length > 0 || storageKey === legacyKey) return current;

    if (role === "superadmin") {
      const legacy = safeParse(localStorage.getItem(legacyKey), []);
      if (legacy.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(legacy));
        return legacy;
      }
    }

    return current;
  };

  const [notifications, setNotifications] = useState(() => loadNotifications());
  const didInit = useRef(false);
  const [token, setToken] = useState(
    sessionStorage.getItem("token") || localStorage.getItem("token") || ""
  );

  // Reload notifications when role/storage key changes (e.g., login switch)
  useEffect(() => {
    setNotifications(loadNotifications());
  }, [storageKey, role]);

  // Keep token in sync after login (provider mounts before token is set)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const nextToken =
        sessionStorage.getItem("token") || localStorage.getItem("token") || "";
      if (nextToken && nextToken !== token) {
        setToken(nextToken);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [token]);

  // Fetch latest notifications on mount (superadmin only)
  useEffect(() => {
    if (role !== "superadmin") return;
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const response = await api.get("/superadmin/notifications");
        const list = response?.data?.notifications;
        if (!Array.isArray(list) || !isMounted) return;
        setNotifications((prev) => dedupeNotifications([...list, ...prev]));
      } catch {
        // Ignore fetch errors; realtime socket will still work
      }
    };

    fetchNotifications();
    return () => {
      isMounted = false;
    };
  }, [role]);

  // Persist notifications whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  }, [notifications, storageKey]);

  // Socket handler
  const handler = useCallback((data) => {
    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload) return;

    setNotifications((prev) => {
      // Prevent duplicates
      const exists = prev.some(
        (n) => n.template_id === payload.template_id && n.time === payload.time
      );
      if (exists) return prev;
      return [{ ...payload, read: payload.read ?? false }, ...prev];
    });
  }, []);

  // Initialize socket
  useEffect(() => {
    if (!token) {
      didInit.current = false;
      offNotification();
      return;
    }
    if (didInit.current) return;
    didInit.current = true;

    const socket = initializeSocket();
    if (!socket) return;

    if (socket.connected) onNotification(handler);
    else socket.once("connect", () => onNotification(handler));

    return () => offNotification();
  }, [handler, token]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(() => ({ notifications, setNotifications, unreadCount }), [
    notifications,
    unreadCount,
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

