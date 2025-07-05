import React, { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useUIStore } from '../store/uiStore'

export const UserAvatar: React.FC = () => {
  const { user, userProfile, logout } = useAuth()
  const { setCurrentView } = useUIStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setIsOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleProfile = () => {
    setCurrentView('user-profile')
    setIsOpen(false)
  }

  const handleSettings = () => {
    setCurrentView('settings')
    setIsOpen(false)
  }

  const getInitials = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase()
    }
    if (userProfile?.displayName) {
      const names = userProfile.displayName.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase()
    }
    if (user?.displayName) {
      const names = user.displayName.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const getDisplayName = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`
    }
    if (userProfile?.displayName) return userProfile.displayName
    if (user?.displayName) return user.displayName
    return null // Return null so we can show email instead
  }

  const getEmailDisplay = () => {
    return user?.email || 'No email'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
          {getInitials()}
        </div>
        
        {/* User info - hidden on mobile */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-32">
            {getDisplayName() || getEmailDisplay()}
          </div>
          {getDisplayName() && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
              {getEmailDisplay()}
            </div>
          )}
        </div>
        
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {getInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {getDisplayName() || getEmailDisplay()}
                  </div>
                  {getDisplayName() && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {getEmailDisplay()}
                    </div>
                  )}
                  {userProfile?.company && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userProfile.company}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Menu items */}
            <button
              onClick={handleProfile}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <User className="w-4 h-4 mr-3" />
              Profile
            </button>
            
            <button
              onClick={handleSettings}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </button>
            
            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
