/**
 * Format Converters Service
 * Handles conversion between different accounting software formats
 */

import type { TrialBalanceAccount } from '@/types/project';
import Papa from 'papaparse';

export interface QuickBooksIIFRecord {
  type: 'ACCNT' | 'TRNS' | 'SPL';
  account?: string;
  accountType?: string;
  date?: string;
  amount?: number;
  description?: string;
  reference?: string;
}

export interface XeroCSVRecord {
  AccountCode: string;
  AccountName: string;
  AccountType: string;
  Debit: number;
  Credit: number;
  Description: string;
  Date: string;
  Reference: string;
}

export interface SageCSVRecord {
  'Account Code': string;
  'Account Name': string;
  'Debit Amount': number;
  'Credit Amount': number;
  'Transaction Date': string;
  'Description': string;
  'Reference': string;
}

/**
 * Convert trial balance data to QuickBooks IIF format
 */
export const convertToQuickBooksIIF = (
  accounts: TrialBalanceAccount[],
  companyName: string,
  periodEndDate: Date
): string => {
  const lines: string[] = [];
  
  // Header
  lines.push('!HDR\tVER\t9.0');
  lines.push('!HDR\tCOMPANY\t' + companyName);
  lines.push('!HDR\tDATE\t' + formatDateForQB(periodEndDate));
  lines.push('');
  
  // Chart of Accounts
  lines.push('!ACCNT\tNAME\tACCNTTYPE\tEXTRA\tHIDDEN');
  accounts.forEach(account => {
    const accountType = inferAccountType(account.accountName);
    lines.push(`ACCNT\t${account.accountName}\t${accountType}\t\tN`);
  });
  lines.push('');
  
  // Trial Balance Entries
  lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLEAR\tAMOUNT');
  accounts.forEach(account => {
    if (account.debit > 0) {
      lines.push(`TRNS\tDEPOSIT\t${formatDateForQB(periodEndDate)}\t${account.accountName}\t\tN\t${account.debit.toFixed(2)}`);
    }
    if (account.credit > 0) {
      lines.push(`TRNS\tDEPOSIT\t${formatDateForQB(periodEndDate)}\t${account.accountName}\t\tN\t-${account.credit.toFixed(2)}`);
    }
  });
  
  return lines.join('\n');
};

/**
 * Convert trial balance data to Xero CSV format
 */
export const convertToXeroCSV = (
  accounts: TrialBalanceAccount[],
  periodEndDate: Date
): string => {
  const records: XeroCSVRecord[] = accounts.map(account => ({
    AccountCode: account.accountId,
    AccountName: account.accountName,
    AccountType: inferAccountType(account.accountName),
    Debit: account.debit,
    Credit: account.credit,
    Description: `Trial Balance Entry - ${account.accountName}`,
    Date: formatDateForXero(periodEndDate),
    Reference: `TB-${account.accountId}`
  }));
  
  return Papa.unparse(records);
};

/**
 * Convert trial balance data to Sage CSV format
 */
export const convertToSageCSV = (
  accounts: TrialBalanceAccount[],
  periodEndDate: Date
): string => {
  const records: SageCSVRecord[] = accounts.map(account => ({
    'Account Code': account.accountId,
    'Account Name': account.accountName,
    'Debit Amount': account.debit,
    'Credit Amount': account.credit,
    'Transaction Date': formatDateForSage(periodEndDate),
    'Description': `Trial Balance Entry - ${account.accountName}`,
    'Reference': `TB-${account.accountId}`
  }));
  
  return Papa.unparse(records);
};

/**
 * Parse QuickBooks IIF format to trial balance data
 */
export const parseQuickBooksIIF = (iifContent: string): TrialBalanceAccount[] => {
  const lines = iifContent.split('\n');
  const accounts: TrialBalanceAccount[] = [];
  const accountMap = new Map<string, { name: string; debit: number; credit: number }>();
  
  lines.forEach(line => {
    const parts = line.split('\t');
    
    if (parts[0] === 'TRNS' && parts.length >= 7) {
      const accountName = parts[4];
      const amount = parseFloat(parts[6]);
      
      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, { name: accountName, debit: 0, credit: 0 });
      }
      
      const account = accountMap.get(accountName)!;
      if (amount > 0) {
        account.debit += amount;
      } else {
        account.credit += Math.abs(amount);
      }
    }
  });
  
  accountMap.forEach((data, accountName) => {
    accounts.push({
      accountId: generateAccountId(accountName),
      accountName: data.name,
      originalDebit: data.debit,
      originalCredit: data.credit,
      adjustmentDebit: 0,
      adjustmentCredit: 0,
      finalDebit: data.debit,
      finalCredit: data.credit,
      debit: data.debit, // For backward compatibility
      credit: data.credit // For backward compatibility
    });
  });
  
  return accounts;
};

/**
 * Parse Xero CSV format to trial balance data
 */
export const parseXeroCSV = (csvContent: string): TrialBalanceAccount[] => {
  const parsed = Papa.parse<XeroCSVRecord>(csvContent, { 
    header: true, 
    skipEmptyLines: true 
  });
  
  return parsed.data.map(record => ({
    accountId: record.AccountCode || generateAccountId(record.AccountName),
    accountName: record.AccountName || 'Unknown Account',
    originalDebit: parseFloat(String(record.Debit)) || 0,
    originalCredit: parseFloat(String(record.Credit)) || 0,
    adjustmentDebit: 0,
    adjustmentCredit: 0,
    finalDebit: parseFloat(String(record.Debit)) || 0,
    finalCredit: parseFloat(String(record.Credit)) || 0,
    debit: parseFloat(String(record.Debit)) || 0, // For backward compatibility
    credit: parseFloat(String(record.Credit)) || 0 // For backward compatibility
  }));
};

/**
 * Parse Sage CSV format to trial balance data
 */
export const parseSageCSV = (csvContent: string): TrialBalanceAccount[] => {
  const parsed = Papa.parse<SageCSVRecord>(csvContent, { 
    header: true, 
    skipEmptyLines: true 
  });
  
  return parsed.data.map(record => ({
    accountId: record['Account Code'] || generateAccountId(record['Account Name']),
    accountName: record['Account Name'] || 'Unknown Account',
    originalDebit: parseFloat(String(record['Debit Amount'])) || 0,
    originalCredit: parseFloat(String(record['Credit Amount'])) || 0,
    adjustmentDebit: 0,
    adjustmentCredit: 0,
    finalDebit: parseFloat(String(record['Debit Amount'])) || 0,
    finalCredit: parseFloat(String(record['Credit Amount'])) || 0,
    debit: parseFloat(String(record['Debit Amount'])) || 0, // For backward compatibility
    credit: parseFloat(String(record['Credit Amount'])) || 0 // For backward compatibility
  }));
};

/**
 * Detect format type from content
 */
export const detectFormatType = (content: string): 'quickbooks-iif' | 'xero-csv' | 'sage-csv' | 'generic-csv' | 'unknown' => {
  const firstLine = content.split('\n')[0].toUpperCase();
  
  if (firstLine.includes('!HDR') || firstLine.includes('!ACCNT')) {
    return 'quickbooks-iif';
  }
  
  if (firstLine.includes('ACCOUNTCODE') && firstLine.includes('ACCOUNTNAME')) {
    return 'xero-csv';
  }
  
  if (firstLine.includes('ACCOUNT CODE') && firstLine.includes('ACCOUNT NAME')) {
    return 'sage-csv';
  }
  
  if (firstLine.includes(',') && (firstLine.includes('ACCOUNT') || firstLine.includes('DEBIT') || firstLine.includes('CREDIT'))) {
    return 'generic-csv';
  }
  
  return 'unknown';
};

/**
 * Auto-convert based on detected format
 */
export const autoConvert = (content: string, targetFormat: 'quickbooks-iif' | 'xero-csv' | 'sage-csv'): string => {
  const sourceFormat = detectFormatType(content);
  let accounts: TrialBalanceAccount[] = [];
  
  // Parse source format
  switch (sourceFormat) {
    case 'quickbooks-iif':
      accounts = parseQuickBooksIIF(content);
      break;
    case 'xero-csv':
      accounts = parseXeroCSV(content);
      break;
    case 'sage-csv':
      accounts = parseSageCSV(content);
      break;
    default:
      throw new Error(`Unsupported source format: ${sourceFormat}`);
  }
  
  // Convert to target format
  const periodEndDate = new Date();
  const companyName = 'Converted Company';
  
  switch (targetFormat) {
    case 'quickbooks-iif':
      return convertToQuickBooksIIF(accounts, companyName, periodEndDate);
    case 'xero-csv':
      return convertToXeroCSV(accounts, periodEndDate);
    case 'sage-csv':
      return convertToSageCSV(accounts, periodEndDate);
    default:
      throw new Error(`Unsupported target format: ${targetFormat}`);
  }
};

// Helper functions
const formatDateForQB = (date: Date): string => {
  return date.toLocaleDateString('en-US');
};

const formatDateForXero = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDateForSage = (date: Date): string => {
  return date.toLocaleDateString('en-GB');
};

const generateAccountId = (accountName: string): string => {
  return accountName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10)
    + Math.random().toString(36).substr(2, 4).toUpperCase();
};

const inferAccountType = (accountName: string): string => {
  const name = accountName.toLowerCase();
  
  if (name.includes('cash') || name.includes('bank') || name.includes('current account')) {
    return 'BANK';
  }
  if (name.includes('receivable') || name.includes('debtor')) {
    return 'AR';
  }
  if (name.includes('payable') || name.includes('creditor')) {
    return 'AP';
  }
  if (name.includes('inventory') || name.includes('stock')) {
    return 'INVENTORY';
  }
  if (name.includes('revenue') || name.includes('sales') || name.includes('income')) {
    return 'INCOME';
  }
  if (name.includes('expense') || name.includes('cost')) {
    return 'EXPENSE';
  }
  if (name.includes('asset')) {
    return 'FIXED ASSET';
  }
  if (name.includes('liability') || name.includes('loan')) {
    return 'LIABILITY';
  }
  if (name.includes('equity') || name.includes('capital')) {
    return 'EQUITY';
  }
  
  return 'OTHER';
};

export interface TransformationPipeline {
  id: string;
  name: string;
  description: string;
  sourceFormat: string;
  targetFormat: string;
  transformations: TransformationRule[];
}

export interface TransformationRule {
  type: 'map-field' | 'calculate' | 'filter' | 'format';
  sourceField?: string;
  targetField?: string;
  formula?: string;
  condition?: string;
  format?: string;
}

export const PREDEFINED_PIPELINES: TransformationPipeline[] = [
  {
    id: 'qb-to-ifrs',
    name: 'QuickBooks to IFRS',
    description: 'Convert QuickBooks chart of accounts to IFRS structure',
    sourceFormat: 'quickbooks-iif',
    targetFormat: 'ifrs-csv',
    transformations: [
      { type: 'map-field', sourceField: 'ACCNT', targetField: 'AccountCode' },
      { type: 'map-field', sourceField: 'NAME', targetField: 'AccountName' },
      { type: 'calculate', targetField: 'IFRSCategory', formula: 'mapToIFRSCategory(AccountName)' }
    ]
  },
  {
    id: 'xero-to-gaap',
    name: 'Xero to US GAAP',
    description: 'Convert Xero accounts to US GAAP structure',
    sourceFormat: 'xero-csv',
    targetFormat: 'gaap-csv',
    transformations: [
      { type: 'map-field', sourceField: 'AccountCode', targetField: 'GLAccount' },
      { type: 'map-field', sourceField: 'AccountName', targetField: 'AccountDescription' },
      { type: 'calculate', targetField: 'GAAPClass', formula: 'mapToGAAPClass(AccountType)' }
    ]
  }
];

/**
 * Execute a transformation pipeline
 */
export const executePipeline = (
  pipeline: TransformationPipeline,
  sourceData: string
): string => {
  // This is a simplified implementation
  // In a real application, you would implement a proper transformation engine
  
  let transformedData = sourceData;
  
  pipeline.transformations.forEach(rule => {
    switch (rule.type) {
      case 'map-field':
        if (rule.sourceField && rule.targetField) {
          transformedData = transformedData.replace(
            new RegExp(rule.sourceField, 'g'),
            rule.targetField
          );
        }
        break;
      case 'format':
        // Apply formatting rules
        break;
      case 'filter':
        // Apply filtering logic
        break;
      case 'calculate':
        // Apply calculation formulas
        break;
    }
  });
  
  return transformedData;
};
