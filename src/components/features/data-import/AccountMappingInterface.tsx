import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Search, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react'

interface MappedAccount {
  id: string
  accountCode: string
  accountName: string
  debitBalance: number
  creditBalance: number
  mappedTo?: string
  statementSection?: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
}

interface IFRSLineItem {
  id: string
  code: string
  name: string
  section: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
  parentId?: string
  level: number
  required: boolean
}

interface AccountMappingInterfaceProps {
  accounts: MappedAccount[]
  onMappingChange: (accountId: string, lineItemId: string) => void
  onMappingRemove: (accountId: string) => void
  ifrsStandard: 'full' | 'sme'
}

// Standard IFRS line items structure
const getIFRSStructure = (standard: 'full' | 'sme'): IFRSLineItem[] => {
  const baseStructure: IFRSLineItem[] = [
    // Assets
    { id: 'assets', code: 'A', name: 'ASSETS', section: 'assets', level: 0, required: true },
    { id: 'current-assets', code: 'A.1', name: 'Current Assets', section: 'assets', parentId: 'assets', level: 1, required: true },
    { id: 'cash', code: 'A.1.1', name: 'Cash and Cash Equivalents', section: 'assets', parentId: 'current-assets', level: 2, required: true },
    { id: 'trade-receivables', code: 'A.1.2', name: 'Trade and Other Receivables', section: 'assets', parentId: 'current-assets', level: 2, required: true },
    { id: 'inventory', code: 'A.1.3', name: 'Inventories', section: 'assets', parentId: 'current-assets', level: 2, required: false },
    { id: 'prepayments', code: 'A.1.4', name: 'Prepayments', section: 'assets', parentId: 'current-assets', level: 2, required: false },
    
    { id: 'non-current-assets', code: 'A.2', name: 'Non-current Assets', section: 'assets', parentId: 'assets', level: 1, required: true },
    { id: 'ppe', code: 'A.2.1', name: 'Property, Plant and Equipment', section: 'assets', parentId: 'non-current-assets', level: 2, required: false },
    { id: 'intangibles', code: 'A.2.2', name: 'Intangible Assets', section: 'assets', parentId: 'non-current-assets', level: 2, required: false },
    { id: 'investments', code: 'A.2.3', name: 'Investments', section: 'assets', parentId: 'non-current-assets', level: 2, required: false },
    
    // Liabilities
    { id: 'liabilities', code: 'L', name: 'LIABILITIES', section: 'liabilities', level: 0, required: true },
    { id: 'current-liabilities', code: 'L.1', name: 'Current Liabilities', section: 'liabilities', parentId: 'liabilities', level: 1, required: true },
    { id: 'trade-payables', code: 'L.1.1', name: 'Trade and Other Payables', section: 'liabilities', parentId: 'current-liabilities', level: 2, required: true },
    { id: 'short-term-borrowings', code: 'L.1.2', name: 'Short-term Borrowings', section: 'liabilities', parentId: 'current-liabilities', level: 2, required: false },
    { id: 'provisions-current', code: 'L.1.3', name: 'Current Provisions', section: 'liabilities', parentId: 'current-liabilities', level: 2, required: false },
    
    { id: 'non-current-liabilities', code: 'L.2', name: 'Non-current Liabilities', section: 'liabilities', parentId: 'liabilities', level: 1, required: true },
    { id: 'long-term-borrowings', code: 'L.2.1', name: 'Long-term Borrowings', section: 'liabilities', parentId: 'non-current-liabilities', level: 2, required: false },
    { id: 'provisions-non-current', code: 'L.2.2', name: 'Non-current Provisions', section: 'liabilities', parentId: 'non-current-liabilities', level: 2, required: false },
    
    // Equity
    { id: 'equity', code: 'E', name: 'EQUITY', section: 'equity', level: 0, required: true },
    { id: 'share-capital', code: 'E.1', name: 'Share Capital', section: 'equity', parentId: 'equity', level: 1, required: true },
    { id: 'retained-earnings', code: 'E.2', name: 'Retained Earnings', section: 'equity', parentId: 'equity', level: 1, required: true },
    { id: 'other-reserves', code: 'E.3', name: 'Other Reserves', section: 'equity', parentId: 'equity', level: 1, required: false },
    
    // Revenue
    { id: 'revenue', code: 'R', name: 'REVENUE', section: 'revenue', level: 0, required: true },
    { id: 'revenue-sales', code: 'R.1', name: 'Revenue from Sales', section: 'revenue', parentId: 'revenue', level: 1, required: true },
    { id: 'other-income', code: 'R.2', name: 'Other Income', section: 'revenue', parentId: 'revenue', level: 1, required: false },
    
    // Expenses
    { id: 'expenses', code: 'X', name: 'EXPENSES', section: 'expenses', level: 0, required: true },
    { id: 'cost-of-sales', code: 'X.1', name: 'Cost of Sales', section: 'expenses', parentId: 'expenses', level: 1, required: false },
    { id: 'admin-expenses', code: 'X.2', name: 'Administrative Expenses', section: 'expenses', parentId: 'expenses', level: 1, required: true },
    { id: 'selling-expenses', code: 'X.3', name: 'Selling and Distribution Expenses', section: 'expenses', parentId: 'expenses', level: 1, required: false },
    { id: 'finance-costs', code: 'X.4', name: 'Finance Costs', section: 'expenses', parentId: 'expenses', level: 1, required: false },
  ]

  // Filter based on IFRS standard
  if (standard === 'sme') {
    // SME standard has simplified requirements
    return baseStructure.filter(item => {
      // Remove some full IFRS specific items for SME
      const smeExclusions = ['intangibles', 'investments', 'provisions-current', 'provisions-non-current', 'other-reserves']
      return !smeExclusions.includes(item.id)
    })
  }

  return baseStructure
}

export const AccountMappingInterface: React.FC<AccountMappingInterfaceProps> = ({
  accounts,
  onMappingChange,
  onMappingRemove,
  ifrsStandard
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['assets', 'liabilities', 'equity']))
  
  const ifrsStructure = getIFRSStructure(ifrsStandard)
  
  const filteredAccounts = accounts.filter(account => 
    account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const unmappedAccounts = filteredAccounts.filter(account => !account.mappedTo)
  const mappedAccounts = filteredAccounts.filter(account => account.mappedTo)

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const renderIFRSLineItem = (item: IFRSLineItem) => {
    const isExpanded = expandedSections.has(item.id)
    const hasChildren = ifrsStructure.some(child => child.parentId === item.id)
    const mappedAccountsForItem = mappedAccounts.filter(acc => acc.mappedTo === item.id)
    const totalMapped = mappedAccountsForItem.reduce((sum, acc) => sum + (acc.debitBalance || acc.creditBalance || 0), 0)

    return (
      <div key={item.id} className="border-b border-gray-100 dark:border-gray-800">
        <div 
          className={`flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
            item.level === 0 ? 'bg-gray-100 dark:bg-gray-800 font-semibold' : ''
          }`}
          style={{ paddingLeft: `${item.level * 20 + 8}px` }}
        >
          {hasChildren && (
            <button onClick={() => toggleSection(item.id)} className="mr-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{item.code} - {item.name}</span>
                {item.required && <span className="ml-2 text-xs text-red-500">*Required</span>}
              </div>
              {mappedAccountsForItem.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {mappedAccountsForItem.length} account(s) - {totalMapped.toLocaleString()}
                </div>
              )}
            </div>
            
            {mappedAccountsForItem.length > 0 && (
              <div className="mt-1 space-y-1">
                {mappedAccountsForItem.map(account => (
                  <div key={account.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs">
                    <span>{account.accountCode} - {account.accountName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        {(account.debitBalance || account.creditBalance || 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => onMappingRemove(account.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {ifrsStructure
              .filter(child => child.parentId === item.id)
              .map(child => renderIFRSLineItem(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
      {/* Left Panel - Unmapped Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Trial Balance Accounts</span>
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
              {unmappedAccounts.length} unmapped
            </span>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[450px] overflow-auto">
            {unmappedAccounts.map(account => (
              <div
                key={account.id}
                className="p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-move"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    accountId: account.id,
                    accountData: account
                  }))
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{account.accountCode}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{account.accountName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {(account.debitBalance || account.creditBalance || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {account.debitBalance ? 'DR' : 'CR'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {unmappedAccounts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All accounts have been mapped!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - IFRS Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>IFRS Financial Statement Structure</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                {ifrsStandard === 'full' ? 'Full IFRS' : 'IFRS for SMEs'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allSections = ifrsStructure.filter(item => item.level === 0).map(item => item.id)
                  setExpandedSections(new Set(allSections))
                }}
              >
                Expand All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div 
            className="h-[450px] overflow-auto"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const data = JSON.parse(e.dataTransfer.getData('application/json'))
              const target = e.target as HTMLElement
              const lineItemElement = target.closest('[data-line-item-id]')
              if (lineItemElement) {
                const lineItemId = lineItemElement.getAttribute('data-line-item-id')
                if (lineItemId) {
                  onMappingChange(data.accountId, lineItemId)
                }
              }
            }}
          >
            {ifrsStructure
              .filter(item => item.level === 0)
              .map(section => (
                <div key={section.id} data-line-item-id={section.id}>
                  {renderIFRSLineItem(section)}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
