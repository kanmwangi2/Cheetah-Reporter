import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Input } from '../ui/Input'
import { ArrowLeft } from 'lucide-react'
import { TemplateSelector } from '../features/templates/TemplateSelector'
import { useTemplateStore } from '../../store/templateStore'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

export const ProjectSetup: React.FC = () => {
  const { createProject, loading: projectLoading, error: projectError } = useProjectStore()
  const { setCurrentView } = useUIStore()
  
  const [formData, setFormData] = useState({
    companyName: '',
    reportingDate: '',
    currency: 'USD',
    ifrsStandard: 'full' as 'full' | 'sme'
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined)

  const { templates, loading: templatesLoading } = useTemplateStore()

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setFormData(prev => ({ ...prev, ifrsStandard: template.ifrsStandard }))
      }
    } else {
      setFormData(prev => ({ ...prev, ifrsStandard: 'full' }))
    }
  }, [selectedTemplateId, templates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const projectData = {
        companyName: formData.companyName,
        currency: formData.currency,
        ifrsStandard: formData.ifrsStandard,
    }

    const initialPeriodData = {
      name: `Period ending ${formData.reportingDate}`,
      reportingDate: new Date(formData.reportingDate),
      trialBalance: {
        rawData: [],
        mappings: {},
      }
    }

    const success = await createProject(projectData, initialPeriodData, selectedTemplateId)
    if (success) {
        setCurrentView('data-import')
    }
  }

  const handleBack = () => {
    setCurrentView('dashboard')
  }

  const isLoading = projectLoading || templatesLoading

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
            <p className="text-muted-foreground">
              Set up your financial statement preparation project
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Project Configuration</CardTitle>
            <CardDescription>
              Start from scratch or select a template to begin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {projectError && (
                <Alert variant="destructive">
                  <AlertTitle>Error Creating Project</AlertTitle>
                  <AlertDescription>{projectError}</AlertDescription>
                </Alert>
              )}

              <TemplateSelector 
                selectedTemplate={selectedTemplateId}
                onSelectTemplate={setSelectedTemplateId}
              />

              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium">
                  Company Name *
                </label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="reportingDate" className="text-sm font-medium">
                    Reporting Period End Date *
                  </label>
                  <Input
                    id="reportingDate"
                    type="date"
                    value={formData.reportingDate}
                    onChange={(e) => setFormData({ ...formData, reportingDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="currency" className="text-sm font-medium">
                    Currency *
                  </label>
                  <select 
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium">IFRS Standard *</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ifrsStandard"
                      value="full"
                      checked={formData.ifrsStandard === 'full'}
                      onChange={(e) => setFormData({ ...formData, ifrsStandard: e.target.value as 'full' | 'sme' })}
                      className="h-4 w-4 text-primary focus:ring-primary"
                      disabled={!!selectedTemplateId}
                    />
                    <span>Full IFRS</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ifrsStandard"
                      value="sme"
                      checked={formData.ifrsStandard === 'sme'}
                      onChange={(e) => setFormData({ ...formData, ifrsStandard: e.target.value as 'full' | 'sme' })}
                      className="h-4 w-4 text-primary focus:ring-primary"
                      disabled={!!selectedTemplateId}
                    />
                    <span>IFRS for SMEs</span>
                  </label>
                </div>
                {selectedTemplateId && <p className="text-xs text-muted-foreground">IFRS standard is determined by the selected template.</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Save & Continue'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
