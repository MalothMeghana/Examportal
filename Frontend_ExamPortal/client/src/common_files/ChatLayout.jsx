import React from "react";

export default function ChatLayout({ children }) {
  return (
    <div className="w-full min-h-screen bg-gray-100 p-5">
      {children}
    </div>
  );
}
