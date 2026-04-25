"use client";

import { useNotification } from "@/hooks/useNotification";
import { CheckCircle, XCircle } from "lucide-react";

export default function Notification() {
  const { notification, removeNotification } = useNotification();

  if (!notification) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 transition-all z-50 ${
        notification.type === "success" ? "bg-green-500" : "bg-red-500"
      }`}
      style={{ animation: "slideDown 0.3s ease" }}
    >
      {notification.type === "success" ? <CheckCircle /> : <XCircle />}
      <span>{notification.message}</span>
      <button onClick={removeNotification} className="ml-4">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
}