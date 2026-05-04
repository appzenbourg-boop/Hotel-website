import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'SUPER_ADMIN' | 'HOTEL_ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'STAFF' | 'GUEST'

interface AppState {
    // Sidebar
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void

    // Property context (for super admin)
    selectedPropertyId: string
    setSelectedPropertyId: (id: string) => void

    // Notification badge
    pendingServiceCount: number
    setPendingServiceCount: (count: number) => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            sidebarOpen: false,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),

            selectedPropertyId: 'ALL',
            setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),

            pendingServiceCount: 0,
            setPendingServiceCount: (count) => set({ pendingServiceCount: count }),
        }),
        {
            name: 'zenbourg-app-state',
            partialize: (state) => ({
                selectedPropertyId: state.selectedPropertyId,
            }),
        }
    )
)
