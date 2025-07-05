import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { analyzeCsvStructure, suggestColumnMappings, suggestAccountMappings, STATEMENT_LINE_ITEMS } from '@/lib/dataIntegration';
import type { AccountMappingSuggestion } from '@/lib/dataIntegration';
import type { MappingSuggestion, TrialBalanceAccount, MappedTrialBalance } from '@/types/project';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';

type Step = 'upload' | 'map-columns' | 'map-accounts' | 'review' | 'complete';
type AccountMappings = { [accountId: string]: { statement: keyof MappedTrialBalance | ''; lineItem: string | '' } };

interface DataImportProps {
  onComplete: () => void;
}

const DataImport: React.FC<DataImportProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('upload');
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<{ [key: string]: keyof TrialBalanceAccount | '' }>({});
  const [columnSuggestions, setColumnSuggestions] = useState<MappingSuggestion[]>([]);
  const [accountMappings, setAccountMappings] = useState<AccountMappings>({});
  const [accountSuggestions, setAccountSuggestions] = useState<AccountMappingSuggestion[]>([]);
  
  const { currentProject, activePeriodId, updatePeriodTrialBalance } = useProjectStore();

  const activePeriod = useMemo(() => 
    currentProject?.periods.find(p => p.id === activePeriodId),
    [currentProject, activePeriodId]
  );

  // Add error handling for missing project or period
  if (!currentProject) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">No Project Selected</h2>
        <p className="text-muted-foreground mb-4">Please select a project from the Dashboard before importing trial balance data.</p>
        <Button onClick={onComplete}>Go Back to Dashboard</Button>
      </div>
    );
  }

  if (!activePeriodId) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">No Reporting Period Selected</h2>
        <p className="text-muted-foreground mb-4">Please select a reporting period in your project before importing trial balance data.</p>
        <Button onClick={onComplete}>Go Back</Button>
      </div>
    );
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      Papa.parse(selectedFile, {
        complete: (results) => {
          const { headers: csvHeaders, data } = analyzeCsvStructure(results.data);
          setParsedData(data as string[][]);
          setHeaders(csvHeaders as string[]);
          const suggestions = suggestColumnMappings(csvHeaders as string[]);
          setColumnSuggestions(suggestions);
          
          const initialMap: { [key: string]: keyof TrialBalanceAccount | '' } = {};
          (csvHeaders as string[]).forEach((header: string) => initialMap[header] = '');
          suggestions.forEach(suggestion => {
            if (suggestion.confidence === 'high') {
              initialMap[suggestion.csvColumn] = suggestion.suggestedField;
            }
          });
          setColumnMap(initialMap);

          setStep('map-columns');
        },
        header: false, // We are analyzing the structure ourselves
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const handleColumnMapping = (csvHeader: string, field: keyof TrialBalanceAccount | '') => {
    setColumnMap(prev => ({ ...prev, [csvHeader]: field }));
  };

  const processColumnMapping = async () => {
    if (!activePeriodId) {
        alert("No active period selected.");
        return;
    }
    // Transform the parsed data into TrialBalanceAccount objects based on the mapping
    const trialBalance: TrialBalanceAccount[] = parsedData.map(row => {
        const account: Partial<TrialBalanceAccount> = {};
        Object.entries(columnMap).forEach(([csvHeader, tbField]) => {
            if (tbField) {
                const rowIndex = headers.indexOf(csvHeader);
                const rawValue = row[rowIndex];

                // Basic data cleaning and type conversion
                if (tbField === 'debit' || tbField === 'credit') {
                    const numericValue = parseFloat(String(rawValue).replace(/[^0-9.-]/g, '')) || 0;
                    (account as Record<string, unknown>)[tbField] = numericValue;
                } else if (tbField === 'accountId' || tbField === 'accountName') {
                    const stringValue = String(rawValue).trim();
                    (account as Record<string, unknown>)[tbField] = stringValue;
                }
            }
        });
        // Ensure numeric fields are numbers
        if (!account.debit) account.debit = 0;
        if (!account.credit) account.credit = 0;
        return account as TrialBalanceAccount;
    });

    await updatePeriodTrialBalance(activePeriodId, { rawData: trialBalance, mappings: {} });
    
    const suggestions = suggestAccountMappings(trialBalance, {} as MappedTrialBalance); // Pass empty existing mappings for now
    setAccountSuggestions(suggestions);

    const initialMappings: AccountMappings = {};
    trialBalance.forEach(acc => {
        const suggestion = suggestions.find(s => s.accountId === acc.accountId);
        if (suggestion) {
            initialMappings[acc.accountId] = suggestion.suggestedMapping;
        } else {
            initialMappings[acc.accountId] = { statement: '', lineItem: '' };
        }
    });
    setAccountMappings(initialMappings);
    
    setStep('map-accounts');
  };

  const handleAccountMappingChange = (accountId: string, type: 'statement' | 'lineItem', value: string) => {
    setAccountMappings(prev => ({
        ...prev,
        [accountId]: {
            ...prev[accountId],
            [type]: value,
            // Reset line item if statement changes
            ...(type === 'statement' && { lineItem: '' })
        }
    }));
  };

  const processAccountMappings = async () => {
    if (!activePeriodId || !activePeriod) {
        alert("No active period selected.");
        return;
    }

    // TODO: Add validation for mappings

    await updatePeriodTrialBalance(activePeriodId, { 
        rawData: activePeriod.trialBalance.rawData,
        mappings: accountMappings 
    });

    setStep('review');
  };

  const finalizeImport = () => {
    // Potentially do one last save or validation
    console.log("Import finalized, navigating or showing success.");
    setStep('complete');
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Upload Trial Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer ${isDragActive ? 'border-primary' : 'border-muted'}`}>
          <input {...getInputProps()} />
          {isDragActive ? <p>Drop the files here ...</p> : <p>Drag 'n' drop a CSV file here, or click to select a file</p>}
        </div>
      </CardContent>
    </Card>
  );

  const renderColumnMappingStep = () => {
    const requiredFields: (keyof TrialBalanceAccount)[] = ['accountId', 'accountName', 'debit', 'credit'];
    const mappedFields = Object.values(columnMap);
    const allRequiredFieldsMapped = requiredFields.every(field => mappedFields.includes(field));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Map CSV Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Match the columns from your CSV file to the required trial balance fields.</p>
          {columnSuggestions.length > 0 && (
            <Alert className="mb-4">
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>We've made some suggestions!</AlertTitle>
              <AlertDescription>
                Based on your column headers, we've pre-selected some fields. Please review them.
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CSV Column Header</TableHead>
                <TableHead>Map to Field</TableHead>
                <TableHead>Sample Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((header, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{header}</TableCell>
                  <TableCell>
                    <Select
                      value={columnMap[header]}
                      onValueChange={(value: keyof TrialBalanceAccount | '') => handleColumnMapping(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          <em>Ignore this column</em>
                        </SelectItem>
                        <SelectItem value="accountId">Account ID / Code</SelectItem>
                        <SelectItem value="accountName">Account Name</SelectItem>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{parsedData[0] ? parsedData[0][index] : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-6">
            <Button onClick={processColumnMapping} disabled={!allRequiredFieldsMapped}>
              Next: Map Accounts
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAccountMappingStep = () => {
    const accounts = activePeriod?.trialBalance.rawData as TrialBalanceAccount[] || [];
    const statementOptions = Object.keys(STATEMENT_LINE_ITEMS) as (keyof MappedTrialBalance)[];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Step 3: Map Accounts to Financial Statements</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="mb-4">Map each account to the appropriate financial statement line item.</p>
                {accountSuggestions.length > 0 && (
                    <Alert className="mb-4">
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>We've made some suggestions!</AlertTitle>
                        <AlertDescription>
                            We've suggested mappings for some accounts based on their names. Please review them.
                        </AlertDescription>
                    </Alert>
                )}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Account ID</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead>Statement</TableHead>
                            <TableHead>Line Item</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts.map((account) => {
                            const mapping = accountMappings[account.accountId] || { statement: '', lineItem: '' };
                            const lineItemOptions = mapping.statement ? STATEMENT_LINE_ITEMS[mapping.statement] : [];
                            return (
                                <TableRow key={account.accountId}>
                                    <TableCell>{account.accountId}</TableCell>
                                    <TableCell>{account.accountName}</TableCell>
                                    <TableCell className="text-right">{account.debit.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{account.credit.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={mapping.statement}
                                            onValueChange={(value) => handleAccountMappingChange(account.accountId, 'statement', value)}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=""><em>Unmapped</em></SelectItem>
                                                {statementOptions.map(opt => <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={mapping.lineItem}
                                            onValueChange={(value) => handleAccountMappingChange(account.accountId, 'lineItem', value)}
                                            disabled={!mapping.statement}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=""><em>Select...</em></SelectItem>
                                                {lineItemOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <div className="flex justify-end mt-6">
                    <Button onClick={processAccountMappings}>
                        Next: Review
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
  };

  const renderReviewStep = () => {
    if (!activePeriod) return null;

    const { rawData, mappings } = activePeriod.trialBalance as { rawData: TrialBalanceAccount[], mappings: AccountMappings };

    // A simple total calculator for display purposes.
    // Note: This is a simplified view. The real financial calculations are more complex.
    const calculateTotals = (statement: keyof MappedTrialBalance) => {
        const lineItems = mappedTrialBalance[statement];
        let total = 0;
        for (const lineItem in lineItems) {
            total += lineItems[lineItem].reduce((subTotal, acc) => {
                 if (['assets', 'expenses'].includes(statement)) {
                    return subTotal + acc.debit - acc.credit;
                }
                return subTotal + acc.credit - acc.debit;
            }, 0);
        }
        return total;
    };

    const mappedTrialBalance: MappedTrialBalance = {
      assets: {},
      liabilities: {},
      equity: {},
      revenue: {},
      expenses: {},
    };

    rawData.forEach(account => {
      const mapping = mappings[account.accountId];
      if (mapping && mapping.statement && mapping.lineItem) {
        const { statement, lineItem } = mapping;
        if (!mappedTrialBalance[statement][lineItem]) {
          mappedTrialBalance[statement][lineItem] = [];
        }
        mappedTrialBalance[statement][lineItem].push(account);
      }
    });

    const totalDebits = rawData.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredits = rawData.reduce((sum, acc) => sum + acc.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const mappedAccounts = Object.values(mappings).filter(m => m.statement && m.lineItem).length;
    const unmappedAccounts = rawData.length - mappedAccounts;

    return (
     <Card>
      <CardHeader>
        <CardTitle>Step 4: Review and Confirm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <p className="mb-2">Please review your imported and mapped data before finalizing.</p>
            {unmappedAccounts > 0 && (
                 <Alert>
                    <AlertTitle>You have {unmappedAccounts} unmapped accounts!</AlertTitle>
                    <AlertDescription>
                        Unmapped accounts will not be included in the financial statements. You can go back to map them or proceed if this is intentional.
                    </AlertDescription>
                </Alert>
            )}
            {!isBalanced && (
                <Alert variant="destructive" className="mt-2">
                    <AlertTitle>Trial Balance is Not Balanced!</AlertTitle>
                    <AlertDescription>
                        The total debits do not equal the total credits. Please go back and check your uploaded file or column mappings.
                    </AlertDescription>
                </Alert>
            )}
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Import Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between text-sm py-1 border-b"><span>Total Accounts Read:</span> <strong className="font-mono">{rawData.length}</strong></div>
                    <div className="flex justify-between text-sm py-1 border-b"><span>Mapped Accounts:</span> <strong className="font-mono">{mappedAccounts}</strong></div>
                    <div className="flex justify-between text-sm py-1"><span>Unmapped Accounts:</span> <strong className="font-mono">{unmappedAccounts}</strong></div>
                    <div className="flex justify-between text-sm py-2 font-bold mt-2 border-t"><span>Total Debits:</span> <strong className="font-mono">{totalDebits.toFixed(2)}</strong></div>
                    <div className="flex justify-between text-sm py-2 font-bold"><span>Total Credits:</span> <strong className="font-mono">{totalCredits.toFixed(2)}</strong></div>
                    <div className={`flex justify-between font-bold mt-2 pt-2 border-t ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        <span>Status:</span> 
                        <strong>{isBalanced ? 'Balanced' : 'Not Balanced'}</strong>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Statement Totals</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="flex justify-between text-sm py-1 border-b"><span>Assets:</span> <strong className="font-mono">{calculateTotals('assets').toFixed(2)}</strong></div>
                     <div className="flex justify-between text-sm py-1 border-b"><span>Liabilities:</span> <strong className="font-mono">{calculateTotals('liabilities').toFixed(2)}</strong></div>
                     <div className="flex justify-between text-sm py-1 border-b"><span>Equity:</span> <strong className="font-mono">{calculateTotals('equity').toFixed(2)}</strong></div>
                     <div className="flex justify-between text-sm py-1 border-b"><span>Revenue:</span> <strong className="font-mono">{calculateTotals('revenue').toFixed(2)}</strong></div>
                     <div className="flex justify-between text-sm py-1"><span>Expenses:</span> <strong className="font-mono">{calculateTotals('expenses').toFixed(2)}</strong></div>
                </CardContent>
            </Card>
        </div>

        <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep('map-accounts')}>
                Back to Account Mapping
            </Button>
            <Button onClick={finalizeImport} disabled={!isBalanced}>
                Finalize Import
            </Button>
        </div>
      </CardContent>
     </Card>
    );
  };

  const renderCompleteStep = () => (
    <Card>
        <CardHeader>
            <CardTitle>Step 5: Import Complete</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
            <div className="p-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-2xl font-bold mt-4">Success!</h2>
                <p className="text-muted-foreground mt-2">Your trial balance has been successfully imported and mapped.</p>
                <p className="mt-4">You can now view your financial statements, run validation checks, and perform analysis.</p>
            </div>
            <div className="flex justify-center mt-6">
                <Button onClick={onComplete}>
                    Go to Report
                </Button>
            </div>
        </CardContent>
    </Card>
  );


  const renderStep = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'map-columns':
        return renderColumnMappingStep();
      case 'map-accounts':
        return renderAccountMappingStep();
      case 'review':
        return renderReviewStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderUploadStep();
    }
  };

  return (
    <div className="space-y-6">
      {renderStep()}
    </div>
  );
};

export default DataImport;