import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './components/Login'
import { Dashboard } from './components/pages/Dashboard'
import { ProjectSetup } from './components/pages/ProjectSetup'
import { DataImport } from './components/pages/DataImport'
import { DataExport } from './components/pages/DataExport'
import { ReportEditor } from './components/pages/ReportEditor'
import { Preview } from './components/pages/Preview'
import { Disclosures } from './components/pages/Disclosures'
import { UserProfile } from './components/pages/UserProfile'
import { Settings } from './components/pages/Settings'
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
      case 'data-export':
        return <DataExport />
      case 'disclosures':
        return <Disclosures />
      case 'report-editor':
        return <ReportEditor />
      case 'preview':
        return <Preview />
      case 'collaboration':
        return <CollaborationPanel />
      case 'user-profile':
        return <UserProfile />
      case 'settings':
        return <Settings />
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
