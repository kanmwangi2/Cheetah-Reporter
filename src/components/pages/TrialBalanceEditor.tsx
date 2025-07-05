import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Combobox, type ComboboxOption } from '../ui/combobox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { 
  Save, 
  Download, 
  History, 
  Edit3, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useAuth } from '../../contexts/useAuth';
import { TrialBalanceService } from '../../lib/trialBalanceService';
import type { TrialBalanceAccount, MappedTrialBalance, TrialBalanceData, TrialBalanceEdit } from '../../types/project';
import { formatCurrency } from '../../lib/utils';

interface TrialBalanceEditorProps {
  periodId: string;
}

// Statement options for mapping
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

export const TrialBalanceEditor: React.FC<TrialBalanceEditorProps> = ({ periodId }) => {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [applyingAdjustments, setApplyingAdjustments] = useState(false);

  const { 
    getTrialBalance, 
    updateTrialBalance, 
    currentProject 
  } = useProjectStore();
  const { user } = useAuth();

  // Load trial balance data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = getTrialBalance(periodId);
        if (data) {
          setTrialBalance(data);
        } else {
          setError('No trial balance found for this period');
        }
      } catch (err) {
        setError('Failed to load trial balance data');
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [periodId, getTrialBalance]);

  // Update account details
  const handleUpdateAccount = async (
    accountId: string, 
    updates: Partial<Pick<TrialBalanceAccount, 'accountName' | 'description' | 'debit' | 'credit'>>
  ) => {
    if (!trialBalance || !user) return;

    try {
      setSaving(true);
      const updatedTB = TrialBalanceService.editAccount(
        trialBalance,
        accountId,
        updates,
        user.uid,
        user.email || 'Unknown User'
      );

      await updateTrialBalance(periodId, updatedTB);
      setTrialBalance(updatedTB);
      setEditingAccount(null);
      setTempValues({});
    } catch (err) {
      setError('Failed to update account');
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Update account mapping
  const handleUpdateMapping = async (
    accountId: string,
    statement: keyof MappedTrialBalance | 'unmapped',
    lineItem: string
  ) => {
    if (!trialBalance || !user) return;

    try {
      setSaving(true);
      const updatedTB = TrialBalanceService.updateMapping(
        trialBalance,
        accountId,
        statement,
        lineItem,
        user.uid,
        user.email || 'Unknown User'
      );

      await updateTrialBalance(periodId, updatedTB);
      setTrialBalance(updatedTB);
    } catch (err) {
      setError('Failed to update mapping');
      console.error('Mapping error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Apply adjustments to get final amounts
  const handleApplyAdjustments = async () => {
    if (!trialBalance || !currentProject) return;

    try {
      setApplyingAdjustments(true);
      // For now, we'll just refresh the trial balance since adjustments are handled elsewhere
      // TODO: Implement specific adjustment application if needed
      const updatedTB = { ...trialBalance };
      updatedTB.hasAdjustments = true;

      await updateTrialBalance(periodId, updatedTB);
      setTrialBalance(updatedTB);
    } catch (err) {
      setError('Failed to apply adjustments');
      console.error('Adjustment error:', err);
    } finally {
      setApplyingAdjustments(false);
    }
  };

  // Export trial balance
  const handleExport = () => {
    if (!trialBalance) return;

    const csvContent = TrialBalanceService.exportData(trialBalance, 'csv');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${periodId}-v${trialBalance.version}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Validate trial balance
  const validation = trialBalance ? TrialBalanceService.validate(trialBalance) : null;

  // Get line item options for a statement
  const getLineItemOptions = (statement: string): ComboboxOption[] => {
    if (!statement || statement === 'unmapped') {
      return [{ value: 'none', label: 'Select line item...', description: 'Choose a statement first' }];
    }
    return [
      { value: 'none', label: 'Select line item...', description: 'Choose a line item' },
      ...(LINE_ITEM_OPTIONS[statement as keyof MappedTrialBalance] || [])
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!trialBalance) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No trial balance found for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Trial Balance Editor</span>
            <div className="flex items-center gap-2">
              {trialBalance.isLocked ? (
                <Lock className="h-4 w-4 text-red-500" />
              ) : (
                <Unlock className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm text-gray-500">Version {trialBalance.version}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{trialBalance.accounts.length}</div>
              <div className="text-sm text-gray-600">Total Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(trialBalance.mappings).filter((m: { statement: string; lineItem: string }) => m.statement !== 'unmapped').length}
              </div>
              <div className="text-sm text-gray-600">Mapped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {trialBalance.accounts.filter((acc: TrialBalanceAccount) => acc.isEdited).length}
              </div>
              <div className="text-sm text-gray-600">Edited</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {trialBalance.editHistory.length}
              </div>
              <div className="text-sm text-gray-600">Total Edits</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleApplyAdjustments}
              disabled={applyingAdjustments}
              className="flex items-center gap-1"
            >
              {applyingAdjustments ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Apply Adjustments
            </Button>
            
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button 
              onClick={() => setShowHistory(!showHistory)} 
              variant="outline" 
              className="flex items-center gap-1"
            >
              <History className="h-4 w-4" />
              History ({trialBalance.editHistory.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {validation && !validation.isBalanced && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Trial Balance Not Balanced</AlertTitle>
          <AlertDescription>
            <div>
              <div>Total Debits: {formatCurrency(validation.totalDebits)}</div>
              <div>Total Credits: {formatCurrency(validation.totalCredits)}</div>
              <div>Difference: {formatCurrency(validation.difference)}</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation && validation.isBalanced && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Trial Balance Balanced</AlertTitle>
          <AlertDescription>
            Total debits and credits match: {formatCurrency(validation.totalDebits)}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Original Debit</TableHead>
                <TableHead>Original Credit</TableHead>
                <TableHead>Adjustment Debit</TableHead>
                <TableHead>Adjustment Credit</TableHead>
                <TableHead>Final Debit</TableHead>
                <TableHead>Final Credit</TableHead>
                <TableHead>Statement</TableHead>
                <TableHead>Line Item</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.accounts.map((account: TrialBalanceAccount) => {
                const mapping = trialBalance.mappings[account.accountId] || { statement: 'unmapped', lineItem: 'none' };
                const isEditing = editingAccount === account.accountId;

                return (
                  <TableRow key={account.accountId} className={account.isEdited ? 'bg-yellow-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.accountName}</div>
                        <div className="text-sm text-gray-500">{account.accountId}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={tempValues[`description_${account.accountId}`] || account.description || ''}
                          onChange={(e) => setTempValues(prev => ({
                            ...prev,
                            [`description_${account.accountId}`]: e.target.value
                          }))}
                          className="w-full"
                        />
                      ) : (
                        <div className="text-sm">{account.description || '-'}</div>
                      )}
                    </TableCell>

                    <TableCell>{formatCurrency(account.originalDebit || account.debit)}</TableCell>
                    <TableCell>{formatCurrency(account.originalCredit || account.credit)}</TableCell>
                    <TableCell>{formatCurrency(account.adjustmentDebit || 0)}</TableCell>
                    <TableCell>{formatCurrency(account.adjustmentCredit || 0)}</TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={tempValues[`finalDebit_${account.accountId}`] || account.finalDebit || ''}
                          onChange={(e) => setTempValues(prev => ({
                            ...prev,
                            [`finalDebit_${account.accountId}`]: e.target.value
                          }))}
                          className="w-24"
                        />
                      ) : (
                        formatCurrency(account.finalDebit || account.debit)
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={tempValues[`finalCredit_${account.accountId}`] || account.finalCredit || ''}
                          onChange={(e) => setTempValues(prev => ({
                            ...prev,
                            [`finalCredit_${account.accountId}`]: e.target.value
                          }))}
                          className="w-24"
                        />
                      ) : (
                        formatCurrency(account.finalCredit || account.credit)
                      )}
                    </TableCell>

                    <TableCell>
                      <Combobox
                        options={STATEMENT_OPTIONS}
                        value={mapping.statement}
                        onSelect={(value) => handleUpdateMapping(
                          account.accountId,
                          value as keyof MappedTrialBalance | 'unmapped',
                          'none'
                        )}
                        placeholder="Select statement..."
                        className="w-40"
                        disabled={saving || trialBalance.isLocked}
                      />
                    </TableCell>

                    <TableCell>
                      <Combobox
                        options={getLineItemOptions(mapping.statement)}
                        value={mapping.lineItem}
                        onSelect={(value) => handleUpdateMapping(
                          account.accountId,
                          mapping.statement,
                          value
                        )}
                        placeholder="Select line item..."
                        disabled={!mapping.statement || mapping.statement === 'unmapped' || saving || trialBalance.isLocked}
                        className="w-48"
                      />
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={async () => {
                              const updates: Partial<Pick<TrialBalanceAccount, 'accountName' | 'description' | 'debit' | 'credit'>> = {};
                              
                              const description = tempValues[`description_${account.accountId}`];
                              if (description !== undefined) updates.description = description;
                              
                              const finalDebit = tempValues[`finalDebit_${account.accountId}`];
                              if (finalDebit !== undefined) updates.debit = parseFloat(finalDebit) || 0;
                              
                              const finalCredit = tempValues[`finalCredit_${account.accountId}`];
                              if (finalCredit !== undefined) updates.credit = parseFloat(finalCredit) || 0;
                              
                              await handleUpdateAccount(account.accountId, updates);
                            }}
                            disabled={saving}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingAccount(null);
                              setTempValues({});
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAccount(account.accountId);
                            setTempValues({
                              [`description_${account.accountId}`]: account.description || '',
                              [`finalDebit_${account.accountId}`]: account.finalDebit?.toString() || '',
                              [`finalCredit_${account.accountId}`]: account.finalCredit?.toString() || ''
                            });
                          }}
                          disabled={trialBalance.isLocked}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Edit History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trialBalance.editHistory.reverse().map((edit: TrialBalanceEdit) => (
                <div key={edit.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{edit.action.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-sm text-gray-600">{edit.description}</div>
                      {edit.accountId && (
                        <div className="text-xs text-gray-500">Account: {edit.accountId}</div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>{edit.userName}</div>
                      <div>{edit.timestamp.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  {edit.changes.length > 0 && (
                    <div className="mt-2 text-xs">
                      {edit.changes.map((change: { field: string; oldValue: string | number | boolean | null; newValue: string | number | boolean | null }, index: number) => (
                        <div key={index} className="text-gray-600">
                          <span className="font-medium">{change.field}:</span> {change.oldValue} → {change.newValue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
