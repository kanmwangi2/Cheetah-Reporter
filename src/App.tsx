import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './components/Login'
import { Dashboard } from './components/pages/Dashboard'
import { ProjectSetup } from './components/pages/ProjectSetup'
import { DataImport } from './components/pages/DataImport'
import { ReportEditor } from './components/pages/ReportEditor'
import { Preview } from './components/pages/Preview'
import { CollaborationPanel } from './components/CollaborationPanel'
import { useUIStore } from './store/uiStore'
import { useProjectStore } from './store/projectStore'
import { useTheme } from './hooks/useTheme'
import './index.css'

function AppContent() {
  const { user, userProfile, loading } = useAuth()
  const { currentView } = useUIStore()
  const { subscribeToUserProjects } = useProjectStore()
  
  // Initialize theme system
  useTheme()

  // Subscribe to user's projects when authenticated
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserProjects(user.uid)
      return unsubscribe
    }
  }, [user, subscribeToUserProjects])

  // Show loading spinner while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading Cheetah Reporter...</p>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!user || !userProfile) {
    return <Login />
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'project-setup':
        return <ProjectSetup />
      case 'data-import':
        return <DataImport />
      case 'report-editor':
        return <ReportEditor />
      case 'preview':
        return <Preview />
      case 'collaboration':
        return <CollaborationPanel />
      case 'user-profile':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">User Profile</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <p className="mt-1 text-lg">{userProfile.displayName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <p className="mt-1 text-lg">{userProfile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                  <p className="mt-1 text-lg">{userProfile.company || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Member Since</label>
                  <p className="mt-1 text-lg">{userProfile.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">Settings</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-600 dark:text-gray-400">Application settings will be available in a future update.</p>
            </div>
          </div>
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout>
      {renderCurrentView()}
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
