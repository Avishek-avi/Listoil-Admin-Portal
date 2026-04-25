// src/components/TopBar.tsx
"use client";

import { signOut } from "next-auth/react";

export type ActionButton = {
  label: string;
  icon: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
};

type TopBarProps = {
  title: string;
  subtitle: string;
  actions?: ActionButton[];
};

export default function TopBar({ title, subtitle, actions = [] }: TopBarProps) {
  const variantClasses: Record<string, string> = {
    primary:   "btn btn-primary",
    secondary: "btn btn-secondary",
    danger:    "btn btn-danger",
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div>
        <h1 className="font-bold tracking-tight" style={{ fontSize: "1.0625rem", color: "#111827", letterSpacing: "-0.01em" }}>
          {title}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action, idx) => (
          <button key={idx} onClick={action.onClick} className={variantClasses[action.variant ?? "primary"]}>
            <i className={action.icon}></i>
            {action.label}
          </button>
        ))}

        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}
        >
          <i className="fas fa-bell text-sm"></i>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
        </button>

        <button onClick={() => signOut()} className="btn btn-danger">
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </div>
    </div>
  );
}
