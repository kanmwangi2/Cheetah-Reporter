import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  currentView: 'dashboard' | 'project-setup' | 'data-import' | 'report-editor' | 'preview' | 'collaboration' | 'user-profile' | 'settings'
  activeTab: 'sfp' | 'pnl' | 'soce' | 'scf' | 'notes'
  isCommentSidebarOpen: boolean
  selectedCommentElementId: string | null
  
  // Actions
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCurrentView: (view: UIState['currentView']) => void
  setActiveTab: (tab: UIState['activeTab']) => void
  toggleCommentSidebar: (elementId?: string) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'dark', // Default dark mode as per blueprint
        sidebarOpen: true,
        currentView: 'dashboard',
        activeTab: 'sfp',
        isCommentSidebarOpen: false,
        selectedCommentElementId: null,

        toggleTheme: () => set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        })),

        setTheme: (theme) => set({ theme }),

        toggleSidebar: () => set((state) => ({
          sidebarOpen: !state.sidebarOpen
        })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setCurrentView: (view) => set({ currentView: view }),
        setActiveTab: (tab) => set({ activeTab: tab }),
        toggleCommentSidebar: (elementId?: string) =>
          set((state) => ({
            isCommentSidebarOpen: elementId ? true : !state.isCommentSidebarOpen,
            selectedCommentElementId: elementId || null,
          })),
      }),
      { name: 'ui-store' }
    ),
    { name: 'ui-store' }
  )
)
