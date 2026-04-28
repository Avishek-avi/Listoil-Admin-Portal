"use client"

import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

interface NavItem {
  text: string
  icon: string
  path: string
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Program',
    items: [
      { text: 'Dashboard',        icon: 'fas fa-tachometer-alt', path: '/dashboard' },
      { text: 'Team Hierarchy',   icon: 'fas fa-sitemap',         path: '/team-hierarchy' },
      { text: 'Masters & Config', icon: 'fas fa-cogs',           path: '/masters-config' },
      { text: 'Members',          icon: 'fas fa-users',          path: '/members' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { text: 'QR Management',    icon: 'fas fa-qrcode',          path: '/qr-management' },
      { text: 'Process',          icon: 'fas fa-tasks',           path: '/process' },
      // { text: 'Communication',    icon: 'fas fa-broadcast-tower', path: '/communication' },
      { text: 'Tickets',          icon: 'fas fa-ticket-alt',      path: '/tickets' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { text: 'MIS Reports',  icon: 'fas fa-chart-line',      path: '/mis-analytics' },
    ],
  },
  {
    label: 'System',
    items: [
      { text: 'Role Management',  icon: 'fas fa-user-shield',     path: '/role-management' },
      { text: 'Configuration',    icon: 'fas fa-sliders-h',       path: '/configuration' },
    ],
  },
]

interface SidebarProps {
  currentPath: string
  onNavigate?: () => void
  expanded?: boolean
}

export default function Sidebar({ currentPath, onNavigate, expanded = true }: SidebarProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + '/')

  const handleClick = (path: string) => {
    router.push(path)
    onNavigate?.()
  }

  // Filter sections and items based on permissions
  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      const permissions = session?.user?.permissions || [];
      const isSuperAdmin = permissions.includes('all');
      
      const pathPermissionMap: Record<string, string> = {
        '/dashboard': 'dashboard.view',
        '/team-hierarchy': 'dashboard.view',
        '/masters-config': 'admin.only',
        '/members': 'members.view',
        '/qr-management': 'qr.view',
        '/process': 'process.manage',
        '/communication': 'communication.manage',
        '/tickets': 'tickets.manage',
        '/mis-analytics': 'mis.view',
        '/role-management': 'admin.only',
        '/configuration': 'admin.only',
      };

      const requiredPermission = pathPermissionMap[item.path];
      
      // If no permission mapped, allow by default
      if (!requiredPermission) return true;
      
      // If admin only, only allow SuperAdmins
      if (requiredPermission === 'admin.only') return isSuperAdmin;
      
      // Otherwise check for specific permission or 'all'
      return permissions.includes(requiredPermission) || isSuperAdmin;
    })
  })).filter(section => section.items.length > 0);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <nav className="flex-1 py-2">
        {filteredSections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-1' : ''}>
            {section.label && expanded && (
              <p className="sidebar-section-label">{section.label}</p>
            )}
            {section.items.map((item) => (
              <a
                key={item.path}
                onClick={() => handleClick(item.path)}
                className={`sidebar-item${isActive(item.path) ? ' active' : ''}`}
                title={!expanded ? item.text : undefined}
              >
                <i className={`${item.icon} w-4 text-center shrink-0`} style={{ fontSize: '0.8125rem' }}></i>
                {expanded && <span>{item.text}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      {session && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar shrink-0">
            {session.user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#e2e8f0' }}>
              {session.user?.name ?? 'Guest User'}
            </p>
            <p className="text-xs truncate" style={{ color: '#64748b' }}>
              {session.user?.role ?? 'User'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="shrink-0 p-1.5 rounded-lg"
            style={{ color: '#64748b' }}
          >
            <i className="fas fa-sign-out-alt text-xs"></i>
          </button>
        </div>
      )}
    </div>
  )
}
