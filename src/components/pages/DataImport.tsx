import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Combobox, type ComboboxOption } from '../ui/combobox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Upload, CheckCircle, Sparkles, Settings, Zap } from 'lucide-react';
import { generateMappingSuggestions, type MappingSuggestion } from '../../lib/automationEngine';
import type { TrialBalanceAccount, MappedTrialBalance } from '../../types/project';

type Step = 'upload' | 'map-accounts' | 'complete';
type AccountMapping = { [accountId: string]: { statement: keyof MappedTrialBalance | 'unmapped'; lineItem: string | 'none' } };

interface DataImportProps {
  onComplete?: () => void;
}

// Statement options for combobox
const STATEMENT_OPTIONS: ComboboxOption[] = [
  { value: 'unmapped', label: 'Unmapped', description: 'Not assigned to any statement' },
  { value: 'assets', label: 'Assets', description: 'Current and non-current assets' },
  { value: 'liabilities', label: 'Liabilities', description: 'Current and non-current liabilities' },
  { value: 'equity', label: 'Equity', description: 'Share capital, reserves, and retained earnings' },
  { value: 'revenue', label: 'Revenue', description: 'Income from operations' },
  { value: 'expenses', label: 'Expenses', description: 'Operating and non-operating expenses' }
];

// Line item options by statement
const LINE_ITEM_OPTIONS: Record<keyof MappedTrialBalance, ComboboxOption[]> = {
  assets: [
    { value: 'Property, Plant and Equipment', label: 'Property, Plant and Equipment' },
    { value: 'Intangible Assets', label: 'Intangible Assets' },
    { value: 'Investment Property', label: 'Investment Property' },
    { value: 'Investments in Associates', label: 'Investments in Associates' },
    { value: 'Other Non-Current Assets', label: 'Other Non-Current Assets' },
    { value: 'Inventory', label: 'Inventory' },
    { value: 'Trade Receivables', label: 'Trade Receivables' },
    { value: 'Other Receivables', label: 'Other Receivables' },
    { value: 'Cash and Cash Equivalents', label: 'Cash and Cash Equivalents' },
    { value: 'Other Current Assets', label: 'Other Current Assets' }
  ],
  liabilities: [
    { value: 'Trade Payables', label: 'Trade Payables' },
    { value: 'Other Payables', label: 'Other Payables' },
    { value: 'Provisions', label: 'Provisions' },
    { value: 'Loans and Borrowings', label: 'Loans and Borrowings' },
    { value: 'Deferred Tax Liability', label: 'Deferred Tax Liability' },
    { value: 'Other Non-Current Liabilities', label: 'Other Non-Current Liabilities' },
    { value: 'Current Tax Liability', label: 'Current Tax Liability' },
    { value: 'Short-term Borrowings', label: 'Short-term Borrowings' },
    { value: 'Other Current Liabilities', label: 'Other Current Liabilities' }
  ],
  equity: [
    { value: 'Share Capital', label: 'Share Capital' },
    { value: 'Retained Earnings', label: 'Retained Earnings' },
    { value: 'Other Reserves', label: 'Other Reserves' },
    { value: 'Non-controlling Interests', label: 'Non-controlling Interests' }
  ],
  revenue: [
    { value: 'Revenue from Sales', label: 'Revenue from Sales' },
    { value: 'Other Operating Revenue', label: 'Other Operating Revenue' },
    { value: 'Finance Income', label: 'Finance Income' },
    { value: 'Other Income', label: 'Other Income' }
  ],
  expenses: [
    { value: 'Cost of Sales', label: 'Cost of Sales' },
    { value: 'Administrative Expenses', label: 'Administrative Expenses' },
    { value: 'Selling Expenses', label: 'Selling Expenses' },
    { value: 'Finance Costs', label: 'Finance Costs' },
    { value: 'Other Expenses', label: 'Other Expenses' },
    { value: 'Depreciation', label: 'Depreciation' }
  ]
};

const DataImport: React.FC<DataImportProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('upload');
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceAccount[]>([]);
  const [accountMapping, setAccountMapping] = useState<AccountMapping>({});
  const [mappingSuggestions, setMappingSuggestions] = useState<MappingSuggestion[]>([]);
  const [autoMappingApplied, setAutoMappingApplied] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { updatePeriodTrialBalance, activePeriodId } = useProjectStore();
  const { setCurrentView } = useUIStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError('Error parsing CSV file: ' + results.errors[0].message);
            setLoading(false);
            return;
          }

          const accounts: TrialBalanceAccount[] = (results.data as Record<string, unknown>[])
            .map((row: Record<string, unknown>, index: number) => {
              const account: Partial<TrialBalanceAccount> = {};
              
              // Try common column names
              const possibleIdFields = ['Account Code', 'AccountCode', 'Code', 'Account Number', 'ID'];
              const possibleNameFields = ['Account Name', 'AccountName', 'Name', 'Description'];
              const possibleDebitFields = ['Debit', 'DR', 'Debit Balance'];
              const possibleCreditFields = ['Credit', 'CR', 'Credit Balance'];

              for (const field of possibleIdFields) {
                if (row[field]) {
                  account.accountId = String(row[field]).trim();
                  break;
                }
              }

              for (const field of possibleNameFields) {
                if (row[field]) {
                  account.accountName = String(row[field]).trim();
                  break;
                }
              }

              for (const field of possibleDebitFields) {
                if (row[field] !== undefined && row[field] !== '') {
                  account.debit = parseFloat(String(row[field]).replace(/[^0-9.-]/g, '')) || 0;
                  break;
                }
              }

              for (const field of possibleCreditFields) {
                if (row[field] !== undefined && row[field] !== '') {
                  account.credit = parseFloat(String(row[field]).replace(/[^0-9.-]/g, '')) || 0;
                  break;
                }
              }

              // Fallback to account ID if name is missing
              if (!account.accountId && !account.accountName) {
                setError(`Row ${index + 1}: Missing account code and name`);
                return null;
              }

              if (!account.accountId) account.accountId = account.accountName || `ACC_${index}`;
              if (!account.accountName) account.accountName = account.accountId;
              if (!account.debit) account.debit = 0;
              if (!account.credit) account.credit = 0;

              return account as TrialBalanceAccount;
            })
            .filter(Boolean) as TrialBalanceAccount[];

          if (accounts.length === 0) {
            setError('No valid account data found in CSV file');
            setLoading(false);
            return;
          }

          setTrialBalanceData(accounts);

          // Generate smart mapping suggestions using the automation engine
          const suggestions = generateMappingSuggestions(accounts, {
            confidenceThreshold: 30, // Lower threshold to get more suggestions
            enableSmartMapping: true,
            enableBatchProcessing: true
          });

          setMappingSuggestions(suggestions);

          // Apply suggestions to initial mapping
          const initialMapping: AccountMapping = {};
          accounts.forEach(account => {
            const suggestion = suggestions.find(s => s.accountId === account.accountId);
            initialMapping[account.accountId] = suggestion 
              ? { statement: suggestion.statement, lineItem: suggestion.lineItem }
              : { statement: 'unmapped', lineItem: 'none' };
          });

          setAccountMapping(initialMapping);
          setAutoMappingApplied(true);
          setStep('map-accounts');
          setLoading(false);
        },
        error: (error: Error) => {
          setError('Failed to parse CSV file: ' + error.message);
          setLoading(false);
        }
      });
    } catch {
      setError('Failed to read file');
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  // Apply all high-confidence suggestions
  const applyAllSuggestions = () => {
    const newMapping: AccountMapping = { ...accountMapping };
    
    mappingSuggestions.forEach(suggestion => {
      if (suggestion.confidence >= 50) { // Only apply high-confidence suggestions
        newMapping[suggestion.accountId] = {
          statement: suggestion.statement,
          lineItem: suggestion.lineItem
        };
      }
    });

    setAccountMapping(newMapping);
  };

  // Navigate to classifications management
  const handleManageClassifications = () => {
    setCurrentView('account-classifications');
  };

  const completeImport = async () => {
    if (!activePeriodId) {
      setError('No active period selected');
      return;
    }

    try {
      await updatePeriodTrialBalance(activePeriodId, {
        rawData: trialBalanceData,
        mappings: accountMapping
      });
      setStep('complete');
    } catch {
      setError('Failed to save trial balance data');
    }
  };

  // Calculate totals and validation
  const totalDebits = trialBalanceData.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredits = trialBalanceData.reduce((sum, acc) => sum + acc.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const mappedAccounts = Object.values(accountMapping).filter(m => 
    m.statement && m.statement !== 'unmapped' && m.lineItem && m.lineItem !== 'none'
  ).length;

  // Get suggestion for an account
  const getSuggestionForAccount = (accountId: string): MappingSuggestion | undefined => {
    return mappingSuggestions.find(s => s.accountId === accountId);
  };

  // Get line item options for a specific statement
  const getLineItemOptions = (statement: string): ComboboxOption[] => {
    if (!statement || statement === 'unmapped') {
      return [{ value: 'none', label: 'Select line item...', description: 'Choose a statement first' }];
    }
    return [
      { value: 'none', label: 'Select line item...', description: 'Choose a line item' },
      ...(LINE_ITEM_OPTIONS[statement as keyof MappedTrialBalance] || [])
    ];
  };

  // Render Upload Step
  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Upload Trial Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-lg text-blue-600 dark:text-blue-400">Drop the CSV file here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                Drag & drop your trial balance CSV file here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports CSV files with columns for Account Code, Account Name, Debit, and Credit
              </p>
            </div>
          )}
        </div>
        
        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Processing file...
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Render Account Mapping Step
  const renderMappingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Mapping</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleManageClassifications}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Settings className="h-4 w-4" />
                Manage Classifications
              </Button>
              {mappingSuggestions.some(s => s.confidence >= 50) && (
                <Button
                  onClick={applyAllSuggestions}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Zap className="h-4 w-4" />
                  Apply All Suggestions
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {autoMappingApplied && (
            <Alert className="mb-4">
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Smart Mapping Applied</AlertTitle>
              <AlertDescription>
                Automatic suggestions have been applied based on account names and patterns. 
                Review and adjust mappings as needed.
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-4 grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{trialBalanceData.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{mappedAccounts}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mapped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{trialBalanceData.length - mappedAccounts}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unmapped</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Statement</TableHead>
                <TableHead>Line Item</TableHead>
                <TableHead>Suggestion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalanceData.map(account => {
                const mapping = accountMapping[account.accountId] || { statement: 'unmapped', lineItem: 'none' };
                const suggestion = getSuggestionForAccount(account.accountId);
                
                return (
                  <TableRow key={account.accountId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.accountName}</div>
                        <div className="text-sm text-gray-500">{account.accountId}</div>
                      </div>
                    </TableCell>
                    <TableCell>{account.debit.toLocaleString()}</TableCell>
                    <TableCell>{account.credit.toLocaleString()}</TableCell>
                    <TableCell>
                      <Combobox
                        options={STATEMENT_OPTIONS}
                        value={mapping.statement}
                        onSelect={(value) => {
                          setAccountMapping(prev => ({
                            ...prev,
                            [account.accountId]: {
                              statement: value as keyof MappedTrialBalance | 'unmapped',
                              lineItem: 'none' // Reset line item when statement changes
                            }
                          }));
                        }}
                        placeholder="Select statement..."
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Combobox
                        options={getLineItemOptions(mapping.statement)}
                        value={mapping.lineItem}
                        onSelect={(value) => {
                          setAccountMapping(prev => ({
                            ...prev,
                            [account.accountId]: {
                              ...prev[account.accountId],
                              lineItem: value
                            }
                          }));
                        }}
                        placeholder="Select line item..."
                        disabled={!mapping.statement || mapping.statement === 'unmapped'}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      {suggestion && (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="font-medium">{suggestion.confidence}%</span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">{suggestion.reason}</div>
                          {suggestion.confidence >= 50 && mapping.statement === 'unmapped' && (
                            <Button
                              onClick={() => {
                                setAccountMapping(prev => ({
                                  ...prev,
                                  [account.accountId]: {
                                    statement: suggestion.statement,
                                    lineItem: suggestion.lineItem
                                  }
                                }));
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-1"
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isBalanced ? (
                <span className="text-green-600">✓ Trial Balance is balanced</span>
              ) : (
                <span className="text-red-600">⚠ Trial Balance is not balanced</span>
              )}
            </div>
            <Button
              onClick={completeImport}
              disabled={!isBalanced || mappedAccounts === 0}
            >
              Complete Import
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Complete Step
  const renderCompleteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Import Complete</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Trial Balance Successfully Imported</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your trial balance has been imported and mapped to the IFRS structure.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{trialBalanceData.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Accounts Imported</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{mappedAccounts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Accounts Mapped</div>
          </div>
        </div>
        <Button onClick={onComplete}>
          Continue to Report Editor
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Data Import</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import your trial balance and map accounts to IFRS financial statement structure
        </p>
      </div>

      {step === 'upload' && renderUploadStep()}
      {step === 'map-accounts' && renderMappingStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  );
};

export default DataImport;
