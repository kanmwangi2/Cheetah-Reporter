import React, { useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Settings as SettingsIcon, Moon, Sun, Monitor, ArrowLeft, Calendar } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { getDateFormatOptions, type DateFormat } from '../../lib/dateUtils'

export const Settings: React.FC = () => {
  const { setCurrentView, dateFormat, setDateFormat } = useUIStore()
  const { theme, setTheme } = useTheme()
  const [message, setMessage] = useState('')

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    setMessage('Theme preference saved!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDateFormatChange = (newFormat: DateFormat) => {
    setDateFormat(newFormat)
    setMessage('Date format preference saved!')
    setTimeout(() => setMessage(''), 3000)
  }

  const dateFormatOptions = getDateFormatOptions()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <SettingsIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Customize your application preferences</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="w-5 h-5" />
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Sun className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Light</div>
                  </button>
                  
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Moon className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Dark</div>
                  </button>
                  
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      theme === 'system'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Monitor className="w-5 h-5 mx-auto mb-2 text-gray-500" />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">System</div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Choose your preferred theme. System will follow your device settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Default Currency
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Currently set to RWF (Rwandan Franc)
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  RWF
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Date Format
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    How dates are displayed throughout the app
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <select
                    value={dateFormat}
                    onChange={(e) => handleDateFormatChange(e.target.value as DateFormat)}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dateFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.example})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                <span className="text-gray-900 dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Build:</span>
                <span className="text-gray-900 dark:text-white">2025.07.04</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Framework:</span>
                <span className="text-gray-900 dark:text-white">React + TypeScript</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
