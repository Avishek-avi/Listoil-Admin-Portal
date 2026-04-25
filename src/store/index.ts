import { create } from 'zustand'

export interface UserScope {
    type: 'GLOBAL' | 'STATE' | 'DISTRICT' | 'CITY' | 'INDIVIDUAL'
    value?: string | number // e.g., State ID or Code
}

interface AppState {
    // UI State
    sidebarOpen: boolean
    theme: 'light' | 'dark'

    // User Context (Derived from Auth + DB)
    currentUserRole: string | null
    currentScope: UserScope | null

    // Actions
    toggleSidebar: () => void
    setTheme: (theme: 'light' | 'dark') => void
    setUserContext: (role: string, scope: UserScope) => void
}

export const useAppStore = create<AppState>((set) => ({
    sidebarOpen: true,
    theme: 'light',
    currentUserRole: null,
    currentScope: null,

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setTheme: (theme) => set({ theme }),
    setUserContext: (role, scope) => set({ currentUserRole: role, currentScope: scope }),
}))
