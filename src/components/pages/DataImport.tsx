import React, { useState, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import Papa from 'papaparse'
import { Upload, ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react'

interface CSVRow {
  [key: string]: string
}

export const DataImport: React.FC = () => {
  const { currentProject, activePeriodId, updatePeriodTrialBalance } = useProjectStore()
  const { setCurrentView } = useUIStore()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<{[key: string]: string}>({})
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean
    totalDebits: number
    totalCredits: number
    errors: string[]
  }>({ isValid: false, totalDebits: 0, totalCredits: 0, errors: [] })

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data as CSVRow[])
        setCsvHeaders(results.meta.fields || [])
        setCurrentStep(2)
      },
      error: (error) => {
        console.error('CSV parsing error:', error)
      }
    })
  }, [])

  const handleColumnMapping = (csvColumn: string, targetColumn: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [targetColumn]: csvColumn
    }))
  }

  const validateTrialBalance = () => {
    if (!columnMappings.debit || !columnMappings.credit) {
      setValidationResults({
        isValid: false,
        totalDebits: 0,
        totalCredits: 0,
        errors: ['Please map both Debit and Credit columns']
      })
      return
    }

    let totalDebits = 0
    let totalCredits = 0
    const errors: string[] = []

    csvData.forEach((row, index) => {
      const debitValue = parseFloat(row[columnMappings.debit] || '0')
      const creditValue = parseFloat(row[columnMappings.credit] || '0')

      if (isNaN(debitValue) && row[columnMappings.debit]) {
        errors.push(`Row ${index + 1}: Invalid debit value`)
      }
      if (isNaN(creditValue) && row[columnMappings.credit]) {
        errors.push(`Row ${index + 1}: Invalid credit value`)
      }

      totalDebits += isNaN(debitValue) ? 0 : debitValue
      totalCredits += isNaN(creditValue) ? 0 : creditValue
    })

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01
    if (!isBalanced) {
      errors.push(`Trial balance does not balance: Debits (${totalDebits.toFixed(2)}) ≠ Credits (${totalCredits.toFixed(2)})`)
    }

    setValidationResults({
      isValid: isBalanced && errors.length === 0,
      totalDebits,
      totalCredits,
      errors
    })

    if (isBalanced && errors.length === 0) {
      setCurrentStep(3)
    }
  }

  const handleNext = async () => {
    if (currentStep === 2) {
      validateTrialBalance()
    } else if (currentStep === 3) {
      // Save trial balance data and proceed to report editor
      if (currentProject && activePeriodId) {
        // Process and save trial balance entries
        const trialBalanceEntries = csvData.map(row => ({
          accountId: row[columnMappings.accountCode] || '',
          accountName: row[columnMappings.accountName] || '',
          debit: parseFloat(row[columnMappings.debit] || '0') || 0,
          credit: parseFloat(row[columnMappings.credit] || '0') || 0,
        }))

        // Update the active period's trial balance
        await updatePeriodTrialBalance(activePeriodId, {
          rawData: trialBalanceEntries,
          mappings: {}
        })
        
        setCurrentView('report-editor')
      }
    }
  }

  const handleBack = () => {
    if (currentStep === 1) {
      setCurrentView('project-setup')
    } else {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Upload Trial Balance</CardTitle>
        <CardDescription>
          Upload your trial balance in CSV format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Upload CSV File</h3>
          <p className="text-muted-foreground">
            Select your trial balance CSV file to continue
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="mt-4"
          />
        </div>
      </CardContent>
    </Card>
  )

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Map Columns</CardTitle>
        <CardDescription>
          Map your CSV columns to the required trial balance fields
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            { key: 'accountCode', label: 'Account Code', required: true },
            { key: 'accountName', label: 'Account Name', required: true },
            { key: 'debit', label: 'Debit', required: true },
            { key: 'credit', label: 'Credit', required: true }
          ].map(field => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium">
                {field.label} {field.required && '*'}
              </label>
              <select
                value={columnMappings[field.key] || ''}
                onChange={(e) => handleColumnMapping(e.target.value, field.key)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required={field.required}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {validationResults.errors.length > 0 && (
          <div className="mt-4 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Validation Errors</span>
            </div>
            <ul className="mt-2 text-sm text-destructive space-y-1">
              {validationResults.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Validation Complete</CardTitle>
        <CardDescription>
          Your trial balance has been validated successfully
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">Trial balance is balanced!</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Debits</p>
              <p className="text-lg font-semibold">${validationResults.totalDebits.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-lg font-semibold">${validationResults.totalCredits.toLocaleString()}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {csvData.length} accounts imported successfully. You can now proceed to the report editor.
          </p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Import Trial Balance</h1>
            <p className="text-muted-foreground">
              {currentProject?.companyName} - Step {currentStep} of 3
            </p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map(step => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {currentStep > step ? <Check className="h-4 w-4" /> : step}
              </div>
              {step < 3 && <div className={`h-px w-16 ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Navigation */}
        {currentStep > 1 && (
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={currentStep === 2 && !validationResults.isValid}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Continue to Report Editor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
