import React, { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Select } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { exportToExcel, exportToCSV, exportToJSON, getExportTemplates, type ExportOptions } from '../../lib/dataExporter'
import { parseQuickBooksIIF, parseXeroCSV, parseSageCSV, detectFormatType } from '../../lib/formatConverters'
import { Download, FileSpreadsheet, FileText, Code, Upload, AlertCircle, CheckCircle } from 'lucide-react'

export const DataExport: React.FC = () => {
  const { currentProject } = useProjectStore()
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv' | 'json'>('excel')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('management-summary')
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [importFormat, setImportFormat] = useState<'quickbooks' | 'xero' | 'sage' | 'csv'>('csv')
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')

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
      const options: ExportOptions = {
        format: selectedFormat,
        includeMetadata: true,
        includeFormulas: selectedFormat === 'excel',
        dateFormat: 'local',
        currencyFormat: 'symbol',
        stakeholder: template?.stakeholder || 'management',
        templateId: selectedTemplate
      }

      let data: ArrayBuffer | string
      let filename: string
      let mimeType: string

      switch (selectedFormat) {
        case 'excel':
          data = await exportToExcel(currentProject, currentProject.periods, options)
          filename = `${currentProject.companyName}_Financial_Report.xlsx`
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'csv':
          data = await exportToCSV(currentProject, currentProject.periods, options)
          filename = `${currentProject.companyName}_Financial_Report.csv`
          mimeType = 'text/csv'
          break
        case 'json':
          data = await exportToJSON(currentProject, currentProject.periods, options)
          filename = `${currentProject.companyName}_Financial_Report.json`
          mimeType = 'application/json'
          break
      }

      // Create and download file
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportStatus('success')
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus('error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportStatus('idle')

    try {
      const text = await file.text()
      let processedData
      
      switch (importFormat) {
        case 'quickbooks':
          processedData = parseQuickBooksIIF(text)
          break
        case 'xero':
          processedData = parseXeroCSV(text)
          break
        case 'sage':
          processedData = parseSageCSV(text)
          break
        case 'csv': {
          // For generic CSV, detect format first
          const formatType = detectFormatType(text)
          if (formatType === 'xero-csv') {
            processedData = parseXeroCSV(text)
          } else if (formatType === 'sage-csv') {
            processedData = parseSageCSV(text)
          } else {
            // Handle generic CSV format - this would need a generic parser
            throw new Error('Generic CSV parsing not yet implemented')
          }
          break
        }
      }
      
      // TODO: Integrate with trial balance data
      console.log('Imported and transformed data:', processedData)
      
      setImportStatus('success')
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus('error')
    } finally {
      setIsImporting(false)
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel': return <FileSpreadsheet className="h-5 w-5" />
      case 'csv': return <FileText className="h-5 w-5" />
      case 'json': return <Code className="h-5 w-5" />
      default: return <Download className="h-5 w-5" />
    }
  }

  const getStatusMessage = (status: 'idle' | 'success' | 'error', action: 'export' | 'import') => {
    switch (status) {
      case 'success':
        return (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            {action === 'export' ? 'Export completed successfully!' : 'Import completed successfully!'}
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mr-2" />
            {action === 'export' ? 'Export failed. Please try again.' : 'Import failed. Please check your file format.'}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Export & Import</h1>
          <p className="text-muted-foreground">
            Export financial statements and import data from various accounting software
          </p>
        </div>

        <Tabs defaultValue="export" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="import">Import Data</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-6">
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
                          <option value="csv">CSV (.csv)</option>
                          <option value="json">JSON (.json)</option>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium">Template</label>
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

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Template Description</label>
                      <p className="text-sm text-muted-foreground">
                        {exportTemplates.find(t => t.id === selectedTemplate)?.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex-1">
                        {getStatusMessage(exportStatus, 'export')}
                      </div>
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
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import from Accounting Software</CardTitle>
                <CardDescription>
                  Import trial balance data from various accounting software formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Source Format</label>
                  <Select 
                    value={importFormat} 
                    onValueChange={(value: 'quickbooks' | 'xero' | 'sage' | 'csv') => setImportFormat(value)}
                  >
                    <option value="csv">Generic CSV</option>
                    <option value="quickbooks">QuickBooks</option>
                    <option value="xero">Xero</option>
                    <option value="sage">Sage</option>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Upload File</label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Upload File</h3>
                    <p className="text-muted-foreground">
                      Select a file from {importFormat === 'csv' ? 'CSV format' : importFormat} to import
                    </p>
                    <input
                      type="file"
                      accept={importFormat === 'csv' ? '.csv' : '.csv,.xlsx,.xls'}
                      onChange={handleImport}
                      disabled={isImporting}
                      className="mt-4"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex-1">
                    {getStatusMessage(importStatus, 'import')}
                  </div>
                  {isImporting && (
                    <div className="ml-4">
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supported Formats</CardTitle>
                <CardDescription>
                  Information about supported import formats and requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">QuickBooks</h4>
                    <p className="text-sm text-muted-foreground">
                      Export Trial Balance report from QuickBooks as CSV or Excel
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Xero</h4>
                    <p className="text-sm text-muted-foreground">
                      Export Trial Balance from Xero accounting software
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Sage</h4>
                    <p className="text-sm text-muted-foreground">
                      Export Trial Balance report from Sage 50 or Sage 200
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Generic CSV</h4>
                    <p className="text-sm text-muted-foreground">
                      Standard CSV format with account code, name, debit, and credit columns
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
