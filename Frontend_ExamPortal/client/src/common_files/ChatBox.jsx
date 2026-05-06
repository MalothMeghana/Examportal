import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { io } from "socket.io-client";
import { baseUrl } from "../config";

/* API */
const API = `${baseUrl}/chat`;
const SOCKET_URL = baseUrl.replace("/api", "");

export default function ChatBox() {
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("user") || "{}");
    const t = sessionStorage.getItem("token");

    if (u?.id && t) {
      setUserId(u.id);
      setToken(t);
    }
  }, []);

  /* ================= SOCKET (ONCE ONLY) ================= */
  useEffect(() => {
    if (!userId || !token || socketRef.current) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("receiveMessage", (msg) => {
      if (msg.roomId === activeChat?.roomId) {
        setMessages((prev) => [...prev, mapMsg(msg)]);
        scrollBottom();
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [userId, token]);

  /* ================= LOAD CONTACTS ================= */
  useEffect(() => {
    if (!userId || !token) return;

    fetch(`${API}/contacts/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const unique = Array.from(
            new Map(d.contacts.map((c) => [c.asi_id, c])).values()
          );
          setContacts(unique);
        }
      });
  }, [userId, token]);

  /* ================= OPEN CHAT ================= */
  const openChat = async (c) => {
    const roomId = [userId, c.asi_id].sort().join("_");

    setActiveChat({
      roomId,
      receiverId: c.asi_id,
      name: c.full_name,
    });

    socketRef.current.emit("joinRoom", { roomId });

    const res = await fetch(`${API}/messages/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      setMessages(data.messages.map(mapMsg));
      scrollBottom();
    }
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = () => {
    if (!text.trim() || !activeChat) return;

    const msg = {
      roomId: activeChat.roomId,
      sender: userId,
      receiver: activeChat.receiverId,
      content: text,
    };

    socketRef.current.emit("sendMessage", msg);
    setMessages((p) => [...p, mapMsg(msg)]);
    setText("");
    scrollBottom();
  };

  /* ================= UTILS ================= */
  const mapMsg = (msg) => ({
    from: msg.sender === userId ? "ME" : "OP",
    text: msg.content,
  });

  const scrollBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ================= UI ================= */
  return (
    <div className="grid grid-cols-12 gap-6 h-[75vh]">
      {/* CONTACTS */}
      <div className="col-span-4 bg-white rounded-xl border">
        <div className="p-4 font-semibold">Chats</div>
        <div className="overflow-y-auto">
          {contacts.map((c) => (
            <div
              key={c.asi_id}
              onClick={() => openChat(c)}
              className="p-3 cursor-pointer hover:bg-gray-100"
            >
              <div className="font-medium">{c.full_name}</div>
              <div className="text-xs text-gray-500">{c.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT */}
      <div className="col-span-8 bg-white rounded-xl border flex flex-col">
        <div className="p-4 border-b font-semibold">
          {activeChat?.name || "Select a chat"}
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-50">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.from === "ME" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 rounded-lg text-sm ${
                  m.from === "ME"
                    ? "bg-blue-600 text-white"
                    : "bg-white border"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white p-2 rounded-lg"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
