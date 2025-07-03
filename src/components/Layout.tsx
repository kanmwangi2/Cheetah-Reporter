import React, { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'
import { Button } from './ui/Button'
import { Moon, Sun, Menu } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme, sidebarOpen, toggleSidebar } = useUIStore()

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CR</span>
            </div>
            <h1 className="text-lg font-semibold">Cheetah Reporter</h1>
          </div>

          <div className="ml-auto flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar - Hidden on mobile unless toggled */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0 md:z-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-white border-r pt-14 md:pt-0
        `}>
          <nav className="h-full p-4">
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start">
                Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Projects
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Templates
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Settings
              </Button>
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
        <main className="flex-1 min-h-screen pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
