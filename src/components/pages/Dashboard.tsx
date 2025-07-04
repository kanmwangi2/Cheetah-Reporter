import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card'
import { Input } from '../ui/Input'
import { Plus, Search, Calendar, Building, Save } from 'lucide-react'
import { SaveAsTemplateDialog } from '../features/templates/SaveAsTemplateDialog'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import type { Project } from '../../types/project'
import { useAuthStore } from '../../store/authStore'

export const Dashboard: React.FC = () => {
  const { projects, setCurrentProject, loadUserProjects, loading, error } = useProjectStore()
  const { user } = useAuthStore()
  const { setCurrentView } = useUIStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [selectedProjectIdForTemplate, setSelectedProjectIdForTemplate] = useState<string | null>(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserProjects(user.uid)
    }
  }, [loadUserProjects, user])

  const filteredProjects = projects.filter(project =>
    project.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateNew = () => {
    setCurrentView('project-setup')
  }

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project)
    setCurrentView('report-editor')
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Statement Projects</h1>
            <p className="text-muted-foreground">
              Manage your IFRS financial statement preparation projects
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create New Financial Statement
        </Button>
      </div>

      {/* Success Alert */}
      {showSuccessAlert && (
        <Alert>
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>New report template saved successfully.</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
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
        </>)}

      <SaveAsTemplateDialog 
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        projectId={selectedProjectIdForTemplate}
        onSuccess={handleTemplateSaveSuccess}
      />
    </div>
  )
}
