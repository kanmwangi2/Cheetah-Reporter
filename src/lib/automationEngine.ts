import type { TrialBalanceAccount, MappedTrialBalance } from '../types/project';

export interface AccountClassification {
  id: string;
  name: string;
  statement: keyof MappedTrialBalance;
  lineItem: string;
  keywords: string[];
  patterns: RegExp[];
  priority: number; // Higher priority = more specific matching
  description?: string;
  accountCodes?: string[]; // Specific account code patterns
}

export interface MappingSuggestion {
  accountId: string;
  statement: keyof MappedTrialBalance;
  lineItem: string;
  confidence: number; // 0-100
  reason: string;
  classification?: AccountClassification;
}

export interface AutomationOptions {
  confidenceThreshold: number; // Minimum confidence to auto-apply
  enableSmartMapping: boolean;
  enableBatchProcessing: boolean;
  industryType?: string;
}

// Default account classifications with enhanced patterns
export const DEFAULT_ACCOUNT_CLASSIFICATIONS: AccountClassification[] = [
  // Cash and Cash Equivalents
  {
    id: 'cash-bank',
    name: 'Cash and Bank Accounts',
    statement: 'assets',
    lineItem: 'Cash and Cash Equivalents',
    keywords: ['cash', 'bank', 'checking', 'savings', 'petty cash', 'money market', 'cash on hand'],
    patterns: [/\bcash\b/i, /\bbank\b/i, /\bpetty\s*cash\b/i, /\bmoney\s*market\b/i, /\bchecking\b/i, /\bsavings\b/i],
    priority: 90,
    accountCodes: ['1000', '1001', '1010', '1100'],
    description: 'Cash, bank accounts, and cash equivalents'
  },
  
  // Trade Receivables
  {
    id: 'trade-receivables',
    name: 'Trade Receivables',
    statement: 'assets',
    lineItem: 'Trade Receivables',
    keywords: ['accounts receivable', 'trade receivables', 'debtors', 'customers', 'receivables'],
    patterns: [/\breceivables?\b/i, /\bdebtors?\b/i, /\baccounts?\s*receivable\b/i, /\btrade\s*receivables?\b/i, /\bcustomers?\b/i],
    priority: 85,
    accountCodes: ['1200', '1210', '1220'],
    description: 'Amounts owed by customers for goods or services'
  },

  // Other Receivables
  {
    id: 'other-receivables',
    name: 'Other Receivables',
    statement: 'assets',
    lineItem: 'Other Receivables',
    keywords: ['other receivables', 'sundry receivables', 'advances', 'deposits', 'prepaid'],
    patterns: [/\bother\s*receivables?\b/i, /\bsundry\s*receivables?\b/i, /\badvances?\b/i, /\bdeposits?\b/i, /\bprepaid\b/i],
    priority: 75,
    accountCodes: ['1250', '1300'],
    description: 'Non-trade receivables and prepaid expenses'
  },

  // Inventory
  {
    id: 'inventory',
    name: 'Inventory',
    statement: 'assets',
    lineItem: 'Inventory',
    keywords: ['inventory', 'stock', 'goods', 'raw materials', 'finished goods', 'work in progress'],
    patterns: [/\binventory\b/i, /\bstock\b/i, /\bgoods\b/i, /\braw\s*materials?\b/i, /\bfinished\s*goods\b/i, /\bwip\b/i, /\bwork\s*in\s*progress\b/i],
    priority: 90,
    accountCodes: ['1400', '1410', '1420', '1430'],
    description: 'Goods held for sale or production'
  },

  // Property, Plant and Equipment
  {
    id: 'ppe',
    name: 'Property, Plant and Equipment',
    statement: 'assets',
    lineItem: 'Property, Plant and Equipment',
    keywords: ['property', 'plant', 'equipment', 'machinery', 'buildings', 'land', 'vehicles', 'furniture', 'fixtures', 'computer equipment'],
    patterns: [/\bppe\b/i, /\bproperty\b/i, /\bplant\b/i, /\bequipment\b/i, /\bmachinery\b/i, /\bbuildings?\b/i, /\bland\b/i, /\bvehicles?\b/i, /\bfurniture\b/i, /\bfixtures?\b/i, /\bcomputer\s*equipment\b/i],
    priority: 85,
    accountCodes: ['1500', '1510', '1520', '1530', '1540'],
    description: 'Fixed assets used in business operations'
  },

  // Trade Payables
  {
    id: 'trade-payables',
    name: 'Trade Payables',
    statement: 'liabilities',
    lineItem: 'Trade Payables',
    keywords: ['accounts payable', 'trade payables', 'creditors', 'suppliers', 'payables'],
    patterns: [/\bpayables?\b/i, /\bcreditors?\b/i, /\baccounts?\s*payable\b/i, /\btrade\s*payables?\b/i, /\bsuppliers?\b/i],
    priority: 85,
    accountCodes: ['2000', '2010', '2100'],
    description: 'Amounts owed to suppliers for goods or services'
  },

  // Other Payables
  {
    id: 'other-payables',
    name: 'Other Payables',
    statement: 'liabilities',
    lineItem: 'Other Payables',
    keywords: ['other payables', 'accrued expenses', 'wages payable', 'taxes payable', 'accruals'],
    patterns: [/\bother\s*payables?\b/i, /\baccrued\s*expenses?\b/i, /\bwages?\s*payable\b/i, /\btaxes?\s*payable\b/i, /\baccruals?\b/i],
    priority: 75,
    accountCodes: ['2200', '2210', '2220'],
    description: 'Non-trade payables and accrued expenses'
  },

  // Loans and Borrowings
  {
    id: 'loans-borrowings',
    name: 'Loans and Borrowings',
    statement: 'liabilities',
    lineItem: 'Loans and Borrowings',
    keywords: ['loans', 'borrowings', 'debt', 'notes payable', 'mortgage', 'overdraft', 'credit facility'],
    patterns: [/\bloans?\b/i, /\bborrowings?\b/i, /\bdebt\b/i, /\bnotes?\s*payable\b/i, /\bmortgage\b/i, /\boverdraft\b/i, /\bcredit\s*facility\b/i],
    priority: 85,
    accountCodes: ['2300', '2400', '2500'],
    description: 'Bank loans, borrowings and debt facilities'
  },

  // Share Capital
  {
    id: 'share-capital',
    name: 'Share Capital',
    statement: 'equity',
    lineItem: 'Share Capital',
    keywords: ['share capital', 'common stock', 'ordinary shares', 'capital stock', 'issued capital'],
    patterns: [/\bshare\s*capital\b/i, /\bcommon\s*stock\b/i, /\bordinary\s*shares?\b/i, /\bcapital\s*stock\b/i, /\bissued\s*capital\b/i],
    priority: 90,
    accountCodes: ['3000', '3100'],
    description: 'Issued share capital and common stock'
  },

  // Retained Earnings
  {
    id: 'retained-earnings',
    name: 'Retained Earnings',
    statement: 'equity',
    lineItem: 'Retained Earnings',
    keywords: ['retained earnings', 'accumulated profits', 'profit and loss account', 'undistributed profits'],
    patterns: [/\bretained\s*earnings?\b/i, /\baccumulated\s*profits?\b/i, /\bprofit\s*and\s*loss\s*account\b/i, /\bundistributed\s*profits?\b/i],
    priority: 90,
    accountCodes: ['3900', '3910'],
    description: 'Accumulated profits retained in the business'
  },

  // Revenue
  {
    id: 'revenue',
    name: 'Revenue',
    statement: 'revenue',
    lineItem: 'Revenue',
    keywords: ['revenue', 'sales', 'income', 'turnover', 'fees', 'service income'],
    patterns: [/\brevenue\b/i, /\bsales?\b/i, /\bincome\b/i, /\bturnover\b/i, /\bfees?\b/i, /\bservice\s*income\b/i],
    priority: 85,
    accountCodes: ['4000', '4100', '4200'],
    description: 'Income from primary business activities'
  },

  // Cost of Sales
  {
    id: 'cost-of-sales',
    name: 'Cost of Sales',
    statement: 'expenses',
    lineItem: 'Cost of Sales',
    keywords: ['cost of sales', 'cost of goods sold', 'cogs', 'direct costs', 'cost of revenue'],
    patterns: [/\bcost\s*of\s*sales?\b/i, /\bcost\s*of\s*goods?\s*sold\b/i, /\bcogs\b/i, /\bdirect\s*costs?\b/i, /\bcost\s*of\s*revenue\b/i],
    priority: 90,
    accountCodes: ['5000', '5100'],
    description: 'Direct costs of producing goods or services sold'
  },

  // Administrative Expenses
  {
    id: 'admin-expenses',
    name: 'Administrative Expenses',
    statement: 'expenses',
    lineItem: 'Administrative Expenses',
    keywords: ['administrative expenses', 'admin expenses', 'office expenses', 'general expenses', 'overhead'],
    patterns: [/\badministrative\s*expenses?\b/i, /\badmin\s*expenses?\b/i, /\boffice\s*expenses?\b/i, /\bgeneral\s*expenses?\b/i, /\boverhead\b/i],
    priority: 80,
    accountCodes: ['6000', '6100'],
    description: 'General administrative and office expenses'
  },

  // Salaries and Wages
  {
    id: 'salaries-wages',
    name: 'Salaries and Wages',
    statement: 'expenses',
    lineItem: 'Salaries and Wages',
    keywords: ['salaries', 'wages', 'payroll', 'staff costs', 'employee benefits', 'compensation'],
    patterns: [/\bsalaries?\b/i, /\bwages?\b/i, /\bpayroll\b/i, /\bstaff\s*costs?\b/i, /\bemployee\s*benefits?\b/i, /\bcompensation\b/i],
    priority: 85,
    accountCodes: ['6200', '6210'],
    description: 'Employee salaries, wages and benefits'
  },

  // Depreciation
  {
    id: 'depreciation',
    name: 'Depreciation and Amortization',
    statement: 'expenses',
    lineItem: 'Depreciation and Amortization',
    keywords: ['depreciation', 'amortization', 'amortisation'],
    patterns: [/\bdepreciation\b/i, /\bamortization\b/i, /\bamortisation\b/i],
    priority: 90,
    accountCodes: ['6300', '6310'],
    description: 'Depreciation of fixed assets and amortization of intangibles'
  },

  // Interest Expense
  {
    id: 'interest-expense',
    name: 'Interest Expense',
    statement: 'expenses',
    lineItem: 'Interest Expense',
    keywords: ['interest expense', 'finance costs', 'interest charges', 'borrowing costs'],
    patterns: [/\binterest\s*expense\b/i, /\bfinance\s*costs?\b/i, /\binterest\s*charges?\b/i, /\bborrowing\s*costs?\b/i],
    priority: 90,
    accountCodes: ['6400', '6500'],
    description: 'Interest paid on loans and borrowings'
  }
];

class AutomationEngine {
  private classifications: AccountClassification[];
  
  constructor(customClassifications?: AccountClassification[]) {
    this.classifications = customClassifications || DEFAULT_ACCOUNT_CLASSIFICATIONS;
  }

  /**
   * Generate mapping suggestions for trial balance accounts
   */
  generateMappingSuggestions(
    accounts: TrialBalanceAccount[],
    options: AutomationOptions = {
      confidenceThreshold: 70,
      enableSmartMapping: true,
      enableBatchProcessing: true
    }
  ): MappingSuggestion[] {
    const suggestions: MappingSuggestion[] = [];

    for (const account of accounts) {
      const suggestion = this.suggestAccountMapping(account, options);
      if (suggestion && suggestion.confidence >= options.confidenceThreshold) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Suggest mapping for a single account
   */
  private suggestAccountMapping(
    account: TrialBalanceAccount,
    options: AutomationOptions
  ): MappingSuggestion | null {
    let bestMatch: {
      classification: AccountClassification;
      confidence: number;
      reason: string;
    } | null = null;

    for (const classification of this.classifications) {
      const confidence = this.calculateConfidence(account, classification);
      
      if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = {
          classification,
          confidence,
          reason: this.generateReason(account, classification, confidence)
        };
      }
    }

    if (!bestMatch || bestMatch.confidence < options.confidenceThreshold) {
      // Fallback suggestions based on account balance
      const fallback = this.generateFallbackSuggestion(account);
      if (fallback && fallback.confidence >= options.confidenceThreshold) {
        return fallback;
      }
      return null;
    }

    return {
      accountId: account.accountId,
      statement: bestMatch.classification.statement,
      lineItem: bestMatch.classification.lineItem,
      confidence: bestMatch.confidence,
      reason: bestMatch.reason,
      classification: bestMatch.classification
    };
  }

  /**
   * Calculate confidence score for account-classification match
   */
  private calculateConfidence(account: TrialBalanceAccount, classification: AccountClassification): number {
    let confidence = 0;
    const accountName = account.accountName.toLowerCase();
    const accountCode = account.accountId.toLowerCase();

    // Check for exact account code matches (highest confidence)
    if (classification.accountCodes) {
      for (const code of classification.accountCodes) {
        if (accountCode === code.toLowerCase() || accountCode.startsWith(code.toLowerCase())) {
          confidence = Math.max(confidence, 95);
        }
      }
    }

    // Check pattern matches
    for (const pattern of classification.patterns) {
      if (pattern.test(accountName) || pattern.test(accountCode)) {
        confidence = Math.max(confidence, 85 + (classification.priority / 100) * 10);
      }
    }

    // Check keyword matches
    for (const keyword of classification.keywords) {
      if (accountName.includes(keyword.toLowerCase())) {
        const exactMatch = accountName === keyword.toLowerCase();
        const wordBoundaryMatch = new RegExp(`\\b${keyword.toLowerCase()}\\b`).test(accountName);
        
        if (exactMatch) {
          confidence = Math.max(confidence, 90);
        } else if (wordBoundaryMatch) {
          confidence = Math.max(confidence, 80);
        } else {
          confidence = Math.max(confidence, 60);
        }
      }
    }

    // Apply priority boost for high-priority classifications
    if (confidence > 0 && classification.priority > 80) {
      confidence = Math.min(100, confidence + 5);
    }

    return Math.round(confidence);
  }

  /**
   * Generate fallback suggestions for unmapped accounts
   */
  private generateFallbackSuggestion(account: TrialBalanceAccount): MappingSuggestion | null {
    const { debit, credit } = account;
    const netBalance = debit - credit;
    
    // Basic heuristics based on account balance and common patterns
    if (netBalance > 0) {
      // Debit balance - likely asset or expense
      if (account.accountId.startsWith('1') || account.accountId.startsWith('0')) {
        return {
          accountId: account.accountId,
          statement: 'assets',
          lineItem: 'Other Current Assets',
          confidence: 30,
          reason: 'Debit balance and account code pattern suggest asset account'
        };
      } else if (account.accountId.startsWith('5') || account.accountId.startsWith('6') || account.accountId.startsWith('7')) {
        return {
          accountId: account.accountId,
          statement: 'expenses',
          lineItem: 'Other Operating Expenses',
          confidence: 30,
          reason: 'Debit balance and account code pattern suggest expense account'
        };
      }
    } else {
      // Credit balance - likely liability, equity, or revenue
      if (account.accountId.startsWith('2')) {
        return {
          accountId: account.accountId,
          statement: 'liabilities',
          lineItem: 'Other Current Liabilities',
          confidence: 30,
          reason: 'Credit balance and account code pattern suggest liability account'
        };
      } else if (account.accountId.startsWith('3')) {
        return {
          accountId: account.accountId,
          statement: 'equity',
          lineItem: 'Other Reserves',
          confidence: 30,
          reason: 'Credit balance and account code pattern suggest equity account'
        };
      } else if (account.accountId.startsWith('4')) {
        return {
          accountId: account.accountId,
          statement: 'revenue',
          lineItem: 'Other Income',
          confidence: 30,
          reason: 'Credit balance and account code pattern suggest revenue account'
        };
      }
    }

    return null;
  }

  /**
   * Generate human-readable reason for mapping suggestion
   */
  private generateReason(account: TrialBalanceAccount, classification: AccountClassification, confidence: number): string {
    const reasons = [];

    // Check what triggered the match
    const accountName = account.accountName.toLowerCase();
    const accountCode = account.accountId.toLowerCase();

    // Account code match
    if (classification.accountCodes) {
      for (const code of classification.accountCodes) {
        if (accountCode === code.toLowerCase() || accountCode.startsWith(code.toLowerCase())) {
          reasons.push(`account code matches ${code}`);
          break;
        }
      }
    }

    // Pattern match
    for (const pattern of classification.patterns) {
      if (pattern.test(accountName)) {
        reasons.push('name pattern match');
        break;
      }
    }

    // Keyword match
    for (const keyword of classification.keywords) {
      if (accountName.includes(keyword.toLowerCase())) {
        reasons.push(`contains keyword "${keyword}"`);
        break;
      }
    }

    if (reasons.length === 0) {
      reasons.push('general classification rules');
    }

    return `Suggested based on ${reasons.join(', ')} (${confidence}% confidence)`;
  }

  /**
   * Add or update account classification
   */
  addClassification(classification: AccountClassification): void {
    const existingIndex = this.classifications.findIndex(c => c.id === classification.id);
    if (existingIndex >= 0) {
      this.classifications[existingIndex] = classification;
    } else {
      this.classifications.push(classification);
    }
  }

  /**
   * Remove account classification
   */
  removeClassification(id: string): void {
    this.classifications = this.classifications.filter(c => c.id !== id);
  }

  /**
   * Get all classifications
   */
  getClassifications(): AccountClassification[] {
    return [...this.classifications];
  }

  /**
   * Get classifications by statement type
   */
  getClassificationsByStatement(statement: keyof MappedTrialBalance): AccountClassification[] {
    return this.classifications.filter(c => c.statement === statement);
  }

  /**
   * Search classifications by name or keywords
   */
  searchClassifications(query: string): AccountClassification[] {
    const lowerQuery = query.toLowerCase();
    return this.classifications.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.lineItem.toLowerCase().includes(lowerQuery) ||
      c.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }
}

// Export singleton instance
export const automationEngine = new AutomationEngine();

// Export functions for easy use
export const generateMappingSuggestions = (accounts: TrialBalanceAccount[], options?: AutomationOptions) => 
  automationEngine.generateMappingSuggestions(accounts, options);

export const addAccountClassification = (classification: AccountClassification) => 
  automationEngine.addClassification(classification);

export const removeAccountClassification = (id: string) => 
  automationEngine.removeClassification(id);

export const getAccountClassifications = () => 
  automationEngine.getClassifications();

export const searchAccountClassifications = (query: string) => 
  automationEngine.searchClassifications(query);
