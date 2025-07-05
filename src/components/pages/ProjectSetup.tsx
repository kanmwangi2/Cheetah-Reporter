import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Input } from '../ui/Input'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import { TemplateSelector } from '../features/templates/TemplateSelector'
import { useTemplateStore } from '../../store/templateStore'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

export const ProjectSetup: React.FC = () => {
  const { createProject, loading: projectLoading, error: projectError } = useProjectStore()
  const { setCurrentView } = useUIStore()
  
  const [formData, setFormData] = useState({
    companyName: '',
    reportingDate: '',
    currency: 'RWF',
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
      periodType: 'annual' as const,
      fiscalYear: new Date(formData.reportingDate).getFullYear(),
      fiscalPeriod: 1,
      isComparative: false,
      status: 'draft' as const,
      trialBalance: {
        importDate: new Date(),
        importedBy: '',
        accounts: [],
        mappings: {},
        mappedTrialBalance: {
          assets: {},
          liabilities: {},
          equity: {},
          revenue: {},
          expenses: {}
        },
        version: 1,
        hasAdjustments: false,
        lastModified: new Date(),
        editHistory: []
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
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
              <p className="text-muted-foreground">
                Set up your financial statement preparation project
              </p>
            </div>
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
                    <option value="RWF">RWF - Rwandan Franc</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound Sterling</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                    <option value="SEK">SEK - Swedish Krona</option>
                    <option value="NZD">NZD - New Zealand Dollar</option>
                    <option value="NOK">NOK - Norwegian Krone</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="UGX">UGX - Ugandan Shilling</option>
                    <option value="TZS">TZS - Tanzanian Shilling</option>
                    <option value="ETB">ETB - Ethiopian Birr</option>
                    <option value="XAF">XAF - Central African CFA Franc</option>
                    <option value="XOF">XOF - West African CFA Franc</option>
                    <option value="NGN">NGN - Nigerian Naira</option>
                    <option value="GHS">GHS - Ghanaian Cedi</option>
                    <option value="EGP">EGP - Egyptian Pound</option>
                    <option value="MAD">MAD - Moroccan Dirham</option>
                    <option value="BWP">BWP - Botswana Pula</option>
                    <option value="ZMW">ZMW - Zambian Kwacha</option>
                    <option value="MWK">MWK - Malawian Kwacha</option>
                    <option value="MZN">MZN - Mozambican Metical</option>
                    <option value="AOA">AOA - Angolan Kwanza</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="HKD">HKD - Hong Kong Dollar</option>
                    <option value="THB">THB - Thai Baht</option>
                    <option value="MYR">MYR - Malaysian Ringgit</option>
                    <option value="PHP">PHP - Philippine Peso</option>
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                    <option value="VND">VND - Vietnamese Dong</option>
                    <option value="KRW">KRW - South Korean Won</option>
                    <option value="TWD">TWD - Taiwan Dollar</option>
                    <option value="BRL">BRL - Brazilian Real</option>
                    <option value="MXN">MXN - Mexican Peso</option>
                    <option value="ARS">ARS - Argentine Peso</option>
                    <option value="CLP">CLP - Chilean Peso</option>
                    <option value="COP">COP - Colombian Peso</option>
                    <option value="PEN">PEN - Peruvian Sol</option>
                    <option value="RUB">RUB - Russian Ruble</option>
                    <option value="TRY">TRY - Turkish Lira</option>
                    <option value="PLN">PLN - Polish Zloty</option>
                    <option value="CZK">CZK - Czech Koruna</option>
                    <option value="HUF">HUF - Hungarian Forint</option>
                    <option value="DKK">DKK - Danish Krone</option>
                    <option value="ILS">ILS - Israeli New Shekel</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="QAR">QAR - Qatari Riyal</option>
                    <option value="KWD">KWD - Kuwaiti Dinar</option>
                    <option value="BHD">BHD - Bahraini Dinar</option>
                    <option value="OMR">OMR - Omani Rial</option>
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
