import type { TrialBalanceAccount, MappedTrialBalance, MappingSuggestion } from '../types/project';

/**
 * Represents a confidence score for an automated suggestion.
 */
export type ConfidenceScore = 'high' | 'medium' | 'low';

/**
 * Represents a suggestion for mapping an account to a financial statement line.
 */
export interface AccountMappingSuggestion {
  accountId: string;
  accountName: string;
  suggestedMapping: {
    statement: keyof MappedTrialBalance;
    lineItem: string; // e.g., 'Revenue', 'Property, Plant and Equipment'
  };
  confidence: ConfidenceScore;
}

export const MAPPING_RULES: { statement: keyof MappedTrialBalance; lineItem: string; patterns: RegExp[] }[] = [
    // Revenue (was income)
    { statement: 'revenue', lineItem: 'Revenue', patterns: [/revenue/i, /sales/i, /turnover/i, /income/i] },
    { statement: 'revenue', lineItem: 'Other Income', patterns: [/other income/i, /sundry income/i] },
    // Expenses
    { statement: 'expenses', lineItem: 'Cost of Sales', patterns: [/cost of sales/i, /cogs/i] },
    { statement: 'expenses', lineItem: 'Administrative Expenses', patterns: [/admin/i, /administrative/i, /general expense/i] },
    { statement: 'expenses', lineItem: 'Salaries and Wages', patterns: [/salaries/i, /wages/i, /payroll/i] },
    { statement: 'expenses', lineItem: 'Depreciation and Amortization', patterns: [/depreciation/i, /amortization/i] },
    { statement: 'expenses', lineItem: 'Interest Expense', patterns: [/interest expense/i, /finance cost/i] },
    { statement: 'expenses', lineItem: 'Rent Expense', patterns: [/rent/i] },
    // Assets
    { statement: 'assets', lineItem: 'Property, Plant and Equipment', patterns: [/ppe/i, /plant/i, /equipment/i, /property/i, /fixed assets/i] },
    { statement: 'assets', lineItem: 'Intangible Assets', patterns: [/intangible/i, /goodwill/i] },
    { statement: 'assets', lineItem: 'Inventory', patterns: [/inventory/i, /stock/i] },
    { statement: 'assets', lineItem: 'Trade Receivables', patterns: [/receivables/i, /debtors/i, /accounts receivable/i] },
    { statement: 'assets', lineItem: 'Cash and Cash Equivalents', patterns: [/cash/i, /bank/i] },
    // Liabilities
    { statement: 'liabilities', lineItem: 'Trade Payables', patterns: [/payables/i, /creditors/i, /accounts payable/i] },
    { statement: 'liabilities', lineItem: 'Loans and Borrowings', patterns: [/loan/i, /borrowing/i, /debt/i] },
    { statement: 'liabilities', lineItem: 'Current Tax Liability', patterns: [/tax payable/i, /corporation tax/i] },
    // Equity
    { statement: 'equity', lineItem: 'Share Capital', patterns: [/share capital/i, /common stock/i] },
    { statement: 'equity', lineItem: 'Retained Earnings', patterns: [/retained earnings/i, /accumulated profit/i] },
];

export const STATEMENT_LINE_ITEMS = MAPPING_RULES.reduce((acc, rule) => {
    if (!acc[rule.statement]) {
        acc[rule.statement] = [];
    }
    if (!acc[rule.statement].includes(rule.lineItem)) {
        acc[rule.statement].push(rule.lineItem);
    }
    return acc;
}, {} as Record<keyof MappedTrialBalance, string[]>);

/**
 * Analyzes the structure of a parsed CSV file to identify potential header rows
 * and data types for each column.
 * @param parsedData - Data from PapaParse.
 * @returns An analysis of the CSV structure.
 */
export const analyzeCsvStructure = (parsedData: unknown[]) => {
  // Placeholder for logic to detect headers, data types, etc.
  // For now, it assumes the first row is the header.
  if (parsedData.length === 0) {
    return { headers: [], data: [] };
  }
  const headers = parsedData[0];
  const data = parsedData.slice(1);
  
  console.log("Analyzed CSV Structure:", { headers, data });
  return { headers, data };
};

/**
 * Uses pattern recognition and fuzzy matching to suggest mappings
 * from CSV columns to standard trial balance fields.
 * @param headers - The headers from the CSV file.
 * @returns An array of mapping suggestions.
 */
export const suggestColumnMappings = (headers: string[]): MappingSuggestion[] => {
  const suggestions: MappingSuggestion[] = [];
  const fieldPatterns: { field: keyof TrialBalanceAccount; patterns: RegExp[] }[] = [
    { field: 'accountId', patterns: [/code/i, /acc_no/i, /number/i, /^id$/i] },
    { field: 'accountName', patterns: [/name/i, /desc/i, /description/i, /account/i, /ledger/i] },
    { field: 'debit', patterns: [/debit/i, /dr/i, /\bdr\b/i] },
    { field: 'credit', patterns: [/credit/i, /cr/i, /\bcr\b/i] },
  ];

  headers.forEach(header => {
    for (const { field, patterns } of fieldPatterns) {
      if (patterns.some(pattern => pattern.test(header))) {
        suggestions.push({
          csvColumn: header,
          suggestedField: field,
          confidence: 'high',
        });
        break; // Move to next header once a match is found
      }
    }
  });

  console.log("Suggested Column Mappings:", suggestions);
  return suggestions;
};

/**
 * Uses historical data and pattern matching to suggest mappings for unmapped accounts.
 * @param unmappedAccounts - An array of trial balance accounts that are not yet mapped.
 * @param existingMappings - The current mappings for the project.
 * @returns An array of account mapping suggestions.
 */
export const suggestAccountMappings = (
  unmappedAccounts: TrialBalanceAccount[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _existingMappings: MappedTrialBalance // Note: existingMappings is not used yet, but will be for learning
): AccountMappingSuggestion[] => {
  const suggestions: AccountMappingSuggestion[] = [];

  unmappedAccounts.forEach(account => {
    for (const rule of MAPPING_RULES) {
      if (rule.patterns.some(pattern => pattern.test(account.accountName))) {
        suggestions.push({
          accountId: account.accountId,
          accountName: account.accountName,
          suggestedMapping: {
            statement: rule.statement,
            lineItem: rule.lineItem,
          },
          confidence: 'medium',
        });
        return; // Move to the next account once a suggestion is found
      }
    }
  });

  console.log("Suggested Account Mappings:", suggestions);
  return suggestions;
};
