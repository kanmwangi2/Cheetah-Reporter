import React from 'react'
import { useUIStore } from '../store/uiStore'
import { Button } from './ui/Button'
import { Menu, Home, FolderOpen, FileText, Settings, Edit3, Eye, Users, Download, BookOpen, Calculator } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { UserAvatar } from './UserAvatar'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen, toggleSidebar, currentView, setCurrentView } = useUIStore()

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'project-setup', label: 'New Project', icon: FolderOpen },
    { id: 'data-import', label: 'Data Import', icon: FileText },
    { id: 'adjustments', label: 'Adjustments', icon: Calculator },
    { id: 'data-export', label: 'Export & Import', icon: Download },
    { id: 'disclosures', label: 'Disclosures', icon: BookOpen },
    { id: 'report-editor', label: 'Report Editor', icon: Edit3 },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'collaboration', label: 'Collaboration', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex h-14 items-center px-4 max-w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CR</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Cheetah Reporter</h1>
          </div>

          <div className="ml-auto flex items-center space-x-2">
            <ThemeToggle />
            <UserAvatar />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-w-0 overflow-x-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
          md:relative md:z-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'}
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-14 md:pt-0
        `}>
          <nav className="h-full p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full justify-start text-left ${
                      isActive 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => toggleSidebar()}
          />
        )}

        {/* Main content area */}
        <main className="flex-1 min-h-screen min-w-0 pt-14 md:pt-0 bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
