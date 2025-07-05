export interface Project {
  id: string;
  companyName: string;
  ifrsStandard: "full" | "sme";
  currency: string;
  periods: PeriodData[];
  notes: { [noteId: string]: { title: string; content: string; order: number } };
  collaborators: { [userId: string]: "admin" | "editor" | "viewer" };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  disclosures?: DisclosureItem[];
}

export interface DisclosureItem {
  id: string;
  title: string;
  content: string;
  type: 'generated' | 'template' | 'custom';
  category: string;
  isRequired: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'review' | 'approved' | 'rejected';
  metadata: {
    lastModified: Date;
    createdBy: string;
    version: string;
    ruleId?: string;
    triggers?: string[];
  };
}

export interface PeriodData {
  id: string; // e.g., "2023-12-31"
  reportingDate: Date;
  trialBalance: TrialBalanceData; // Single source of truth for trial balance
  // Multi-period support enhancements
  periodType: 'annual' | 'interim' | 'quarterly' | 'monthly';
  fiscalYear: number;
  fiscalPeriod: number; // 1-12 for monthly, 1-4 for quarterly, 1 for annual
  isComparative: boolean; // Whether this period is used for comparison
  comparativePeriods?: string[]; // IDs of periods to compare against
  status: 'draft' | 'in-review' | 'approved' | 'locked';
  metadata?: {
    preparer?: string;
    reviewer?: string;
    approver?: string;
    preparedDate?: Date;
    reviewedDate?: Date;
    approvedDate?: Date;
    notes?: string;
  };
}

export interface TrialBalanceData {
  // Import metadata
  importDate: Date;
  importedBy: string;
  fileName?: string;
  
  // Core account data - single source of truth
  accounts: TrialBalanceAccount[];
  
  // Account-to-statement mappings
  mappings: { [accountId: string]: { statement: keyof MappedTrialBalance | 'unmapped'; lineItem: string } };
  
  // Computed statement structure (derived from accounts + mappings)
  mappedTrialBalance: MappedTrialBalance;
  
  // Status and versioning
  version: number; // Track versions for editing history
  isLocked?: boolean; // Prevent further edits when finalized
  hasAdjustments: boolean;
  lastModified: Date;
  
  // Audit trail for all changes
  editHistory: TrialBalanceEdit[];
}

export interface AuditLog {
  id: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  userId: string;
  action: string;
  details: string;
}

export interface Comment {
  id: string;
  elementId: string; // e.g., 'sfp-ppe', 'note-accounting-policies'
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  status: 'open' | 'resolved';
  isDeleted?: boolean;
  createdAt: Date | { seconds: number; nanoseconds: number }; // Firestore Timestamp
  updatedAt: Date | { seconds: number; nanoseconds: number }; // Firestore Timestamp
  threadId: string; // ID of the first comment in a thread
  parentCommentId?: string; // ID of the direct parent comment in a reply
}

export type CommentData = Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>;

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ReportTemplateData {
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date | { seconds: number; nanoseconds: number }; // Firestore Timestamp
  ifrsStandard: "full" | "sme";
  trialBalanceMappings: Record<string, string>;
  notesStructure: Record<string, unknown>;
}

export interface ReportTemplate extends ReportTemplateData {
  id: string;
}

export interface MappingSuggestion {
  csvColumn: string;
  suggestedField: keyof TrialBalanceAccount;
  confidence: 'high' | 'medium' | 'low';
}

export interface TrialBalanceAccount {
  accountId: string;
  accountName: string;
  
  // ORIGINAL IMPORTED AMOUNTS (never change after import)
  originalDebit: number;
  originalCredit: number;
  
  // ADJUSTMENT AMOUNTS (from journal entries)
  adjustmentDebit: number;
  adjustmentCredit: number;
  
  // FINAL AMOUNTS (original + adjustments - this is what statements use)
  finalDebit: number;
  finalCredit: number;
  
  // For backward compatibility (maps to original amounts)
  debit: number; // = originalDebit
  credit: number; // = originalCredit
  
  // User editable fields
  description?: string;
  isEdited?: boolean;
  lastModified?: Date;
  modifiedBy?: string;
}


export interface TrialBalanceEdit {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'import' | 'edit_account' | 'edit_mapping' | 'edit_amount' | 'add_adjustment' | 'remove_adjustment';
  accountId?: string;
  changes: {
    field: string;
    oldValue: string | number | boolean | null;
    newValue: string | number | boolean | null;
  }[];
  description?: string;
}

export interface FinancialStatementLine {
  id: string; // e.g., 'current-assets', 'ppe'
  label: string; // e.g., 'Current Assets', 'Property, Plant, and Equipment'
  accounts: TrialBalanceAccount[];
  subLines?: FinancialStatementLine[];
  total: number;
  isBold?: boolean;
}

export interface MappedTrialBalance {
  assets: { [lineItem: string]: TrialBalanceAccount[] };
  liabilities: { [lineItem: string]: TrialBalanceAccount[] };
  equity: { [lineItem: string]: TrialBalanceAccount[] };
  revenue: { [lineItem: string]: TrialBalanceAccount[] };
  expenses: { [lineItem: string]: TrialBalanceAccount[] };
}

export interface EquityComponent {
  opening: number;
  profit: number;
  oci: number;
  issued: number;
  dividends: number;
  closing: number;
}

export interface StatementOfChangesInEquityData {
  shareCapital: EquityComponent;
  retainedEarnings: EquityComponent;
  otherReserves: EquityComponent;
  total: EquityComponent;
}

export interface CashFlowItem {
  id: string;
  label: string;
  value: number;
}

export interface CashFlowSection {
  id: string;
  label: string;
  items: CashFlowItem[];
  total: number;
}

export interface StatementOfCashFlowsData {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netIncrease: number;
  cashAtBeginning: number;
  cashAtEnd: number;
}

export interface ValidationResult {
  check: string;
  message: string;
  status: "pass" | "fail" | "warning";
  isValid: boolean;
  details?: Record<string, unknown>;
}

// Multi-period analysis interfaces
export interface PeriodComparison {
  currentPeriod: PeriodData;
  comparativePeriods: PeriodData[];
  comparisonType: 'year-over-year' | 'quarter-over-quarter' | 'period-over-period';
}

export interface VarianceAnalysisResult {
  lineItem: string;
  lineItemLabel: string;
  currentValue: number;
  previousValue: number;
  variance: number;
  variancePercentage: number;
  varianceType: 'favorable' | 'unfavorable' | 'neutral';
  materialityLevel: 'immaterial' | 'material' | 'highly-material';
  explanation?: string;
  category: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
}

export interface ComparativeStatement {
  statement: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'equity_changes';
  periods: PeriodData[];
  lineItems: ComparativeLineItem[];
  totals: { [periodId: string]: number };
  variances: VarianceAnalysisResult[];
}

export interface ComparativeLineItem {
  id: string;
  label: string;
  values: { [periodId: string]: number };
  variances: { [periodPair: string]: VarianceAnalysisResult };
  level: number;
  isSubtotal: boolean;
  isBold: boolean;
}

export interface MultiPeriodAnalysis {
  periods: PeriodData[];
  statements: ComparativeStatement[];
  trends: TrendAnalysis[];
  keyMetrics: { [metric: string]: { [periodId: string]: number } };
  insights: AnalysisInsight[];
}

export interface TrendAnalysis {
  metric: string;
  periods: string[];
  values: number[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number; // 0-1 scale
  growthRate: number; // CAGR or average growth rate
  seasonality?: {
    hasSeasonality: boolean;
    seasonalFactors?: number[];
  };
}

export interface AnalysisInsight {
  type: 'trend' | 'variance' | 'ratio' | 'anomaly';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation?: string;
  relatedMetrics: string[];
  periodIds: string[];
}

// Enhanced cash flow types
export type CashFlowMethod = 'direct' | 'indirect';

export interface WorkingCapitalComponents {
  current: {
    accountsReceivable: number;
    inventory: number;
    prepaidExpenses: number;
    accountsPayable: number;
    accruedLiabilities: number;
  };
  previous: {
    accountsReceivable: number;
    inventory: number;
    prepaidExpenses: number;
    accountsPayable: number;
    accruedLiabilities: number;
  };
  changes: {
    accountsReceivable: number;
    inventory: number;
    prepaidExpenses: number;
    accountsPayable: number;
    accruedLiabilities: number;
  };
}

// Alias for backward compatibility and enhanced features
export interface CashFlowData extends StatementOfCashFlowsData {
  method?: CashFlowMethod;
  workingCapitalComponents?: WorkingCapitalComponents;
  nonCashAdjustments?: {
    depreciation: number;
    amortization: number;
    impairment: number;
    gainOnDisposal: number;
    shareBasedPayments: number;
    foreignExchangeGains: number;
    other: number;
  };
  operatingActivitiesDetail?: {
    netIncome: number;
    adjustments: number;
    workingCapitalChanges: number;
  };
}
