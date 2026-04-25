"use client"

import { useState, ReactNode } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "./Sidebar"
import TopBar from "./Topbar"
import { TOPBAR_CONFIG } from "@/config/topBarconfig"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  const pageConfig = TOPBAR_CONFIG[pathname] || {
    title: "Dashboard",
    subtitle: "Welcome to the admin panel",
    actions: [],
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar – Desktop */}
      <div className={`sidebar flex-col hidden lg:flex flex-shrink-0 h-screen sticky top-0 transition-all duration-300 ${sidebarExpanded ? 'w-64' : 'w-20'}`} style={{ background: 'var(--sidebar-bg)' }}>
        {/* Logo */}
        <div className="sidebar-logo-area flex items-center justify-between">
          {sidebarExpanded && (
            <img 
              src="https://listoil.com/wp-content/uploads/2023/05/listoil.com-logo.png"
              alt="Listoil Logo"
              className="h-8 w-auto shrink-0"
            />
          )}
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: "#64748b" }}
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <i className={`fas ${sidebarExpanded ? 'fa-chevron-left' : 'fa-chevron-right'} text-sm`}></i>
          </button>
        </div>
        {sidebarExpanded && (
          <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
            <p className="text-xs font-medium text-center truncate" style={{ color: "#64748b" }}>Listoil Admin</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          <Sidebar currentPath={pathname} expanded={sidebarExpanded} />
        </div>
      </div>

      {/* Sidebar – Mobile */}
      <div
        className={`sidebar w-64 flex flex-col flex-shrink-0 h-screen fixed top-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sidebar-logo-area flex items-center justify-between">
          <img 
            src="https://listoil.com/wp-content/uploads/2023/05/listoil.com-logo.png"
            alt="Listoil Logo"
            className="h-8 w-auto"
          />
          <button onClick={() => setMobileOpen(false)} style={{ color: "#64748b" }}>
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
        <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
          <p className="text-xs font-medium text-center truncate" style={{ color: "#64748b" }}>Listoil Admin</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar currentPath={pathname} onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Topbar */}
        <div className="top-bar sticky top-0 z-30">
          <div className="px-6 py-3.5 flex items-center justify-between">
            <button
              className="lg:hidden mr-4 p-2 rounded-lg"
              style={{ color: "#6b7280", background: "#f3f4f6" }}
              onClick={() => setMobileOpen(true)}
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <TopBar
              title={pageConfig.title}
              subtitle={pageConfig.subtitle}
              actions={pageConfig.actions}
            />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
