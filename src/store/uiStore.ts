import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark' | 'system'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY'
  sidebarOpen: boolean
  currentView: 'dashboard' | 'project-setup' | 'data-import' | 'trial-balance-editor' | 'adjustments' | 'data-export' | 'disclosures' | 'report-editor' | 'preview' | 'collaboration' | 'user-profile' | 'settings' | 'account-classifications'
  activeTab: 'sfp' | 'pnl' | 'soce' | 'scf' | 'notes'
  isCommentSidebarOpen: boolean
  selectedCommentElementId: string | null
  
  // Actions
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setDateFormat: (format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY') => void
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
        dateFormat: 'DD/MM/YYYY', // Default DD/MM/YYYY format
        sidebarOpen: true,
        currentView: 'dashboard',
        activeTab: 'sfp',
        isCommentSidebarOpen: false,
        selectedCommentElementId: null,

        toggleTheme: () => set((state) => {
          const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
          const currentIndex = themes.indexOf(state.theme)
          const nextIndex = (currentIndex + 1) % themes.length
          return { theme: themes[nextIndex] }
        }),

        setTheme: (theme) => set({ theme }),
        
        setDateFormat: (dateFormat) => set({ dateFormat }),

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
