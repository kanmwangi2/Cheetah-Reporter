import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useDashboardStore } from '../../store/dashboardStore'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card'
import { Input } from '../ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Plus, Search, Calendar, Building, Save, LayoutDashboard, BarChart3 } from 'lucide-react'
import { SaveAsTemplateDialog } from '../features/templates/SaveAsTemplateDialog'
import { DashboardBuilder } from '../features/dashboards/DashboardBuilder'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import type { Project } from '../../types/project'
import type { Dashboard as DashboardType } from '../../types/dashboard'
import { useAuthStore } from '../../store/authStore'

export const Dashboard: React.FC = () => {
  const { projects, setCurrentProject, loadUserProjects, loading, error } = useProjectStore()
  const { 
    dashboards, 
    currentDashboard, 
    setCurrentDashboard,
    createDashboard,
    loadUserDashboards,
    createFromPreset,
    loading: dashboardLoading 
  } = useDashboardStore()
  const { user } = useAuthStore()
  const { setCurrentView } = useUIStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('projects')
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [selectedProjectIdForTemplate, setSelectedProjectIdForTemplate] = useState<string | null>(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserProjects(user.uid)
      loadUserDashboards(user.uid)
    }
  }, [loadUserProjects, loadUserDashboards, user])

  const filteredProjects = projects.filter(project =>
    project.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDashboards = dashboards.filter(dashboard =>
    dashboard.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateNew = () => {
    setCurrentView('project-setup')
  }

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project)
    setCurrentView('report-editor')
  }

  const handleOpenDashboard = (dashboard: DashboardType) => {
    setCurrentDashboard(dashboard)
    setActiveTab('dashboard-builder')
  }

  const handleCreateNewDashboard = async () => {
    if (user) {
      try {
        const dashboardId = await createDashboard({
          name: 'New Dashboard',
          description: 'A new interactive dashboard',
          widgets: [],
          layout: {
            breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
            cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
            rowHeight: 60,
            margin: [10, 10],
            containerPadding: [10, 10],
            isDraggable: true,
            isResizable: true,
          },
          permissions: {
            owner: user.uid,
            editors: [],
            viewers: [],
            allowPublicView: false,
            allowPublicEdit: false,
          },
          isPublic: false,
          isTemplate: false,
          tags: [],
          category: 'custom',
          createdBy: user.uid,
        })
        
        // Load the new dashboard
        const newDashboard = dashboards.find(d => d.id === dashboardId)
        if (newDashboard) {
          setCurrentDashboard(newDashboard)
          setActiveTab('dashboard-builder')
        }
      } catch (error) {
        console.error('Failed to create dashboard:', error)
      }
    }
  }

  const handleCreateFromPresetClick = async (presetId: string) => {
    if (user) {
      try {
        const dashboardId = await createFromPreset(presetId, `Dashboard from ${presetId}`)
        const newDashboard = dashboards.find(d => d.id === dashboardId)
        if (newDashboard) {
          setCurrentDashboard(newDashboard)
          setActiveTab('dashboard-builder')
        }
      } catch (error) {
        console.error('Failed to create dashboard from preset:', error)
      }
    }
  }

  const handleSaveAsTemplateClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    setSelectedProjectIdForTemplate(projectId)
    setIsTemplateDialogOpen(true)
  }

  const handleTemplateSaveSuccess = () => {
    setShowSuccessAlert(true)
    setTimeout(() => setShowSuccessAlert(false), 5000)
  }

  // If we're in dashboard builder mode, show the builder
  if (activeTab === 'dashboard-builder' && currentDashboard) {
    return <DashboardBuilder />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your projects and interactive dashboards
            </p>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccessAlert && (
        <Alert>
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>New report template saved successfully.</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Financial Statement Projects
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Interactive Dashboards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCreateNew} className="sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create New Financial Statement
            </Button>
          </div>

          {/* Projects Grid */}
          {loading && <p>Loading projects...</p>}
          {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

          {!loading && !error && (
            <>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-24 w-24 text-muted-foreground/20">
                    <Building className="h-full w-full" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first financial statement project.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleCreateNew} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Project
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <Card 
                      key={project.id} 
                      className="flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="cursor-pointer" onClick={() => handleOpenProject(project)}>
                        <CardHeader>
                          <CardTitle className="text-lg">{project.companyName}</CardTitle>
                          <CardDescription className="flex items-center gap-2 pt-1">
                            <Calendar className="h-4 w-4" />
                            {project.periods && project.periods.length > 0 
                              ? new Date(project.periods[project.periods.length - 1].reportingDate).toLocaleDateString()
                              : 'No periods'
                            }
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Standard:</span>
                              <span className="font-medium">
                                {project.ifrsStandard === 'full' ? 'Full IFRS' : 'IFRS for SMEs'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Currency:</span>
                              <span className="font-medium">{project.currency}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Last modified:</span>
                              <span className="font-medium">
                                {new Date(project.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                      <CardFooter className="p-4">
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={(e) => handleSaveAsTemplateClick(e, project.id)}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save as Template
                          </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search dashboards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleCreateFromPresetClick('executive-overview')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Executive Overview
              </Button>
              <Button onClick={handleCreateNewDashboard}>
                <Plus className="mr-2 h-4 w-4" />
                Create Dashboard
              </Button>
            </div>
          </div>

          {/* Dashboards Grid */}
          {dashboardLoading && <p>Loading dashboards...</p>}

          {!dashboardLoading && (
            <>
              {filteredDashboards.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-24 w-24 text-muted-foreground/20">
                    <LayoutDashboard className="h-full w-full" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No dashboards found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first interactive dashboard.'}
                  </p>
                  {!searchTerm && (
                    <div className="flex gap-2 justify-center mt-4">
                      <Button variant="outline" onClick={() => handleCreateFromPresetClick('executive-overview')}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Executive Overview
                      </Button>
                      <Button onClick={handleCreateNewDashboard}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Dashboard
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDashboards.map((dashboard) => (
                    <Card 
                      key={dashboard.id} 
                      className="flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleOpenDashboard(dashboard)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <LayoutDashboard className="h-5 w-5" />
                          {dashboard.name}
                        </CardTitle>
                        <CardDescription>
                          {dashboard.description || 'Interactive dashboard'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium capitalize">{dashboard.category}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Widgets:</span>
                            <span className="font-medium">{dashboard.widgets.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Last modified:</span>
                            <span className="font-medium">
                              {new Date(dashboard.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {dashboard.tags.slice(0, 3).map((tag) => (
                            <span 
                              key={tag} 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {dashboard.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                              +{dashboard.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <SaveAsTemplateDialog 
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        projectId={selectedProjectIdForTemplate}
        onSuccess={handleTemplateSaveSuccess}
      />
    </div>
  )
}
