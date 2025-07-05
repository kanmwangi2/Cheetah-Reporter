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

// Enhanced account classifications with context-aware patterns
export const DEFAULT_ACCOUNT_CLASSIFICATIONS: AccountClassification[] = [
  // === ASSETS ===
  
  // Cash and Cash Equivalents (Enhanced with MOMO and context awareness)
  {
    id: 'cash-bank',
    name: 'Cash and Bank Accounts',
    statement: 'assets',
    lineItem: 'Cash and Cash Equivalents',
    keywords: ['cash on hand', 'petty cash', 'cash at bank', 'bank current', 'checking account', 'savings account', 'money market', 'current account', 'momo', 'mobile money', 'mpesa', 'airtel money'],
    patterns: [
      /cash/i, // Much more flexible - matches any account with "cash" in the name
      /\bbank\b(?!\s*(loan|charges|fees|interest|overdraft))/i, // Matches "bank" but not if followed by negative terms
      /petty/i,
      /money\s*market/i,
      /current\s*account/i,
      /checking/i,
      /savings/i,
      /momo/i,
      /mobile\s*money/i,
      /m-?pesa/i,
      /airtel\s*money/i,
      /orange\s*money/i
    ],
    priority: 95,
    accountCodes: ['1000', '1001', '1010', '1100'],
    description: 'Cash, bank accounts, mobile money (MOMO), and cash equivalents'
  },

  // Trade Receivables  
  {
    id: 'trade-receivables',
    name: 'Trade Receivables',
    statement: 'assets',
    lineItem: 'Trade Receivables',
    keywords: ['accounts receivable', 'trade receivables', 'debtors', 'customer receivables', 'sales receivables'],
    patterns: [
      /receivables?/i, // More flexible
      /debtors?/i,
      /customers?\s*(receivables?|outstanding|debtors?)/i,
      /sales\s*receivables?/i
    ],
    priority: 90,
    accountCodes: ['1200', '1201', '1210'],
    description: 'Amounts owed by customers for goods/services sold'
  },

  // Inventory
  {
    id: 'inventory',
    name: 'Inventory',
    statement: 'assets',
    lineItem: 'Inventory',
    keywords: ['inventory', 'stock', 'goods', 'merchandise', 'raw materials', 'work in progress', 'finished goods'],
    patterns: [
      /inventory/i,
      /stock/i,
      /raw\s*materials?/i,
      /work\s*in\s*progress/i,
      /finished\s*goods/i,
      /merchandise/i,
      /goods/i
    ],
    priority: 90,
    accountCodes: ['1300', '1301', '1310'],
    description: 'Goods held for sale or used in production'
  },

  // Prepaid Expenses (New - very common in businesses)
  {
    id: 'prepaid-expenses',
    name: 'Prepaid Expenses',
    statement: 'assets',
    lineItem: 'Other Current Assets',
    keywords: ['prepaid', 'prepaid expenses', 'prepaid rent', 'prepaid insurance', 'prepaid services', 'advances paid', 'deposits paid'],
    patterns: [
      /prepaid/i, // More flexible - any account with "prepaid"
      /advances?\s*paid/i,
      /deposits?\s*paid/i,
      /prepayments?/i
    ],
    priority: 95,
    accountCodes: ['1400', '1401', '1410'],
    description: 'Expenses paid in advance for future periods'
  },

  // Other Receivables (New - for non-trade receivables)
  {
    id: 'other-receivables',
    name: 'Other Receivables',
    statement: 'assets',
    lineItem: 'Other Current Assets',
    keywords: ['other receivables', 'staff advances', 'employee advances', 'advance to staff', 'sundry debtors', 'other debtors', 'advances receivable'],
    patterns: [
      /^other\s*(receivables?|debtors?)$/i,
      /^staff\s*(advances?|receivables?)$/i,
      /^employee\s*advances?$/i,
      /^advances?\s*(to\s*staff|receivables?)$/i,
      /^sundry\s*(debtors?|receivables?)$/i
    ],
    priority: 85,
    accountCodes: ['1250', '1251'],
    description: 'Non-trade receivables including staff advances and other debtors'
  },

  // Property, Plant and Equipment
  {
    id: 'ppe',
    name: 'Property, Plant and Equipment',
    statement: 'assets',
    lineItem: 'Property, Plant and Equipment',
    keywords: ['property', 'plant', 'equipment', 'land', 'building', 'machinery', 'furniture', 'fixtures', 'vehicles', 'computer equipment', 'office equipment'],
    patterns: [
      /property/i,
      /\bplant\b/i,
      /equipment/i,
      /\bland\b/i,
      /buildings?/i,
      /machinery/i,
      /furniture/i,
      /fixtures/i,
      /vehicles?/i,
      /computers?/i,
      /motor\s*vehicles?/i,
      /office\s*(furniture|equipment)/i
    ],
    priority: 85,
    accountCodes: ['1500', '1501', '1510', '1520'],
    description: 'Tangible fixed assets used in operations'
  },

  // === LIABILITIES ===

  // Trade Payables
  {
    id: 'trade-payables',
    name: 'Trade Payables',
    statement: 'liabilities',
    lineItem: 'Trade Payables',
    keywords: ['accounts payable', 'trade payables', 'creditors', 'supplier payables', 'vendors payable'],
    patterns: [
      /payables?/i,
      /creditors?/i,
      /suppliers?/i,
      /vendors?/i
    ],
    priority: 90,
    accountCodes: ['2100', '2101', '2110'],
    description: 'Amounts owed to suppliers for goods/services purchased'
  },

  // Accrued Liabilities (New - very common)
  {
    id: 'accrued-liabilities',
    name: 'Accrued Liabilities',
    statement: 'liabilities',
    lineItem: 'Other Current Liabilities',
    keywords: ['accrued', 'accrued expenses', 'accrued liabilities', 'accruals', 'expenses payable', 'accrued salaries', 'accrued interest'],
    patterns: [
      /^accrued\s*(expenses?|liabilities?|salaries?|interest)?$/i,
      /^accruals?$/i,
      /^expenses?\s*payables?$/i,
      /^accrued\s*(utilities|rent|professional\s*fees)$/i,
      /accrued/i
    ],
    priority: 95,
    accountCodes: ['2130', '2131'],
    description: 'Expenses incurred but not yet paid'
  },

  // Customer Deposits and Advances (New - for prepayments from customers)
  {
    id: 'customer-deposits',
    name: 'Customer Deposits and Advances',
    statement: 'liabilities',
    lineItem: 'Other Current Liabilities',
    keywords: ['customer deposits', 'customer advances', 'deposits received', 'advances from customers', 'unearned revenue', 'deferred revenue'],
    patterns: [
      /^customer\s*(deposits?|advances?)$/i,
      /^deposits?\s*received$/i,
      /^advances?\s*(from\s*customers?|received)$/i,
      /^(unearned|deferred)\s*revenue$/i,
      /^prepayments?\s*from\s*customers?$/i
    ],
    priority: 95,
    accountCodes: ['2140', '2141'],
    description: 'Payments received from customers for future goods/services'
  },

  // VAT Accounts (New classification per your feedback)
  {
    id: 'vat-liabilities',
    name: 'VAT and Tax Liabilities',
    statement: 'liabilities',
    lineItem: 'Other Current Liabilities',
    keywords: ['vat', 'value added tax', 'sales tax', 'input vat', 'output vat', 'vat payable', 'vat receivable', 'tax payable'],
    patterns: [
      /^vat\s*(payable|receivable|input|output)?$/i,
      /^value\s*added\s*tax$/i,
      /^sales\s*tax$/i,
      /^(input|output)\s*vat$/i,
      /^tax\s*payable$/i
    ],
    priority: 95,
    accountCodes: ['2150', '2151'],
    description: 'VAT and other tax liabilities'
  },

  // Payroll Liabilities (Enhanced per your feedback)
  {
    id: 'payroll-liabilities',
    name: 'Payroll Liabilities',
    statement: 'liabilities',
    lineItem: 'Other Current Liabilities',
    keywords: ['payroll payable', 'salaries payable', 'wages payable', 'paye', 'nssf', 'nhif', 'employee deductions', 'staff payable'],
    patterns: [
      /^(payroll|salaries?|wages?)\s*payables?$/i,
      /^paye\s*(payable)?$/i,
      /^(nssf|nhif)\s*(payable)?$/i,
      /^employee\s*(deductions?|payables?)$/i,
      /^staff\s*payables?$/i
    ],
    priority: 95,
    accountCodes: ['2120', '2121', '2125'],
    description: 'Payroll and employee-related liabilities'
  },

  // Bank Loans (Context-aware to distinguish from bank accounts)
  {
    id: 'bank-loans',
    name: 'Bank Loans and Borrowings',
    statement: 'liabilities',
    lineItem: 'Other Non-Current Liabilities',
    keywords: ['bank loan', 'bank borrowing', 'loan payable', 'borrowings', 'credit facility', 'overdraft'],
    patterns: [
      /^bank\s*(loan|borrowing|overdraft|credit\s*facility)$/i,
      /\b\w+\s*bank\s*(loan|borrowing|credit)/i, // Any bank name + loan/borrowing/credit is a loan
      /^loans?\s*payables?$/i,
      /^borrowings?$/i,
      /^credit\s*(facility|line)$/i,
      /^overdraft$/i
    ],
    priority: 95,
    accountCodes: ['2500', '2501', '2510'],
    description: 'Bank loans, borrowings, and credit facilities'
  },

  // === EQUITY ===

  // Share Capital
  {
    id: 'share-capital',
    name: 'Share Capital',
    statement: 'equity',
    lineItem: 'Share Capital',
    keywords: ['share capital', 'common stock', 'ordinary shares', 'capital stock', 'issued capital'],
    patterns: [
      /^share\s*capital$/i,
      /^(common|ordinary)\s*(stock|shares?)$/i,
      /^capital\s*stock$/i,
      /^issued\s*capital$/i
    ],
    priority: 90,
    accountCodes: ['3000', '3001'],
    description: 'Issued share capital and common stock'
  },

  // Retained Earnings
  {
    id: 'retained-earnings',
    name: 'Retained Earnings',
    statement: 'equity',
    lineItem: 'Retained Earnings',
    keywords: ['retained earnings', 'accumulated profits', 'undistributed profits', 'profit brought forward'],
    patterns: [
      /^retained\s*earnings?$/i,
      /^accumulated\s*(profits?|earnings?)$/i,
      /^undistributed\s*profits?$/i,
      /^profits?\s*brought\s*forward$/i
    ],
    priority: 90,
    accountCodes: ['3500', '3501'],
    description: 'Accumulated retained earnings and profits'
  },

  // === REVENUE ===

  // Sales Revenue
  {
    id: 'sales-revenue',
    name: 'Sales Revenue',
    statement: 'revenue',
    lineItem: 'Revenue from Sales',
    keywords: ['sales', 'revenue', 'income from sales', 'sales income', 'turnover', 'gross sales'],
    patterns: [
      /sales/i,
      /revenue/i,
      /turnover/i,
      /income/i
    ],
    priority: 90,
    accountCodes: ['4000', '4001', '4010'],
    description: 'Revenue from sale of goods and services'
  },

  // Service Revenue (New - for service-based businesses)
  {
    id: 'service-revenue',
    name: 'Service Revenue',
    statement: 'revenue',
    lineItem: 'Revenue from Services',
    keywords: ['service revenue', 'consulting revenue', 'professional fees income', 'service income', 'fees earned'],
    patterns: [
      /^service\s*(revenue|income)$/i,
      /^consulting\s*(revenue|income|fees)$/i,
      /^professional\s*fees\s*(income|earned)$/i,
      /^fees\s*earned$/i,
      /^revenue\s*from\s*services?$/i
    ],
    priority: 90,
    accountCodes: ['4100', '4101'],
    description: 'Revenue from professional and consulting services'
  },

  // Interest Income (New - separate from other income for better classification)
  {
    id: 'interest-income',
    name: 'Interest Income',
    statement: 'revenue',
    lineItem: 'Interest Income',
    keywords: ['interest income', 'interest earned', 'bank interest', 'investment income'],
    patterns: [
      /^interest\s*(income|earned|revenue)$/i,
      /^bank\s*interest\s*(income|earned)?$/i,
      /^investment\s*(income|interest)$/i,
      /^interest\s*on\s*(deposits?|investments?)$/i
    ],
    priority: 95,
    accountCodes: ['4200', '4201'],
    description: 'Interest earned on deposits and investments'
  },

  // Other Income (Enhanced for non-operating income)
  {
    id: 'other-income',
    name: 'Other Income',
    statement: 'revenue',
    lineItem: 'Other Income',
    keywords: ['other income', 'miscellaneous income', 'dividend income', 'rental income', 'non-operating income', 'other revenue'],
    patterns: [
      /^other\s*(income|revenue)$/i,
      /^miscellaneous\s*income$/i,
      /^(dividend|rental)\s*income$/i,
      /^non[-\s]*operating\s*income$/i,
      /^sundry\s*income$/i
    ],
    priority: 85,
    accountCodes: ['4500', '4501', '4510'],
    description: 'Non-operating and other miscellaneous income'
  },

  // === EXPENSES ===

  // Cost of Sales (Enhanced context awareness)
  {
    id: 'cost-of-sales',
    name: 'Cost of Sales',
    statement: 'expenses',
    lineItem: 'Cost of Sales',
    keywords: ['cost of sales', 'cost of goods sold', 'cogs', 'direct costs', 'cost of revenue'],
    patterns: [
      /^cost\s*of\s*(sales?|goods?\s*sold|revenue)$/i,
      /^cogs$/i,
      /^direct\s*costs?$/i,
      /cost\s*of\s*sales/i // Match anywhere in string for "cost of sales"
    ],
    priority: 95,
    accountCodes: ['5000', '5001', '5010'],
    description: 'Direct costs of goods sold or services provided'
  },

  // Employee Salaries and Benefits (New - very common)
  {
    id: 'salaries-benefits',
    name: 'Salaries and Employee Benefits',
    statement: 'expenses',
    lineItem: 'Employee Benefits',
    keywords: ['salaries', 'wages', 'employee benefits', 'staff costs', 'payroll expenses', 'paye', 'nssf', 'nhif', 'staff salaries'],
    patterns: [
      /^(salaries?|wages?|staff\s*costs?)$/i,
      /^employee\s*(benefits?|costs?)$/i,
      /^payroll\s*(expenses?|costs?)$/i,
      /^staff\s*salaries?$/i,
      /^(paye|nssf|nhif)(\s*expenses?)?$/i
    ],
    priority: 95,
    accountCodes: ['5050', '5051', '5055'],
    description: 'Employee salaries, wages, and benefits including statutory deductions'
  },

  // Selling Expenses (Enhanced per your feedback)
  {
    id: 'selling-expenses',
    name: 'Selling Expenses',
    statement: 'expenses',
    lineItem: 'Selling Expenses',
    keywords: ['selling expenses', 'sales expenses', 'marketing expenses', 'advertising', 'sales commission', 'distribution costs'],
    patterns: [
      /^selling\s*(expenses?|costs?)$/i,
      /^sales\s*(expenses?|costs?)$/i,
      /^marketing\s*(expenses?|costs?)$/i,
      /^advertising(\s*(expenses?|costs?))?$/i,
      /^sales\s*commission$/i,
      /^distribution\s*(costs?|expenses?)$/i,
      /selling/i // Any reference to "selling" should be selling expenses
    ],
    priority: 95,
    accountCodes: ['5100', '5101', '5110'],
    description: 'Expenses related to selling and marketing activities'
  },

  // Professional Fees (New - very common in businesses)
  {
    id: 'professional-fees',
    name: 'Professional Fees',
    statement: 'expenses',
    lineItem: 'Administrative Expenses',
    keywords: ['professional fees', 'legal fees', 'audit fees', 'consulting fees', 'accounting fees', 'advisory fees', 'consultant expenses'],
    patterns: [
      /^professional\s*fees?$/i,
      /^(legal|audit|consulting|accounting|advisory)\s*fees?$/i,
      /^consultant\s*(expenses?|fees?)$/i,
      /^lawyer\s*fees?$/i,
      /^attorney\s*fees?$/i
    ],
    priority: 95,
    accountCodes: ['5150', '5151'],
    description: 'Legal, audit, consulting, and other professional service fees'
  },

  // Utilities Expenses (New - very common)
  {
    id: 'utilities',
    name: 'Utilities',
    statement: 'expenses',
    lineItem: 'Administrative Expenses',
    keywords: ['utilities', 'electricity', 'water', 'gas', 'telephone', 'internet', 'phone expenses', 'power expenses'],
    patterns: [
      /^utilities$/i,
      /^(electricity|water|gas|power)\s*(expenses?|bills?)?$/i,
      /^(telephone|phone|internet)\s*(expenses?|bills?)?$/i,
      /^utility\s*(expenses?|bills?)$/i,
      /^communication\s*(expenses?|costs?)$/i
    ],
    priority: 95,
    accountCodes: ['5180', '5181', '5185'],
    description: 'Electricity, water, gas, telephone, and internet expenses'
  },

  // Rent Expenses (New - very common)
  {
    id: 'rent-expenses',
    name: 'Rent Expenses',
    statement: 'expenses',
    lineItem: 'Administrative Expenses',
    keywords: ['rent', 'rent expenses', 'office rent', 'premises rent', 'rental expenses'],
    patterns: [
      /^rent(\s*(expenses?|costs?))?$/i,
      /^office\s*rent$/i,
      /^premises\s*rent$/i,
      /^rental\s*(expenses?|costs?)$/i,
      /^rent\s*for\s*(office|premises)$/i
    ],
    priority: 95,
    accountCodes: ['5170', '5171'],
    description: 'Office and premises rental expenses'
  },

  // Insurance Expenses (New - very common)
  {
    id: 'insurance-expenses',
    name: 'Insurance Expenses',
    statement: 'expenses',
    lineItem: 'Administrative Expenses',
    keywords: ['insurance', 'insurance expenses', 'insurance premiums', 'general insurance', 'motor insurance', 'professional indemnity'],
    patterns: [
      /^insurance(\s*(expenses?|premiums?|costs?))?$/i,
      /^(general|motor|professional\s*indemnity|public\s*liability)\s*insurance$/i,
      /^insurance\s*premiums?$/i,
      /^indemnity\s*insurance$/i
    ],
    priority: 95,
    accountCodes: ['5175', '5176'],
    description: 'Insurance premiums and related expenses'
  },

  // Administrative Expenses (Enhanced with bank charges and MOMO charges)
  {
    id: 'admin-expenses',
    name: 'Administrative Expenses',
    statement: 'expenses',
    lineItem: 'Administrative Expenses',
    keywords: ['administrative expenses', 'admin expenses', 'office expenses', 'general expenses', 'bank charges', 'momo charges', 'bank fees', 'transaction fees'],
    patterns: [
      /^(administrative?|admin|general|office)\s*(expenses?|costs?)$/i,
      /^bank\s*(charges?|fees?)$/i,
      /^momo\s*(charges?|fees?)$/i, // Mobile money charges are admin expenses
      /^transaction\s*(fees?|charges?)$/i,
      /^service\s*(charges?|fees?)$/i
    ],
    priority: 90,
    accountCodes: ['5200', '5201', '5210'],
    description: 'General administrative and office expenses, including bank and transaction charges'
  },

  // Travel and Entertainment (New - very common)
  {
    id: 'travel-entertainment',
    name: 'Travel and Entertainment',
    statement: 'expenses',
    lineItem: 'Other Operating Expenses',
    keywords: ['travel', 'travel expenses', 'entertainment', 'meals', 'accommodation', 'hotel expenses', 'transport expenses'],
    patterns: [
      /^travel(\s*(expenses?|costs?))?$/i,
      /^entertainment(\s*(expenses?|costs?))?$/i,
      /^(meals?|accommodation|hotel)\s*(expenses?|costs?)$/i,
      /^travel\s*(and\s*entertainment|expenses?)$/i,
      /^business\s*(travel|meals?)$/i
    ],
    priority: 95,
    accountCodes: ['5250', '5251'],
    description: 'Business travel, accommodation, meals, and entertainment expenses'
  },

  // Training and Development (New - important for businesses)
  {
    id: 'training-development',
    name: 'Training and Development',
    statement: 'expenses',
    lineItem: 'Other Operating Expenses',
    keywords: ['training', 'training expenses', 'staff development', 'employee training', 'courses', 'seminars', 'workshops'],
    patterns: [
      /^training(\s*(expenses?|costs?))?$/i,
      /^staff\s*development$/i,
      /^employee\s*training$/i,
      /^(courses?|seminars?|workshops?)\s*(expenses?|fees?)?$/i,
      /^professional\s*development$/i
    ],
    priority: 95,
    accountCodes: ['5260', '5261'],
    description: 'Employee training, courses, and professional development expenses'
  },

  // Bad Debts (New - important for credit management)
  {
    id: 'bad-debts',
    name: 'Bad Debts',
    statement: 'expenses',
    lineItem: 'Other Operating Expenses',
    keywords: ['bad debts', 'doubtful debts', 'provision for bad debts', 'debt write off', 'uncollectible accounts'],
    patterns: [
      /^bad\s*debts?$/i,
      /^doubtful\s*debts?$/i,
      /^provision\s*for\s*(bad|doubtful)\s*debts?$/i,
      /^debt\s*write\s*off$/i,
      /^uncollectible\s*(accounts?|debts?)$/i
    ],
    priority: 95,
    accountCodes: ['5280', '5281'],
    description: 'Bad debts written off and provisions for doubtful debts'
  },

  // Interest Expenses (New - separate from other expenses for better classification)
  {
    id: 'interest-expenses',
    name: 'Interest Expenses',
    statement: 'expenses',
    lineItem: 'Interest Expenses',
    keywords: ['interest expense', 'interest paid', 'loan interest', 'bank interest', 'borrowing costs'],
    patterns: [
      /^interest\s*(expenses?|paid|costs?)$/i,
      /^loan\s*interest$/i,
      /^bank\s*interest\s*(expenses?|paid)?$/i,
      /^borrowing\s*(costs?|interest)$/i,
      /^interest\s*on\s*(loans?|borrowings?)$/i
    ],
    priority: 95,
    accountCodes: ['5290', '5291'],
    description: 'Interest paid on loans and borrowings'
  },

  // Vehicle Expenses (Enhanced per your feedback - NOT assets!)
  {
    id: 'vehicle-expenses',
    name: 'Vehicle and Transport Expenses',
    statement: 'expenses',
    lineItem: 'Other Operating Expenses',
    keywords: ['vehicle expenses', 'vehicle running expenses', 'transport expenses', 'fuel expenses', 'vehicle maintenance', 'vehicle repairs'],
    patterns: [
      /^vehicle\s*(expenses?|running\s*expenses?|costs?)$/i,
      /^transport(ation)?\s*(expenses?|costs?)$/i,
      /^fuel\s*(expenses?|costs?)$/i,
      /^vehicle\s*(maintenance|repairs?)$/i,
      /vehicle.*expense/i // Any account with "vehicle" and "expense" is an expense
    ],
    priority: 95,
    accountCodes: ['5300', '5301'],
    description: 'Vehicle running costs and transportation expenses'
  },

  // Repairs and Maintenance (Enhanced - these are expenses, not assets!)
  {
    id: 'repairs-maintenance',
    name: 'Repairs and Maintenance',
    statement: 'expenses',
    lineItem: 'Other Operating Expenses',
    keywords: ['repairs and maintenance', 'maintenance expenses', 'repair expenses', 'repairs', 'maintenance'],
    patterns: [
      /^repairs?\s*(and\s*maintenance|expenses?)?$/i,
      /^maintenance(\s*(expenses?|costs?))?$/i,
      /^repair\s*(expenses?|costs?)$/i,
      /repairs?\s*(and\s*)?maintenance/i // Match anywhere for repairs and maintenance
    ],
    priority: 95,
    accountCodes: ['5350', '5351'],
    description: 'Repairs and maintenance expenses (not assets)'
  },

  // Stationery and Office Supplies (New - very common)
  {
    id: 'stationery-supplies',
    name: 'Stationery and Office Supplies',
    statement: 'expenses',
    lineItem: 'Administrative Expenses',
    keywords: ['stationery', 'office supplies', 'printing', 'postage', 'stationery expenses', 'office materials'],
    patterns: [
      /^stationery(\s*(expenses?|costs?))?$/i,
      /^office\s*supplies?$/i,
      /^printing(\s*(expenses?|costs?))?$/i,
      /^postage(\s*(expenses?|costs?))?$/i,
      /^office\s*materials?$/i
    ],
    priority: 95,
    accountCodes: ['5220', '5221'],
    description: 'Stationery, office supplies, printing, and postage expenses'
  },

  // Depreciation and Amortisation (Enhanced per your feedback)
  {
    id: 'depreciation-amortisation',
    name: 'Depreciation and Amortisation',
    statement: 'expenses',
    lineItem: 'Depreciation and Amortisation',
    keywords: ['depreciation', 'amortisation', 'depreciation expenses', 'amortisation expenses'],
    patterns: [
      /^depreciation(\s*(expenses?|costs?))?$/i,
      /^amortisation(\s*(expenses?|costs?))?$/i,
      /^depreciation\s*(and|&)\s*amortisation$/i,
      /depreciation/i, // Change from just "depreciation" to include amortisation context
      /amortisation/i
    ],
    priority: 95,
    accountCodes: ['5400', '5401'],
    description: 'Depreciation and amortisation expenses for both tangible and intangible assets'
  },

  // Income Tax Expenses (New classification per your feedback)
  {
    id: 'income-tax-expenses',
    name: 'Income Tax Expenses',
    statement: 'expenses',
    lineItem: 'Income Tax Expenses',
    keywords: ['income tax expense', 'current income tax', 'deferred tax expense', 'tax expense', 'corporate tax'],
    patterns: [
      /^(income\s*)?tax\s*expenses?$/i,
      /^current\s*income\s*tax$/i,
      /^deferred\s*tax\s*expenses?$/i,
      /^corporate\s*tax$/i,
      /income\s*tax/i
    ],
    priority: 95,
    accountCodes: ['5500', '5501'],
    description: 'Current and deferred income tax expenses'
  },

  // Other Expenses (Enhanced for non-operating expenses)
  {
    id: 'other-expenses',
    name: 'Other Expenses',
    statement: 'expenses',
    lineItem: 'Other Expenses',
    keywords: ['other expenses', 'miscellaneous expenses', 'sundry expenses', 'non-operating expenses', 'other costs'],
    patterns: [
      /^other\s*(expenses?|costs?)$/i,
      /^miscellaneous\s*(expenses?|costs?)$/i,
      /^sundry\s*(expenses?|costs?)$/i,
      /^non[-\s]*operating\s*(expenses?|costs?)$/i, // Non-operating expenses
      /^exceptional\s*(expenses?|costs?)$/i
    ],
    priority: 80,
    accountCodes: ['5900', '5901'],
    description: 'Non-operating and miscellaneous expenses'
  },

  // Accumulated Depreciation (Contra-Asset)
  {
    id: 'accumulated-depreciation',
    name: 'Accumulated Depreciation',
    statement: 'assets',
    lineItem: 'Property, Plant and Equipment',
    keywords: ['accumulated depreciation', 'depreciation provision'],
    patterns: [
      /^accumulated\s*depreciation$/i,
      /^depreciation\s*provision$/i,
      /^provision\s*(for\s*)?depreciation$/i
    ],
    priority: 95,
    accountCodes: ['1590', '1591'],
    description: 'Accumulated depreciation on fixed assets (contra-asset)'
  },

  // Investments
  {
    id: 'investments',
    name: 'Investments',
    statement: 'assets',
    lineItem: 'Other Non-Current Assets',
    keywords: ['investments', 'shares', 'bonds', 'securities', 'long term investments'],
    patterns: [
      /^investments?$/i,
      /^(shares?|bonds?|securities?)$/i,
      /^long\s*term\s*investments?$/i,
      /^financial\s*assets?$/i,
      /^investment\s*in\s*(shares?|bonds?)$/i
    ],
    priority: 88,
    accountCodes: ['1600', '1601', '1610'],
    description: 'Long-term investments and securities'
  },

  // Goodwill and Intangibles
  {
    id: 'intangible-assets',
    name: 'Intangible Assets',
    statement: 'assets',
    lineItem: 'Intangible Assets',
    keywords: ['goodwill', 'intangible assets', 'patents', 'trademarks', 'software', 'licenses'],
    patterns: [
      /^(goodwill|patents?|trademarks?|copyrights?)$/i,
      /^intangible\s*assets?$/i,
      /^software(\s*licenses?)?$/i,
      /^licenses?$/i,
      /^intellectual\s*property$/i
    ],
    priority: 90,
    accountCodes: ['1700', '1701', '1710'],
    description: 'Goodwill and other intangible assets'
  }
];

/**
 * Advanced pattern matching for account classification
 * Handles complex business scenarios and edge cases
 */
export function getAdvancedPatternScore(
  rule: ClassificationRule,
  accountName: string,
  accountDescription: string | undefined
): number {
  const fullText = `${accountName} ${accountDescription || ''}`.toLowerCase();
  let score = 0;

  // === ADVANCED BUSINESS LOGIC PATTERNS ===

  // 1. Multi-word keyword matching (higher score for complete phrases)
  for (const keyword of rule.keywords) {
    if (keyword.includes(' ')) {
      // Multi-word keyword gets higher score
      if (fullText.includes(keyword.toLowerCase())) {
        score += 15;
      }
    } else {
      // Single word keyword
      if (fullText.includes(keyword.toLowerCase())) {
        score += 8;
      }
    }
  }

  // 2. Exact phrase matching (highest score)
  const exactPhrases = [
    'accounts receivable', 'accounts payable', 'trade receivables', 'trade payables',
    'cost of sales', 'cost of goods sold', 'professional fees', 'bank charges',
    'prepaid expenses', 'accrued expenses', 'customer deposits', 'staff advances',
    'retained earnings', 'share capital', 'motor vehicles', 'office equipment'
  ];

  for (const phrase of exactPhrases) {
    if (fullText.includes(phrase)) {
      score += 25; // Very high score for exact business phrases
    }
  }

  // 3. Account code proximity scoring
  if (rule.accountCodes && rule.accountCodes.length > 0) {
    // Extract potential account codes from the account name
    const codeMatches = accountName.match(/\b\d{3,5}\b/g);
    if (codeMatches) {
      for (const code of codeMatches) {
        for (const ruleCode of rule.accountCodes) {
          if (code.startsWith(ruleCode.substring(0, 2))) {
            score += 10; // Boost for similar account code patterns
          }
        }
      }
    }
  }

  // 4. Context-sensitive scoring adjustments
  if (rule.statement === 'assets') {
    // Boost asset classification for certain patterns
    if (fullText.includes('receivable') || fullText.includes('cash') || fullText.includes('bank account') || 
        fullText.includes('inventory') || fullText.includes('prepaid') || fullText.includes('equipment')) {
      score += 10;
    }
    // Penalize if clearly not an asset
    if (fullText.includes('payable') || fullText.includes('expense') || fullText.includes('cost') || 
        fullText.includes('income') || fullText.includes('revenue')) {
      score -= 15;
    }
  }

  if (rule.statement === 'liabilities') {
    // Boost liability classification
    if (fullText.includes('payable') || fullText.includes('loan') || fullText.includes('creditor') || 
        fullText.includes('accrued') || fullText.includes('deposit received')) {
      score += 10;
    }
    // Penalize if clearly not a liability
    if (fullText.includes('receivable') || fullText.includes('cash') || fullText.includes('expense') || 
        fullText.includes('revenue') || fullText.includes('equipment')) {
      score -= 15;
    }
  }

  if (rule.statement === 'revenue') {
    // Boost revenue classification
    if (fullText.includes('sales') || fullText.includes('income') || fullText.includes('revenue') || 
        fullText.includes('fees earned') || fullText.includes('interest earned')) {
      score += 10;
    }
    // Penalize if clearly not revenue
    if (fullText.includes('expense') || fullText.includes('cost') || fullText.includes('payable') || 
        fullText.includes('receivable') || fullText.includes('paid')) {
      score -= 15;
    }
  }

  if (rule.statement === 'expenses') {
    // Boost expense classification
    if (fullText.includes('expense') || fullText.includes('cost') || fullText.includes('fee') || 
        fullText.includes('charges') || fullText.includes('paid') || fullText.includes('salary') || 
        fullText.includes('rent') || fullText.includes('utilities')) {
      score += 10;
    }
    // Penalize if clearly not an expense
    if (fullText.includes('receivable') || fullText.includes('payable') || fullText.includes('income') || 
        fullText.includes('revenue') || fullText.includes('capital') || fullText.includes('equipment')) {
      score -= 15;
    }
  }

  // 5. Industry-specific adjustments
  const industryIndicators = {
    manufacturing: ['raw materials', 'work in progress', 'finished goods', 'production', 'manufacturing'],
    retail: ['merchandise', 'sales', 'inventory', 'customer'],
    services: ['professional fees', 'consulting', 'service revenue', 'billable hours'],
    construction: ['contracts', 'progress billing', 'retention', 'materials'],
    technology: ['software', 'licenses', 'development', 'hosting', 'subscriptions']
  };

  for (const [, indicators] of Object.entries(industryIndicators)) {
    for (const indicator of indicators) {
      if (fullText.includes(indicator)) {
        score += 5; // Small boost for industry-specific terms
        break;
      }
    }
  }

  // 6. Financial ratio and analysis considerations
  const ratioImportantAccounts = [
    'current assets', 'current liabilities', 'total assets', 'total liabilities',
    'gross profit', 'operating profit', 'net profit', 'working capital'
  ];

  for (const ratioAccount of ratioImportantAccounts) {
    if (fullText.includes(ratioAccount)) {
      score += 8; // Boost for financially significant accounts
    }
  }

  // 7. Temporal and seasonal considerations
  const temporalKeywords = [
    'annual', 'monthly', 'quarterly', 'year-end', 'accrued', 'prepaid',
    'current year', 'prior year', 'beginning', 'ending'
  ];

  for (const temporal of temporalKeywords) {
    if (fullText.includes(temporal)) {
      score += 3; // Small boost for temporal indicators
    }
  }

  return Math.max(0, score); // Ensure non-negative score
}

/**
 * Business rules validation for classification accuracy
 */
export function validateBusinessRules(
  accountName: string,
  accountDescription: string | undefined,
  classification: ClassificationRule
): { isValid: boolean; warnings: string[]; suggestions: string[] } {
  const fullText = `${accountName} ${accountDescription || ''}`.toLowerCase();
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let isValid = true;

  // === CRITICAL BUSINESS VALIDATION RULES ===

  // 1. Asset/Liability contradiction check
  if (classification.statement === 'assets' && 
      (fullText.includes('payable') || fullText.includes('loan payable') || fullText.includes('creditor'))) {
    isValid = false;
    warnings.push('Account name suggests liability but classified as asset');
    suggestions.push('Consider reclassifying as liability');
  }

  if (classification.statement === 'liabilities' && 
      (fullText.includes('receivable') || fullText.includes('debtor') || fullText.includes('cash') || fullText.includes('bank account'))) {
    isValid = false;
    warnings.push('Account name suggests asset but classified as liability');
    suggestions.push('Consider reclassifying as asset');
  }

  // 2. Revenue/Expense contradiction check
  if (classification.statement === 'revenue' && 
      (fullText.includes('expense') || fullText.includes('cost') || fullText.includes('paid'))) {
    isValid = false;
    warnings.push('Account name suggests expense but classified as revenue');
    suggestions.push('Consider reclassifying as expense');
  }

  if (classification.statement === 'expenses' && 
      (fullText.includes('income') || fullText.includes('revenue') || fullText.includes('earned'))) {
    isValid = false;
    warnings.push('Account name suggests revenue but classified as expense');
    suggestions.push('Consider reclassifying as revenue');
  }

  // 3. Current vs Non-Current asset/liability validation
  if (classification.lineItem?.includes('Current') && 
      (fullText.includes('fixed asset') || fullText.includes('long term') || fullText.includes('non-current'))) {
    warnings.push('Account may be non-current but classified as current');
    suggestions.push('Review current vs non-current classification');
  }

  // 4. Equity account validation
  if (classification.statement === 'equity') {
    if (fullText.includes('expense') || fullText.includes('revenue') || fullText.includes('receivable') || fullText.includes('payable')) {
      isValid = false;
      warnings.push('Account name does not appear to be equity');
      suggestions.push('Review statement classification');
    }
  }

  // 5. Cash flow statement implications
  const investingActivities = ['property', 'plant', 'equipment', 'investments', 'disposal'];
  const financingActivities = ['loans', 'borrowings', 'share capital', 'dividends', 'equity'];

  let activityType = 'operating';
  for (const activity of investingActivities) {
    if (fullText.includes(activity)) {
      activityType = 'investing';
      break;
    }
  }
  for (const activity of financingActivities) {
    if (fullText.includes(activity)) {
      activityType = 'financing';
      break;
    }
  }

  suggestions.push(`Likely cash flow category: ${activityType} activities`);

  // 6. Tax compliance considerations
  if (fullText.includes('vat') || fullText.includes('tax')) {
    suggestions.push('Ensure tax treatment compliance and proper VAT handling');
  }

  // 7. Audit trail requirements
  if (fullText.includes('related party') || fullText.includes('director') || fullText.includes('shareholder')) {
    suggestions.push('Related party transaction - ensure proper disclosure');
  }

  return { isValid, warnings, suggestions };
}

/**
 * Advanced automation engine with context-aware classification
 */
export class AutomationEngine {
  private classifications: AccountClassification[];

  constructor(customClassifications?: AccountClassification[]) {
    this.classifications = customClassifications || [...DEFAULT_ACCOUNT_CLASSIFICATIONS];
  }

  /**
   * Enhanced mapping suggestions with context-aware analysis
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

    accounts.forEach(account => {
      const suggestion = this.classifyAccount(account);
      if (suggestion && suggestion.confidence >= options.confidenceThreshold) {
        suggestions.push(suggestion);
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Enhanced account classification with context analysis
   */
  private classifyAccount(
    account: TrialBalanceAccount
  ): MappingSuggestion | null {
    const accountText = `${account.accountName} ${account.accountId}`.toLowerCase();
    let bestMatch: { classification: AccountClassification; confidence: number; reason: string } | null = null;

    // Sort classifications by priority (higher first) for better matching
    const sortedClassifications = this.classifications.sort((a, b) => b.priority - a.priority);

    for (const classification of sortedClassifications) {
      const matchResult = this.analyzeAccountMatch(accountText, classification, account);
      
      if (matchResult.confidence > (bestMatch?.confidence || 0)) {
        bestMatch = {
          classification,
          confidence: matchResult.confidence,
          reason: matchResult.reason
        };
      }

      // If we have a very high confidence match, stop looking
      if (matchResult.confidence >= 95) {
        break;
      }
    }

    if (!bestMatch || bestMatch.confidence < 30) {
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
   * Enhanced account matching with context awareness
   */
  private analyzeAccountMatch(
    accountText: string,
    classification: AccountClassification,
    account: TrialBalanceAccount
  ): { confidence: number; reason: string } {
    let confidence = 0;
    const matchReasons: string[] = [];

    // 1. Pattern matching (highest priority - up to 70 points)
    for (const pattern of classification.patterns) {
      if (pattern.test(accountText)) {
        confidence += 70;
        matchReasons.push(`pattern match: ${pattern.source}`);
        break; // Only count the first pattern match
      }
    }

    // 2. Keyword matching with context (up to 50 points)
    const keywordMatches = classification.keywords.filter(keyword => 
      accountText.includes(keyword.toLowerCase())
    );
    
    if (keywordMatches.length > 0) {
      // Higher confidence for multiple keyword matches
      confidence += Math.min(50, keywordMatches.length * 15);
      matchReasons.push(`keywords: ${keywordMatches.join(', ')}`);
    }

    // 3. Account code matching (up to 30 points)
    if (classification.accountCodes) {
      for (const code of classification.accountCodes) {
        if (account.accountId.startsWith(code)) {
          confidence += 30;
          matchReasons.push(`account code: ${code}`);
          break;
        }
      }
    }

    // 4. Context-aware adjustments based on your feedback
    confidence = this.applyContextualAdjustments(accountText, classification, confidence, matchReasons);

    // 5. Balance-based hints (small boost)
    if (classification.statement === 'assets' && account.debit > account.credit) {
      confidence += 5;
    } else if ((classification.statement === 'liabilities' || classification.statement === 'equity' || classification.statement === 'revenue') && account.credit > account.debit) {
      confidence += 5;
    } else if (classification.statement === 'expenses' && account.debit > account.credit) {
      confidence += 5;
    }

    return {
      confidence: Math.min(100, Math.max(0, confidence)),
      reason: matchReasons.length > 0 ? matchReasons.join('; ') : 'low confidence match'
    };
  }

  /**
   * Apply contextual adjustments based on your specific feedback
   */
  private applyContextualAdjustments(
    accountText: string,
    classification: AccountClassification,
    baseConfidence: number,
    matchReasons: string[]
  ): number {
    let adjustedConfidence = baseConfidence;

    // Rule: "Equity Bank Loan" should be a loan, not a bank account
    if (classification.id === 'cash-bank' && /equity\s*bank\s*(loan|borrowing|credit)/i.test(accountText)) {
      adjustedConfidence = 0; // Completely reject this classification
      matchReasons.push('rejected: equity bank loan is not a bank account');
    }

    // Rule: Vehicle + Expense = Expense (not asset)
    if (classification.statement === 'assets' && /vehicle.*expense/i.test(accountText)) {
      adjustedConfidence = 0;
      matchReasons.push('rejected: vehicle expenses are not assets');
    }

    // Rule: Repairs and Maintenance = Expenses (not assets)
    if (classification.statement === 'assets' && /repair|maintenance/i.test(accountText)) {
      adjustedConfidence = 0;
      matchReasons.push('rejected: repairs and maintenance are expenses');
    }

    // Rule: Bank Charges = Admin Expenses
    if (classification.id === 'admin-expenses' && /bank\s*(charges?|fees?)/i.test(accountText)) {
      adjustedConfidence += 20; // Boost confidence
      matchReasons.push('boosted: bank charges are admin expenses');
    }

    // Rule: MOMO Charges = Admin Expenses
    if (classification.id === 'admin-expenses' && /momo\s*(charges?|fees?)/i.test(accountText)) {
      adjustedConfidence += 20;
      matchReasons.push('boosted: momo charges are admin expenses');
    }

    // Rule: Cost of Sales context awareness
    if (classification.id === 'cost-of-sales' && /cost\s*of\s*sales/i.test(accountText)) {
      adjustedConfidence += 25;
      matchReasons.push('boosted: strong cost of sales indicator');
    }

    // Rule: Selling context awareness
    if (classification.id === 'selling-expenses' && /selling/i.test(accountText)) {
      adjustedConfidence += 20;
      matchReasons.push('boosted: selling indicates selling expenses');
    }

    // Rule: Non-operating income/expenses
    if (/non[-\s]*operating/i.test(accountText)) {
      if (classification.id === 'other-income' && /income/i.test(accountText)) {
        adjustedConfidence += 25;
        matchReasons.push('boosted: non-operating income');
      } else if (classification.id === 'other-expenses' && /expense/i.test(accountText)) {
        adjustedConfidence += 25;
        matchReasons.push('boosted: non-operating expenses');
      }
    }

    // Rule: Expense + word "expense" = definitely an expense
    if (classification.statement !== 'expenses' && /\bexpense/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 30);
      matchReasons.push('reduced: contains "expense" but not classified as expense');
    }

    // Rule: Income/Revenue context
    if (classification.statement !== 'revenue' && /\b(income|revenue)\b/i.test(accountText) && !/expense/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 20);
      matchReasons.push('reduced: contains "income/revenue" but not classified as revenue');
    }

    // Rule: Payable = Liability
    if (classification.statement !== 'liabilities' && /\bpayable/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 25);
      matchReasons.push('reduced: contains "payable" but not classified as liability');
    }

    // Rule: Receivable = Asset
    if (classification.statement !== 'assets' && /\breceivable/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 25);
      matchReasons.push('reduced: contains "receivable" but not classified as asset');
    }

    // Rule: Accumulated/Provision = often contra-accounts or liabilities
    if (classification.statement === 'assets' && /^(accumulated|provision)\s/i.test(accountText) && !/depreciation/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 20);
      matchReasons.push('reduced: accumulated/provision accounts are often contra-assets or liabilities');
    }

    // Rule: Insurance/Rent + no "payable" = likely expense
    if (classification.statement !== 'expenses' && /(insurance|rent)/i.test(accountText) && !/payable/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 15);
      matchReasons.push('reduced: insurance/rent without "payable" are likely expenses');
    }

    // Rule: Professional/Legal/Audit fees = expenses
    if (classification.statement !== 'expenses' && /(professional|legal|audit|consulting)\s*(fees?|costs?)/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 25);
      matchReasons.push('reduced: professional fees are expenses');
    }

    // Rule: Travel/Entertainment/Meals = expenses
    if (classification.statement !== 'expenses' && /(travel|entertainment|meals?)/i.test(accountText) && !/payable/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 20);
      matchReasons.push('reduced: travel/entertainment are typically expenses');
    }

    // Rule: Interest + Income = Revenue, Interest + Expense/Paid = Expense
    if (/interest/i.test(accountText)) {
      if (classification.statement === 'revenue' && /income|received/i.test(accountText)) {
        adjustedConfidence += 15;
        matchReasons.push('boosted: interest income is revenue');
      } else if (classification.statement === 'expenses' && /(expense|paid|cost)/i.test(accountText)) {
        adjustedConfidence += 15;
        matchReasons.push('boosted: interest expense is an expense');
      }
    }

    // Rule: Utilities/Electricity/Water without "payable" = expenses
    if (classification.statement !== 'expenses' && /(utilities?|electricity|water|power|telephone|internet)/i.test(accountText) && !/payable/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 20);
      matchReasons.push('reduced: utilities without "payable" are expenses');
    }

    // Rule: Salaries/Wages without "payable" = expenses
    if (classification.statement !== 'expenses' && /(salaries?|wages?|payroll)/i.test(accountText) && !/payable/i.test(accountText)) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 25);
      matchReasons.push('reduced: salaries/wages without "payable" are expenses');
    }

    // Rule: Bad debts/Doubtful debts = always expenses
    if (classification.statement !== 'expenses' && /(bad|doubtful)\s*debts?/i.test(accountText)) {
      adjustedConfidence = 0;
      matchReasons.push('rejected: bad/doubtful debts are always expenses');
    }

    // Rule: Prepaid + anything = asset
    if (classification.statement === 'assets' && /^prepaid/i.test(accountText)) {
      adjustedConfidence += 20;
      matchReasons.push('boosted: prepaid items are assets');
    }

    // Rule: Accrued + expense/liability context
    if (/^accrued/i.test(accountText)) {
      if (classification.statement === 'liabilities' && /(expense|liability|payable)/i.test(accountText)) {
        adjustedConfidence += 20;
        matchReasons.push('boosted: accrued expenses are liabilities');
      } else if (classification.statement === 'assets' && /(income|receivable|revenue)/i.test(accountText)) {
        adjustedConfidence += 20;
        matchReasons.push('boosted: accrued income is an asset');
      }
    }

    // Rule: Deposits context awareness
    if (/deposits?/i.test(accountText)) {
      if (classification.statement === 'liabilities' && /(received|customer|advance)/i.test(accountText)) {
        adjustedConfidence += 15;
        matchReasons.push('boosted: deposits received are liabilities');
      } else if (classification.statement === 'assets' && /(paid|security|refundable)/i.test(accountText)) {
        adjustedConfidence += 15;
        matchReasons.push('boosted: deposits paid are assets');
      }
    }

    // Rule: Reserves/Capital = Equity
    if (classification.statement === 'equity' && /(reserves?|capital)/i.test(accountText) && !/working/i.test(accountText)) {
      adjustedConfidence += 15;
      matchReasons.push('boosted: reserves and capital are equity');
    }

    // Rule: Contra-asset patterns (accumulated depreciation)
    if (classification.statement === 'assets' && /accumulated\s*(depreciation|amortisation)/i.test(accountText)) {
      adjustedConfidence += 25;
      matchReasons.push('boosted: accumulated depreciation is a contra-asset');
    }

    // Rule: Tax context - distinguish income tax from VAT
    if (/tax/i.test(accountText)) {
      if (classification.id === 'income-tax-expenses' && /income.*tax/i.test(accountText)) {
        adjustedConfidence += 20;
        matchReasons.push('boosted: income tax is an expense');
      } else if (classification.id === 'vat-liabilities' && /vat|value.*added/i.test(accountText)) {
        adjustedConfidence += 20;
        matchReasons.push('boosted: VAT is a liability');
      }
    }

    // Rule: Forex/Exchange = typically other expenses (unless gain specified)
    if (/(forex|exchange|currency)/i.test(accountText)) {
      if (classification.statement === 'expenses' && !/(gain|income)/i.test(accountText)) {
        adjustedConfidence += 15;
        matchReasons.push('boosted: forex items are typically expenses unless gains');
      } else if (classification.statement === 'revenue' && /gain/i.test(accountText)) {
        adjustedConfidence += 15;
        matchReasons.push('boosted: forex gains are revenue');
      }
    }

    return adjustedConfidence;
  }

  /**
   * Add a custom classification
   */
  addClassification(classification: AccountClassification): void {
    // Remove existing classification with same ID
    this.classifications = this.classifications.filter(c => c.id !== classification.id);
    this.classifications.push(classification);
  }

  /**
   * Remove a classification
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

// Classification rule and feedback types
export type ClassificationRule = AccountClassification;
export type ClassificationFeedback = {
  corrections?: {
    accountPattern: string;
    correctStatement: keyof MappedTrialBalance;
    correctLineItem: string;
  }[];
};

// Apply contextual adjustments based on account name and description
export function applyContextualAdjustments(
  rule: ClassificationRule,
  accountName: string,
  accountDescription: string | undefined,
  feedback: ClassificationFeedback
): ClassificationRule {
  const adjustedRule = { ...rule };
  const fullText = `${accountName} ${accountDescription || ''}`.toLowerCase();

  // === CONTEXT-AWARE ADJUSTMENT LOGIC ===

  // 1. Bank-related accounts - distinguish between bank assets vs bank loan liabilities
  if (fullText.includes('bank')) {
    if (fullText.includes('loan') || fullText.includes('borrowing') || fullText.includes('credit') || fullText.includes('overdraft')) {
      // This is a bank loan (liability), not a bank account (asset)
      adjustedRule.statement = 'liabilities';
      adjustedRule.lineItem = 'Other Non-Current Liabilities';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Bank loan or borrowing facility';
    } else if (fullText.includes('account') || fullText.includes('deposit') || fullText.includes('current') || fullText.includes('savings')) {
      // This is a bank account (asset)
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Cash and Cash Equivalents';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Bank account or cash deposit';
    }
  }

  // 2. Expense vs Asset distinction (critical for proper classification)
  if (fullText.includes('expense') || fullText.includes('cost') || fullText.includes('charges') || fullText.includes('fees')) {
    // Override to ensure this is an expense, not an asset
    if (adjustedRule.statement !== 'expenses') {
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Other Operating Expenses';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Operating expense';
    }
  }

  // 3. Payable vs Receivable distinction
  if (fullText.includes('payable') || fullText.includes('creditor') || fullText.includes('owing') || fullText.includes('owed to')) {
    // This is a liability
    adjustedRule.statement = 'liabilities';
    adjustedRule.lineItem = 'Other Current Liabilities';
    adjustedRule.priority = 95;
    adjustedRule.description = 'Amount owed to creditors';
  } else if (fullText.includes('receivable') || fullText.includes('debtor') || fullText.includes('owed by') || fullText.includes('due from')) {
    // This is an asset
    adjustedRule.statement = 'assets';
    adjustedRule.lineItem = 'Other Current Assets';
    adjustedRule.priority = 95;
    adjustedRule.description = 'Amount owed by debtors';
  }

  // 4. Interest income vs interest expense
  if (fullText.includes('interest')) {
    if (fullText.includes('income') || fullText.includes('earned') || fullText.includes('revenue') || fullText.includes('receivable')) {
      adjustedRule.statement = 'revenue';
      adjustedRule.lineItem = 'Interest Income';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Interest income earned';
    } else if (fullText.includes('expense') || fullText.includes('paid') || fullText.includes('cost') || fullText.includes('payable')) {
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Interest Expenses';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Interest expense paid';
    }
  }

  // 5. Prepaid items (assets) vs accrued items (liabilities)
  if (fullText.includes('prepaid') || fullText.includes('prepayment') || fullText.includes('advance paid') || fullText.includes('deposit paid')) {
    adjustedRule.statement = 'assets';
    adjustedRule.lineItem = 'Other Current Assets';
    adjustedRule.priority = 95;
    adjustedRule.description = 'Prepaid expense or advance payment';
  } else if (fullText.includes('accrued') || fullText.includes('accrual') || fullText.includes('owing') || fullText.includes('unpaid')) {
    adjustedRule.statement = 'liabilities';
    adjustedRule.lineItem = 'Other Current Liabilities';
    adjustedRule.priority = 95;
    adjustedRule.description = 'Accrued expense or liability';
  }

  // 6. Customer vs supplier distinction for deposits and advances
  if (fullText.includes('customer') || fullText.includes('client')) {
    if (fullText.includes('deposit') || fullText.includes('advance') || fullText.includes('prepayment')) {
      // Customer deposits are liabilities (unearned revenue)
      adjustedRule.statement = 'liabilities';
      adjustedRule.lineItem = 'Other Current Liabilities';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Customer deposits and advances received';
    } else if (fullText.includes('receivable') || fullText.includes('owing') || fullText.includes('due from')) {
      // Customer receivables are assets
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Trade Receivables';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Trade receivables from customers';
    }
  } else if (fullText.includes('supplier') || fullText.includes('vendor')) {
    if (fullText.includes('deposit') || fullText.includes('advance') || fullText.includes('prepayment')) {
      // Supplier advances are assets
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Other Current Assets';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Advances paid to suppliers';
    } else if (fullText.includes('payable') || fullText.includes('creditor') || fullText.includes('owing')) {
      // Supplier payables are liabilities
      adjustedRule.statement = 'liabilities';
      adjustedRule.lineItem = 'Trade Payables';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Trade payables to suppliers';
    }
  }

  // 7. Tax-related accounts classification
  if (fullText.includes('vat') || fullText.includes('value added tax') || fullText.includes('sales tax')) {
    if (fullText.includes('input') || fullText.includes('receivable') || fullText.includes('refund')) {
      // Input VAT is an asset
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Other Current Assets';
      adjustedRule.priority = 95;
      adjustedRule.description = 'VAT receivable or input VAT';
    } else if (fullText.includes('output') || fullText.includes('payable') || fullText.includes('owing')) {
      // Output VAT is a liability
      adjustedRule.statement = 'liabilities';
      adjustedRule.lineItem = 'Other Current Liabilities';
      adjustedRule.priority = 95;
      adjustedRule.description = 'VAT payable or output VAT';
    }
  }

  // 8. Income tax classification
  if (fullText.includes('income tax') || fullText.includes('corporate tax') || fullText.includes('tax expense')) {
    if (fullText.includes('receivable') || fullText.includes('refund') || fullText.includes('overpaid')) {
      // Tax refund is an asset
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Other Current Assets';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Income tax receivable or refund';
    } else if (fullText.includes('payable') || fullText.includes('owing') || fullText.includes('provision')) {
      // Tax payable is a liability
      adjustedRule.statement = 'liabilities';
      adjustedRule.lineItem = 'Other Current Liabilities';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Income tax payable or provision';
    } else if (fullText.includes('expense') || fullText.includes('current') || fullText.includes('deferred')) {
      // Tax expense is an expense
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Income Tax Expenses';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Income tax expense';
    }
  }

  // 9. Staff/Employee related accounts
  if (fullText.includes('staff') || fullText.includes('employee')) {
    if (fullText.includes('advance') || fullText.includes('loan') || fullText.includes('receivable')) {
      // Staff advances are assets
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Other Current Assets';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Staff advances and loans';
    } else if (fullText.includes('payable') || fullText.includes('salary') || fullText.includes('wage') || fullText.includes('deduction')) {
      // Staff payables are liabilities
      adjustedRule.statement = 'liabilities';
      adjustedRule.lineItem = 'Other Current Liabilities';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Staff salaries and deductions payable';
    } else if (fullText.includes('cost') || fullText.includes('expense') || fullText.includes('benefit')) {
      // Staff costs are expenses
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Employee Benefits';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Staff costs and employee benefits';
    }
  }

  // 10. Vehicle classification - distinguish vehicle assets vs vehicle expenses
  if (fullText.includes('vehicle') || fullText.includes('motor') || fullText.includes('car')) {
    if (fullText.includes('expense') || fullText.includes('cost') || fullText.includes('running') || 
        fullText.includes('fuel') || fullText.includes('maintenance') || fullText.includes('repair') || 
        fullText.includes('insurance') || fullText.includes('service')) {
      // Vehicle expenses
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Other Operating Expenses';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Vehicle running costs and expenses';
    } else if (!fullText.includes('expense') && !fullText.includes('cost')) {
      // Vehicle assets (only if not explicitly mentioned as expense)
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Property, Plant and Equipment';
      adjustedRule.priority = 90;
      adjustedRule.description = 'Motor vehicles and transport equipment';
    }
  }

  // 11. Repairs and maintenance - these are always expenses, never assets
  if (fullText.includes('repair') || fullText.includes('maintenance')) {
    if (!fullText.includes('prepaid')) { // Unless it's prepaid repairs (asset)
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Other Operating Expenses';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Repairs and maintenance expenses';
    }
  }

  // 12. Professional services distinction
  if (fullText.includes('professional') || fullText.includes('consulting') || fullText.includes('legal') || fullText.includes('audit')) {
    if (fullText.includes('fee') || fullText.includes('expense') || fullText.includes('cost') || fullText.includes('paid')) {
      // Professional fees are expenses
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Administrative Expenses';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Professional fees and consulting expenses';
    } else if (fullText.includes('income') || fullText.includes('revenue') || fullText.includes('earned')) {
      // Professional income is revenue
      adjustedRule.statement = 'revenue';
      adjustedRule.lineItem = 'Revenue from Services';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Professional fees and consulting income';
    }
  }

  // 13. Communication and utilities - always expenses
  if (fullText.includes('telephone') || fullText.includes('phone') || fullText.includes('internet') || 
      fullText.includes('electricity') || fullText.includes('water') || fullText.includes('gas') || 
      fullText.includes('utility') || fullText.includes('communication')) {
    adjustedRule.statement = 'expenses';
    adjustedRule.lineItem = 'Administrative Expenses';
    adjustedRule.priority = 95;
    adjustedRule.description = 'Utilities and communication expenses';
  }

  // 14. Insurance classification
  if (fullText.includes('insurance')) {
    if (fullText.includes('prepaid')) {
      // Prepaid insurance is an asset
      adjustedRule.statement = 'assets';
      adjustedRule.lineItem = 'Other Current Assets';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Prepaid insurance premiums';
    } else if (fullText.includes('expense') || fullText.includes('premium') || fullText.includes('cost')) {
      // Insurance expenses
      adjustedRule.statement = 'expenses';
      adjustedRule.lineItem = 'Administrative Expenses';
      adjustedRule.priority = 95;
      adjustedRule.description = 'Insurance premiums and expenses';
    }
  }

  // 15. Apply user feedback for continuous learning
  if (feedback.corrections && feedback.corrections.length > 0) {
    for (const correction of feedback.corrections) {
      if (accountName.toLowerCase().includes(correction.accountPattern.toLowerCase())) {
        // Apply user correction
        adjustedRule.statement = correction.correctStatement;
        adjustedRule.lineItem = correction.correctLineItem;
        adjustedRule.priority = 98; // High priority for user-corrected rules
        adjustedRule.description = `User-corrected: ${correction.correctLineItem}`;
        break;
      }
    }
  }
  
  return adjustedRule;
}
