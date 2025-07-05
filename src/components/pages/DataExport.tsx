import React, { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Select } from '../ui/select'
import { exportToExcel, exportToCSV, exportToJSON, getExportTemplates, type ExportOptions } from '../../lib/dataExporter'
import { Download, FileSpreadsheet, FileText, Code, AlertCircle, CheckCircle } from 'lucide-react'

export const DataExport: React.FC = () => {
  const { currentProject } = useProjectStore()
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv' | 'json'>('excel')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('management-summary')
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const exportTemplates = getExportTemplates()

  const handleExport = async () => {
    if (!currentProject || !currentProject.periods.length) {
      setExportStatus('error')
      return
    }

    setIsExporting(true)
    setExportStatus('idle')

    try {
      const template = exportTemplates.find(t => t.id === selectedTemplate)
      const exportOptions: ExportOptions = {
        format: selectedFormat,
        includeMetadata: template?.defaultOptions.includeMetadata ?? true,
        includeFormulas: template?.defaultOptions.includeFormulas ?? false,
        dateFormat: template?.defaultOptions.dateFormat ?? 'local',
        currencyFormat: template?.defaultOptions.currencyFormat ?? 'symbol',
        stakeholder: template?.stakeholder ?? 'management',
        templateId: selectedTemplate
      }

      switch (selectedFormat) {
        case 'excel':
          await exportToExcel(currentProject, currentProject.periods, exportOptions)
          break
        case 'csv':
          await exportToCSV(currentProject, currentProject.periods, exportOptions)
          break
        case 'json':
          await exportToJSON(currentProject, currentProject.periods, exportOptions)
          break
      }

      setExportStatus('success')
    } catch (error) {
      console.error('Export failed:', error)
      setExportStatus('error')
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportStatus('idle'), 5000)
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel': return <FileSpreadsheet className="mr-2 h-4 w-4" />
      case 'csv': return <FileText className="mr-2 h-4 w-4" />
      case 'json': return <Code className="mr-2 h-4 w-4" />
      default: return <Download className="mr-2 h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Export</h1>
          <p className="text-muted-foreground">
            Export financial statements and trial balance data in various formats
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Financial Reports</CardTitle>
            <CardDescription>
              Export your financial statements and trial balance data in various formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!currentProject && (
              <div className="flex items-center p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-md">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                <span className="text-amber-700 dark:text-amber-300">
                  No project selected. Please select a project to export data.
                </span>
              </div>
            )}

            {currentProject && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Export Format</label>
                    <Select 
                      value={selectedFormat} 
                      onValueChange={(value: 'excel' | 'csv' | 'json') => setSelectedFormat(value)}
                    >
                      <option value="excel">Excel (.xlsx)</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Export Template</label>
                    <Select 
                      value={selectedTemplate} 
                      onValueChange={setSelectedTemplate}
                    >
                      {exportTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {exportStatus === 'success' && (
                  <div className="flex items-center p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 rounded-md">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-green-700 dark:text-green-300">
                      Export completed successfully!
                    </span>
                  </div>
                )}

                {exportStatus === 'error' && (
                  <div className="flex items-center p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-md">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                    <span className="text-red-700 dark:text-red-300">
                      Export failed. Please check your project data and try again.
                    </span>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Export Preview</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium">Project:</span> {currentProject.companyName}</p>
                    <p><span className="font-medium">Periods:</span> {currentProject.periods.length} period(s)</p>
                    <p><span className="font-medium">Format:</span> {selectedFormat.toUpperCase()}</p>
                    <p><span className="font-medium">Template:</span> {exportTemplates.find(t => t.id === selectedTemplate)?.name}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleExport} 
                    disabled={isExporting || !currentProject}
                    className="ml-4"
                  >
                    {getFormatIcon(selectedFormat)}
                    {isExporting ? 'Exporting...' : `Export ${selectedFormat.toUpperCase()}`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
