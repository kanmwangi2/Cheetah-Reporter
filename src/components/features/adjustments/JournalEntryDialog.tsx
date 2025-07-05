import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { formatCurrency } from '../../../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import type { JournalEntry, JournalEntryLine } from '../../../types/adjustments';
import { JournalEntryType, JournalEntryStatus } from '../../../types/adjustments';

interface JournalEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'entryNumber' | 'totalDebit' | 'totalCredit'>) => Promise<void>;
  entry?: JournalEntry | null;
  accounts: Array<{ id: string; name: string }>; // Available accounts from trial balance
}

export const JournalEntryDialog: React.FC<JournalEntryDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  entry,
  accounts
}) => {
  const [formData, setFormData] = useState<{
    entryDate: Date;
    description: string;
    reference: string;
    entryType: JournalEntryType;
    status: JournalEntryStatus;
    notes: string;
    tags: string[];
  }>({
    entryDate: new Date(),
    description: '',
    reference: '',
    entryType: JournalEntryType.ADJUSTMENT,
    status: JournalEntryStatus.DRAFT,
    notes: '',
    tags: []
  });
  
  const [lines, setLines] = useState<JournalEntryLine[]>([
    {
      id: uuidv4(),
      accountId: '',
      accountName: '',
      description: '',
      debit: 0,
      credit: 0
    }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setSaving] = useState(false);

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        entryDate: entry.entryDate,
        description: entry.description,
        reference: entry.reference || '',
        entryType: entry.entryType,
        status: entry.status,
        notes: entry.notes || '',
        tags: entry.tags || []
      });
      setLines(entry.lines);
    } else {
      // Reset form for new entry
      setFormData({
        entryDate: new Date(),
        description: '',
        reference: '',
        entryType: JournalEntryType.ADJUSTMENT,
        status: JournalEntryStatus.DRAFT,
        notes: '',
        tags: []
      });
      setLines([
        {
          id: uuidv4(),
          accountId: '',
          accountName: '',
          description: '',
          debit: 0,
          credit: 0
        }
      ]);
    }
    setErrors({});
  }, [entry, isOpen]);

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: uuidv4(),
        accountId: '',
        accountName: '',
        description: '',
        debit: 0,
        credit: 0
      }
    ]);
  };

  const removeLine = (lineId: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(line => line.id !== lineId));
    }
  };

  const updateLine = (lineId: string, field: keyof JournalEntryLine, value: string | number) => {
    setLines(lines.map(line => {
      if (line.id === lineId) {
        const updatedLine = { ...line, [field]: value };
        
        // Update account name when account ID changes
        if (field === 'accountId') {
          const account = accounts.find(acc => acc.id === value);
          updatedLine.accountName = account?.name || '';
        }
        
        return updatedLine;
      }
      return line;
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!isBalanced) {
      newErrors.balance = 'Total debits must equal total credits';
    }

    if (lines.some(line => !line.accountId)) {
      newErrors.accounts = 'All lines must have an account selected';
    }

    if (lines.some(line => line.debit === 0 && line.credit === 0)) {
      newErrors.amounts = 'All lines must have either a debit or credit amount';
    }

    if (totalDebit === 0 && totalCredit === 0) {
      newErrors.total = 'Entry must have at least one non-zero amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        periodId: '', // Will be set by parent
        entryDate: formData.entryDate,
        description: formData.description,
        reference: formData.reference || undefined,
        preparedBy: '', // Will be set by parent
        status: formData.status,
        entryType: formData.entryType,
        lines: lines.filter(line => line.debit > 0 || line.credit > 0),
        notes: formData.notes || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined
      });
      onClose();
    } catch (error) {
      setErrors({ submit: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const balanceEntry = () => {
    const difference = totalDebit - totalCredit;
    if (Math.abs(difference) < 0.01) return;

    // Find the first line with zero amount to auto-balance
    const emptyLineIndex = lines.findIndex(line => line.debit === 0 && line.credit === 0);
    
    if (emptyLineIndex >= 0) {
      const updatedLines = [...lines];
      if (difference > 0) {
        updatedLines[emptyLineIndex].credit = difference;
      } else {
        updatedLines[emptyLineIndex].debit = Math.abs(difference);
      }
      setLines(updatedLines);
    } else {
      // Add a new balancing line
      const newLine: JournalEntryLine = {
        id: uuidv4(),
        accountId: '',
        accountName: '',
        description: 'Balancing entry',
        debit: difference < 0 ? Math.abs(difference) : 0,
        credit: difference > 0 ? difference : 0
      };
      setLines([...lines, newLine]);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {entry ? 'Edit Journal Entry' : 'Create Journal Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Entry Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Date *
              </label>
              <Input
                type="date"
                value={formData.entryDate.toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, entryDate: new Date(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Type *
              </label>
              <Select
                value={formData.entryType}
                onValueChange={(value: string) => setFormData({ ...formData, entryType: value as JournalEntryType })}
              >
                <option value={JournalEntryType.ADJUSTMENT}>Adjustment</option>
                <option value={JournalEntryType.RECLASSIFICATION}>Reclassification</option>
                <option value={JournalEntryType.ACCRUAL}>Accrual</option>
                <option value={JournalEntryType.PREPAYMENT}>Prepayment</option>
                <option value={JournalEntryType.DEPRECIATION}>Depreciation</option>
                <option value={JournalEntryType.PROVISION}>Provision</option>
                <option value={JournalEntryType.YEAR_END}>Year End</option>
                <option value={JournalEntryType.OTHER}>Other</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="External reference"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter journal entry description"
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Journal Lines */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Journal Lines</h3>
              <div className="flex items-center gap-2">
                {!isBalanced && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={balanceEntry}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Auto Balance
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Account</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Debit</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Credit</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Select
                          value={line.accountId}
                          onValueChange={(value: string) => updateLine(line.id, 'accountId', value)}
                        >
                          <option value="">Select account...</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={line.description || ''}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Line description"
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateLine(line.id, 'debit', value);
                            if (value > 0) {
                              updateLine(line.id, 'credit', 0);
                            }
                          }}
                          className="w-full text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateLine(line.id, 'credit', value);
                            if (value > 0) {
                              updateLine(line.id, 'debit', 0);
                            }
                          }}
                          className="w-full text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-medium text-gray-900">
                      Totals:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isBalanced ? (
                        <span className="text-green-600 font-medium">✓ Balanced</span>
                      ) : (
                        <span className="text-red-600 font-medium">
                          Out of balance by {formatCurrency(Math.abs(totalDebit - totalCredit))}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {(errors.balance || errors.accounts || errors.amounts || errors.total) && (
              <div className="mt-2 text-sm text-red-600">
                {errors.balance && <p>{errors.balance}</p>}
                {errors.accounts && <p>{errors.accounts}</p>}
                {errors.amounts && <p>{errors.amounts}</p>}
                {errors.total && <p>{errors.total}</p>}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or explanations"
              rows={3}
            />
          </div>

          {/* Error Messages */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || !isBalanced}
            >
              {loading ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
