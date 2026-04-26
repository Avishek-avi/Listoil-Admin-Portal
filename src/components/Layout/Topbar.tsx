import { signOut, useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  
  const variantClasses: Record<string, string> = {
    primary:   "btn btn-primary",
    secondary: "btn btn-secondary",
    danger:    "btn btn-danger",
  };

  const getScopeLabel = () => {
    if (!session?.user) return "National View";
    if (session.user.scopeType === 'Global') return "National View";
    if (session.user.scopeType === 'State') return `State: ${session.user.entityNames?.join(', ') || 'N/A'}`;
    if (session.user.scopeType === 'City') return `City: ${session.user.entityNames?.join(', ') || 'N/A'}`;
    return "National View";
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="font-bold tracking-tight" style={{ fontSize: "1.0625rem", color: "#111827", letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{subtitle}</p>
        </div>

        {/* RBAC Badge */}
        {session?.user && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <i className="fas fa-user-shield text-[9px]"></i>
              {session.user.role}
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <i className="fas fa-globe text-[10px]"></i>
              {getScopeLabel()}
            </div>
          </div>
        )}
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
