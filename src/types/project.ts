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
}

export interface PeriodData {
  id: string; // e.g., "2023-12-31"
  reportingDate: Date;
  trialBalance: TrialBalanceData;
  mappedTrialBalance?: MappedTrialBalance;
}

export interface TrialBalanceData {
  rawData: TrialBalanceAccount[];
  mappings: { [accountId: string]: { statement: string; lineItem: string } };
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
  debit: number;
  credit: number;
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
