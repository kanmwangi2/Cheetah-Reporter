import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Combobox, type ComboboxOption } from '../ui/combobox';
import { Plus, Edit, Trash2, Save, X, AlertCircle, Search } from 'lucide-react';
import { 
  type AccountClassification, 
  getAccountClassifications, 
  addAccountClassification, 
  removeAccountClassification,
  DEFAULT_ACCOUNT_CLASSIFICATIONS
} from '../../lib/automationEngine';
import type { MappedTrialBalance } from '../../types/project';

const STATEMENT_OPTIONS: ComboboxOption[] = [
  { value: 'assets', label: 'Assets', description: 'Current and non-current assets' },
  { value: 'liabilities', label: 'Liabilities', description: 'Current and non-current liabilities' },
  { value: 'equity', label: 'Equity', description: 'Share capital, reserves, and retained earnings' },
  { value: 'revenue', label: 'Revenue', description: 'Income from operations' },
  { value: 'expenses', label: 'Expenses', description: 'Operating and non-operating expenses' }
];

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
    { value: 'Share Premium', label: 'Share Premium' },
    { value: 'Retained Earnings', label: 'Retained Earnings' },
    { value: 'Other Reserves', label: 'Other Reserves' },
    { value: 'Non-Controlling Interests', label: 'Non-Controlling Interests' }
  ],
  revenue: [
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Other Income', label: 'Other Income' },
    { value: 'Finance Income', label: 'Finance Income' },
    { value: 'Gains on Disposal', label: 'Gains on Disposal' }
  ],
  expenses: [
    { value: 'Cost of Sales', label: 'Cost of Sales' },
    { value: 'Administrative Expenses', label: 'Administrative Expenses' },
    { value: 'Selling and Distribution Expenses', label: 'Selling and Distribution Expenses' },
    { value: 'Salaries and Wages', label: 'Salaries and Wages' },
    { value: 'Depreciation and Amortization', label: 'Depreciation and Amortization' },
    { value: 'Interest Expense', label: 'Interest Expense' },
    { value: 'Rent Expense', label: 'Rent Expense' },
    { value: 'Other Operating Expenses', label: 'Other Operating Expenses' },
    { value: 'Finance Costs', label: 'Finance Costs' },
    { value: 'Tax Expense', label: 'Tax Expense' }
  ]
};

interface ClassificationFormData {
  id: string;
  name: string;
  statement: keyof MappedTrialBalance | '';
  lineItem: string;
  keywords: string;
  accountCodes: string;
  priority: number;
  description: string;
}

export const AccountClassifications: React.FC = () => {
  const [classifications, setClassifications] = useState<AccountClassification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClassification, setEditingClassification] = useState<AccountClassification | null>(null);
  const [formData, setFormData] = useState<ClassificationFormData>({
    id: '',
    name: '',
    statement: '',
    lineItem: '',
    keywords: '',
    accountCodes: '',
    priority: 50,
    description: ''
  });
  const [error, setError] = useState('');

  // Load classifications on mount
  useEffect(() => {
    const loadedClassifications = getAccountClassifications();
    setClassifications(loadedClassifications);
  }, []);

  // Filter classifications based on search term
  const filteredClassifications = classifications.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lineItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      statement: '',
      lineItem: '',
      keywords: '',
      accountCodes: '',
      priority: 50,
      description: ''
    });
    setEditingClassification(null);
    setError('');
  };

  // Open dialog for creating new classification
  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Open dialog for editing classification
  const handleEdit = (classification: AccountClassification) => {
    setEditingClassification(classification);
    setFormData({
      id: classification.id,
      name: classification.name,
      statement: classification.statement,
      lineItem: classification.lineItem,
      keywords: classification.keywords.join(', '),
      accountCodes: classification.accountCodes?.join(', ') || '',
      priority: classification.priority,
      description: classification.description || ''
    });
    setIsDialogOpen(true);
  };

  // Delete classification
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this classification?')) {
      removeAccountClassification(id);
      setClassifications(getAccountClassifications());
    }
  };

  // Save classification
  const handleSave = () => {
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Classification name is required');
      return;
    }
    if (!formData.statement) {
      setError('Statement type is required');
      return;
    }
    if (!formData.lineItem.trim()) {
      setError('Line item is required');
      return;
    }
    if (!formData.keywords.trim()) {
      setError('At least one keyword is required');
      return;
    }

    // Create classification object
    const keywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
    const accountCodes = formData.accountCodes ? formData.accountCodes.split(',').map(c => c.trim()).filter(c => c) : undefined;
    
    // Create regex patterns from keywords
    const patterns = keywords.map(keyword => new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));

    const classification: AccountClassification = {
      id: formData.id || `custom-${Date.now()}`,
      name: formData.name.trim(),
      statement: formData.statement as keyof MappedTrialBalance,
      lineItem: formData.lineItem.trim(),
      keywords,
      patterns,
      priority: formData.priority,
      description: formData.description.trim() || undefined,
      accountCodes
    };

    try {
      addAccountClassification(classification);
      setClassifications(getAccountClassifications());
      setIsDialogOpen(false);
      resetForm();
    } catch {
      setError('Failed to save classification');
    }
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (window.confirm('This will reset all classifications to defaults. Are you sure?')) {
      // Clear current classifications and add defaults
      const currentClassifications = getAccountClassifications();
      currentClassifications.forEach(c => removeAccountClassification(c.id));
      
      DEFAULT_ACCOUNT_CLASSIFICATIONS.forEach(c => addAccountClassification(c));
      setClassifications(getAccountClassifications());
    }
  };

  // Get line item options for selected statement
  const getLineItemOptions = (): ComboboxOption[] => {
    if (!formData.statement) return [];
    return LINE_ITEM_OPTIONS[formData.statement as keyof MappedTrialBalance] || [];
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Account Classifications</h1>
          <p className="text-gray-600">Manage automatic account mapping rules and classifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Classification
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Classifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, line item, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Classifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Classifications ({filteredClassifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Statement</TableHead>
                  <TableHead>Line Item</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClassifications.map((classification) => (
                  <TableRow key={classification.id}>
                    <TableCell className="font-medium">
                      {classification.name}
                      {classification.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {classification.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{classification.statement}</span>
                    </TableCell>
                    <TableCell>{classification.lineItem}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {classification.keywords.slice(0, 3).map((keyword, index) => (
                          <span
                            key={index}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                        {classification.keywords.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{classification.keywords.length - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${
                        classification.priority >= 80 ? 'bg-green-100 text-green-800' :
                        classification.priority >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {classification.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(classification)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(classification.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredClassifications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No classifications match your search.' : 'No classifications found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClassification ? 'Edit Classification' : 'Create Classification'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Name */}
            <div>
              <Label htmlFor="name">Classification Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cash and Bank Accounts"
              />
            </div>

            {/* Statement Type */}
            <div>
              <Label>Statement Type</Label>
              <Combobox
                options={STATEMENT_OPTIONS}
                value={formData.statement}
                onSelect={(value) => setFormData({ ...formData, statement: value as keyof MappedTrialBalance, lineItem: '' })}
                placeholder="Select statement type..."
                searchPlaceholder="Search statements..."
              />
            </div>

            {/* Line Item */}
            <div>
              <Label>Line Item</Label>
              <Combobox
                options={getLineItemOptions()}
                value={formData.lineItem}
                onSelect={(value) => setFormData({ ...formData, lineItem: value })}
                placeholder="Select line item..."
                searchPlaceholder="Search line items..."
                disabled={!formData.statement}
              />
            </div>

            {/* Keywords */}
            <div>
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Textarea
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="e.g., cash, bank, checking, savings, petty cash"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                These keywords will be used to automatically match account names
              </p>
            </div>

            {/* Account Codes */}
            <div>
              <Label htmlFor="accountCodes">Account Codes (comma-separated, optional)</Label>
              <Input
                id="accountCodes"
                value={formData.accountCodes}
                onChange={(e) => setFormData({ ...formData, accountCodes: e.target.value })}
                placeholder="e.g., 1000, 1001, 1010"
              />
              <p className="text-xs text-gray-500 mt-1">
                Specific account codes that should map to this classification
              </p>
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority">Priority (0-100)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher priority classifications are preferred when multiple matches are found
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this classification..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Classification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
