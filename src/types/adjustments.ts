/**
 * Journal Entries and Adjustments Types
 * Comprehensive system for post-import trial balance adjustments
 */

import type { TrialBalanceData, TrialBalanceAccount } from './project';

export interface JournalEntry {
  id: string;
  periodId: string;
  entryNumber: string; // e.g., "JE-001", "ADJ-001"
  entryDate: Date;
  description: string;
  reference?: string; // External reference number
  preparedBy: string; // User ID
  reviewedBy?: string; // User ID
  approvedBy?: string; // User ID
  status: JournalEntryStatus;
  entryType: JournalEntryType;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  attachments?: JournalEntryAttachment[];
  reversalOf?: string; // ID of entry this reverses
  reversedBy?: string; // ID of entry that reverses this
  tags?: string[];
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
  analysisCode?: string; // For additional analysis/reporting
}

export interface JournalEntryAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export const JournalEntryStatus = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  POSTED: 'posted',
  REJECTED: 'rejected',
  REVERSED: 'reversed'
} as const;

export type JournalEntryStatus = typeof JournalEntryStatus[keyof typeof JournalEntryStatus];

export const JournalEntryType = {
  ADJUSTMENT: 'adjustment',
  RECLASSIFICATION: 'reclassification',
  ACCRUAL: 'accrual',
  PREPAYMENT: 'prepayment',
  DEPRECIATION: 'depreciation',
  PROVISION: 'provision',
  REVERSAL: 'reversal',
  YEAR_END: 'year_end',
  OTHER: 'other'
} as const;

export type JournalEntryType = typeof JournalEntryType[keyof typeof JournalEntryType];

export interface AdjustedTrialBalance extends TrialBalanceData {
  adjustments: JournalEntry[];
  adjustedBalances: TrialBalanceAccount[];
  adjustmentSummary: {
    totalEntries: number;
    totalAdjustments: number;
    lastAdjustmentDate?: Date;
    netImpactByAccount: { [accountId: string]: number };
  };
}

export interface JournalEntryTemplate {
  id: string;
  name: string;
  description: string;
  entryType: JournalEntryType;
  isRecurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'annually';
  templateLines: JournalEntryTemplateLine[];
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
}

export interface JournalEntryTemplateLine {
  id: string;
  accountId?: string;
  accountName?: string;
  description: string;
  debitFormula?: string; // Formula for calculating debit amount
  creditFormula?: string; // Formula for calculating credit amount
  isVariable: boolean; // If true, user must enter amount when using template
}

export interface AdjustmentWorkflow {
  requireReview: boolean;
  requireApproval: boolean;
  reviewers: string[]; // User IDs
  approvers: string[]; // User IDs
  autoPostOnApproval: boolean;
  maximumAmount?: number; // Entries above this amount require additional approval
}

// Filters and search criteria
export interface JournalEntryFilters {
  periodId?: string;
  status?: JournalEntryStatus[];
  entryType?: JournalEntryType[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  preparedBy?: string;
  accountIds?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  searchText?: string;
  tags?: string[];
}

// Reporting and analysis
export interface AdjustmentReport {
  periodId: string;
  generatedAt: Date;
  summary: {
    totalEntries: number;
    totalAdjustments: number;
    entriesByType: { [type: string]: number };
    entriesByStatus: { [status: string]: number };
    largestAdjustment: {
      entryId: string;
      amount: number;
      description: string;
    };
  };
  impactAnalysis: {
    accountsAffected: number;
    totalDebitAdjustments: number;
    totalCreditAdjustments: number;
    netImpact: number;
    significantAdjustments: JournalEntry[];
  };
  complianceChecks: {
    unbalancedEntries: JournalEntry[];
    unapprovedEntries: JournalEntry[];
    entriesRequiringReview: JournalEntry[];
  };
}

export interface JournalEntryValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}
