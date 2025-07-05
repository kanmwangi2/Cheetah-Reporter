import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Download, Eye, Edit, Trash2, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { JournalEntryDialog } from '../features/adjustments/JournalEntryDialog';
import { useProjectStore } from '../../store/projectStore';
import { useAuth } from '../../contexts/useAuth';
import { AdjustmentsService } from '../../lib/adjustmentsService';
import { formatCurrency } from '../../lib/utils';
import type { JournalEntry, JournalEntryFilters, JournalEntryStatus, JournalEntryType } from '../../types/adjustments';
import type { TrialBalanceAccount } from '../../types/project';
import { JournalEntryStatus as JEStatus, JournalEntryType as JEType } from '../../types/adjustments';
import { useDateFormat } from '../../lib/dateUtils';

interface AdjustmentsPageProps {
  periodId: string;
}

export const AdjustmentsPage: React.FC<AdjustmentsPageProps> = ({ periodId }) => {
  const { currentProject, activePeriodId } = useProjectStore();
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [filters, setFilters] = useState<JournalEntryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Use provided periodId or fall back to active period
  const effectivePeriodId = periodId || activePeriodId || '';
  
  // Get accounts from trial balance for the dialog
  const activePeriod = currentProject?.periods.find(p => p.id === effectivePeriodId);
  const accounts = activePeriod?.trialBalance?.mappedTrialBalance ? 
    Object.values(activePeriod.trialBalance.mappedTrialBalance).flatMap(statementAccounts =>
      Object.values(statementAccounts).flat() as TrialBalanceAccount[]
    ).map((account) => ({
      id: account.accountId,
      name: account.accountName
    })) : [];

  // Handle saving journal entries
  const handleSaveEntry = async (entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'entryNumber' | 'totalDebit' | 'totalCredit'>) => {
    if (!currentProject || !user) return;

    try {
      await AdjustmentsService.createJournalEntry(
        currentProject.id,
        effectivePeriodId,
        entryData,
        user.uid,
        user.email || ''
      );
      await loadJournalEntries();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Load journal entries
  const loadJournalEntries = useCallback(async () => {
    if (!currentProject || !effectivePeriodId) return;

    setLoading(true);
    setError(null);
    try {
      const entries = await AdjustmentsService.getJournalEntries(
        currentProject.id,
        effectivePeriodId,
        filters
      );
      setJournalEntries(entries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentProject, effectivePeriodId, filters]);

  useEffect(() => {
    loadJournalEntries();
  }, [loadJournalEntries]);

  const handleDeleteEntry = async (entryId: string) => {
    if (!currentProject || !user || !effectivePeriodId) return;

    if (!window.confirm('Are you sure you want to delete this journal entry?')) {
      return;
    }

    try {
      await AdjustmentsService.deleteJournalEntry(
        currentProject.id,
        effectivePeriodId,
        entryId,
        user.uid,
        user.email || ''
      );
      await loadJournalEntries();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const getStatusIcon = (status: JournalEntryStatus) => {
    switch (status) {
      case JEStatus.APPROVED:
      case JEStatus.POSTED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case JEStatus.REJECTED:
        return <XCircle className="h-4 w-4 text-red-600" />;
      case JEStatus.PENDING_REVIEW:
      case JEStatus.PENDING_APPROVAL:
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: JournalEntryStatus) => {
    switch (status) {
      case JEStatus.APPROVED:
      case JEStatus.POSTED:
        return 'text-green-700 bg-green-50';
      case JEStatus.REJECTED:
        return 'text-red-700 bg-red-50';
      case JEStatus.PENDING_REVIEW:
      case JEStatus.PENDING_APPROVAL:
        return 'text-yellow-700 bg-yellow-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const totalDebitAdjustments = journalEntries.reduce((sum, entry) => sum + entry.totalDebit, 0);
  const totalCreditAdjustments = journalEntries.reduce((sum, entry) => sum + entry.totalCredit, 0);
  const approvedEntries = journalEntries.filter(entry => 
    entry.status === JEStatus.APPROVED || entry.status === JEStatus.POSTED
  ).length;

  if (!currentProject) {
    return <div>No project selected</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries & Adjustments</h1>
          <p className="text-gray-600">Manage post-import trial balance adjustments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => {/* TODO: Export functionality */}}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{journalEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{approvedEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="h-6 w-6 text-red-600 font-bold">Dr</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Debits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalDebitAdjustments)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <div className="h-6 w-6 text-indigo-600 font-bold">Cr</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalCreditAdjustments)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={filters.status?.[0] || ''}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      status: value ? [value as JournalEntryStatus] : undefined 
                    }))
                  }
                >
                  <option value="">All Statuses</option>
                  <option value={JEStatus.DRAFT}>Draft</option>
                  <option value={JEStatus.PENDING_REVIEW}>Pending Review</option>
                  <option value={JEStatus.PENDING_APPROVAL}>Pending Approval</option>
                  <option value={JEStatus.APPROVED}>Approved</option>
                  <option value={JEStatus.POSTED}>Posted</option>
                  <option value={JEStatus.REJECTED}>Rejected</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Type
                </label>
                <Select
                  value={filters.entryType?.[0] || ''}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      entryType: value ? [value as JournalEntryType] : undefined 
                    }))
                  }
                >
                  <option value="">All Types</option>
                  <option value={JEType.ADJUSTMENT}>Adjustment</option>
                  <option value={JEType.RECLASSIFICATION}>Reclassification</option>
                  <option value={JEType.ACCRUAL}>Accrual</option>
                  <option value={JEType.PREPAYMENT}>Prepayment</option>
                  <option value={JEType.DEPRECIATION}>Depreciation</option>
                  <option value={JEType.PROVISION}>Provision</option>
                  <option value={JEType.YEAR_END}>Year End</option>
                  <option value={JEType.OTHER}>Other</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <Input
                  placeholder="Search entries..."
                  value={filters.searchText || ''}
                  onChange={(e) => 
                    setFilters(prev => ({ ...prev, searchText: e.target.value || undefined }))
                  }
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Journal Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : journalEntries.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries</h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first journal entry or adjustment.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Entry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                    <TableCell>{formatDate(entry.entryDate)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {entry.entryType.replace('_', ' ').toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(entry.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                          {entry.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.totalCredit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {entry.status === JEStatus.DRAFT && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {/* TODO: Edit functionality */}}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Journal Entry Dialog */}
      {showCreateDialog && (
        <JournalEntryDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSave={handleSaveEntry}
          accounts={accounts}
        />
      )}

      {selectedEntry && (
        <JournalEntryDialog
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={handleSaveEntry}
          entry={selectedEntry}
          accounts={accounts}
        />
      )}
    </div>
  );
};
