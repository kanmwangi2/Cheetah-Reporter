import type { TrialBalanceAccount, MappedTrialBalance } from '../types/project';

export interface StatementLineItem {
  id: string;
  code: string;
  name: string;
  value: number;
  accounts: TrialBalanceAccount[];
  subItems?: StatementLineItem[];
  level: number;
  section: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
  statementType: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'equity_changes';
  required: boolean;
  calculationFormula?: string;
}

export interface PopulatedStatements {
  balanceSheet: {
    assets: StatementLineItem[];
    liabilities: StatementLineItem[];
    equity: StatementLineItem[];
    totals: {
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
    };
  };
  incomeStatement: {
    revenue: StatementLineItem[];
    expenses: StatementLineItem[];
    totals: {
      totalRevenue: number;
      totalExpenses: number;
      netIncome: number;
      grossProfit?: number;
      operatingProfit?: number;
      profitBeforeTax?: number;
    };
  };
  equityChanges: {
    movements: StatementLineItem[];
    totals: {
      openingBalance: number;
      movements: number;
      closingBalance: number;
    };
  };
}

export interface PopulationOptions {
  ifrsStandard: 'full' | 'sme';
  currency: string;
  roundingPrecision: number;
  includeZeroBalances: boolean;
  aggregateSmallBalances: boolean;
  smallBalanceThreshold: number;
}

// IFRS Statement Structure Templates
const getBalanceSheetStructure = (standard: 'full' | 'sme'): Omit<StatementLineItem, 'value' | 'accounts'>[] => [
  // ASSETS
  {
    id: 'assets',
    code: 'A',
    name: 'ASSETS',
    level: 0,
    section: 'assets',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'current_assets',
    code: 'A.1',
    name: 'Current Assets',
    level: 1,
    section: 'assets',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'cash_and_cash_equivalents',
    code: 'A.1.1',
    name: 'Cash and Cash Equivalents',
    level: 2,
    section: 'assets',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'trade_and_other_receivables',
    code: 'A.1.2',
    name: 'Trade and Other Receivables',
    level: 2,
    section: 'assets',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'inventories',
    code: 'A.1.3',
    name: 'Inventories',
    level: 2,
    section: 'assets',
    statementType: 'balance_sheet',
    required: false
  },
  {
    id: 'prepayments',
    code: 'A.1.4',
    name: 'Prepayments and Other Current Assets',
    level: 2,
    section: 'assets',
    statementType: 'balance_sheet',
    required: false
  },
  {
    id: 'non_current_assets',
    code: 'A.2',
    name: 'Non-current Assets',
    level: 1,
    section: 'assets',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'property_plant_equipment',
    code: 'A.2.1',
    name: 'Property, Plant and Equipment',
    level: 2,
    section: 'assets',
    statementType: 'balance_sheet',
    required: false
  },
  {
    id: 'intangible_assets',
    code: 'A.2.2',
    name: 'Intangible Assets',
    level: 2,
    section: 'assets',
    statementType: 'balance_sheet',
    required: standard === 'full'
  },
  {
    id: 'investments',
    code: 'A.2.3',
    name: 'Investments',
    level: 2,
    section: 'assets',
    statementType: 'balance_sheet',
    required: false
  },
  
  // LIABILITIES
  {
    id: 'liabilities',
    code: 'L',
    name: 'LIABILITIES',
    level: 0,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'current_liabilities',
    code: 'L.1',
    name: 'Current Liabilities',
    level: 1,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'trade_and_other_payables',
    code: 'L.1.1',
    name: 'Trade and Other Payables',
    level: 2,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'borrowings_current',
    code: 'L.1.2',
    name: 'Current Portion of Borrowings',
    level: 2,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: false
  },
  {
    id: 'provisions_current',
    code: 'L.1.3',
    name: 'Current Provisions',
    level: 2,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: false
  },
  {
    id: 'non_current_liabilities',
    code: 'L.2',
    name: 'Non-current Liabilities',
    level: 1,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'borrowings_non_current',
    code: 'L.2.1',
    name: 'Non-current Borrowings',
    level: 2,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: false
  },
  {
    id: 'provisions_non_current',
    code: 'L.2.2',
    name: 'Non-current Provisions',
    level: 2,
    section: 'liabilities',
    statementType: 'balance_sheet',
    required: false
  },
  
  // EQUITY
  {
    id: 'equity',
    code: 'E',
    name: 'EQUITY',
    level: 0,
    section: 'equity',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'issued_capital',
    code: 'E.1',
    name: 'Issued Capital',
    level: 1,
    section: 'equity',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'retained_earnings',
    code: 'E.2',
    name: 'Retained Earnings',
    level: 1,
    section: 'equity',
    statementType: 'balance_sheet',
    required: true
  },
  {
    id: 'other_reserves',
    code: 'E.3',
    name: 'Other Reserves',
    level: 1,
    section: 'equity',
    statementType: 'balance_sheet',
    required: false
  }
];

const getIncomeStatementStructure = (): Omit<StatementLineItem, 'value' | 'accounts'>[] => [
  // REVENUE
  {
    id: 'revenue',
    code: 'R.1',
    name: 'Revenue',
    level: 0,
    section: 'revenue',
    statementType: 'income_statement',
    required: true
  },
  {
    id: 'other_income',
    code: 'R.2',
    name: 'Other Income',
    level: 0,
    section: 'revenue',
    statementType: 'income_statement',
    required: false
  },
  
  // EXPENSES
  {
    id: 'cost_of_sales',
    code: 'E.1',
    name: 'Cost of Sales',
    level: 0,
    section: 'expenses',
    statementType: 'income_statement',
    required: false
  },
  {
    id: 'administrative_expenses',
    code: 'E.2',
    name: 'Administrative Expenses',
    level: 0,
    section: 'expenses',
    statementType: 'income_statement',
    required: true
  },
  {
    id: 'selling_expenses',
    code: 'E.3',
    name: 'Selling and Distribution Expenses',
    level: 0,
    section: 'expenses',
    statementType: 'income_statement',
    required: false
  },
  {
    id: 'depreciation_amortisation',
    code: 'E.4',
    name: 'Depreciation and Amortisation',
    level: 0,
    section: 'expenses',
    statementType: 'income_statement',
    required: false
  },
  {
    id: 'finance_costs',
    code: 'E.5',
    name: 'Finance Costs',
    level: 0,
    section: 'expenses',
    statementType: 'income_statement',
    required: false
  },
  {
    id: 'other_expenses',
    code: 'E.6',
    name: 'Other Expenses',
    level: 0,
    section: 'expenses',
    statementType: 'income_statement',
    required: false
  },
  {
    id: 'income_tax_expense',
    code: 'E.7',
    name: 'Income Tax Expense',
    level: 0,
    section: 'expenses',
    statementType: 'income_statement',
    required: false
  }
];

/**
 * Calculate account balance based on normal balance type
 */
function calculateAccountBalance(account: TrialBalanceAccount, section: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'): number {
  const debit = account.debit || 0;
  const credit = account.credit || 0;
  
  // Asset and expense accounts have normal debit balances
  if (section === 'assets' || section === 'expenses') {
    return debit - credit;
  }
  
  // Liability, equity, and revenue accounts have normal credit balances
  return credit - debit;
}

/**
 * Aggregate accounts into statement line items
 */
function populateLineItem(
  lineItemTemplate: Omit<StatementLineItem, 'value' | 'accounts'>,
  mappedTrialBalance: MappedTrialBalance,
  options: PopulationOptions
): StatementLineItem {
  const mappedAccounts = mappedTrialBalance[lineItemTemplate.section]?.[lineItemTemplate.id] || [];
  
  // Calculate total value for this line item
  const totalValue = mappedAccounts.reduce((sum, account) => {
    const balance = calculateAccountBalance(account, lineItemTemplate.section);
    return sum + balance;
  }, 0);
  
  // Round according to precision settings
  const roundedValue = Math.round(totalValue / options.roundingPrecision) * options.roundingPrecision;
  
  return {
    ...lineItemTemplate,
    value: roundedValue,
    accounts: mappedAccounts
  };
}

/**
 * Calculate derived totals and subtotals
 */
function calculateDerivedTotals(statements: PopulatedStatements): PopulatedStatements {
  // Balance Sheet totals
  const totalAssets = statements.balanceSheet.assets.reduce((sum, item) => sum + item.value, 0);
  const totalLiabilities = statements.balanceSheet.liabilities.reduce((sum, item) => sum + item.value, 0);
  const totalEquity = statements.balanceSheet.equity.reduce((sum, item) => sum + item.value, 0);
  
  // Income Statement totals
  const totalRevenue = statements.incomeStatement.revenue.reduce((sum, item) => sum + item.value, 0);
  const totalExpenses = statements.incomeStatement.expenses.reduce((sum, item) => sum + item.value, 0);
  const netIncome = totalRevenue - totalExpenses;
  
  // Calculate additional P&L subtotals
  const costOfSales = statements.incomeStatement.expenses.find(item => item.id === 'cost_of_sales')?.value || 0;
  const grossProfit = totalRevenue - costOfSales;
  
  const operatingExpenses = statements.incomeStatement.expenses
    .filter(item => ['administrative_expenses', 'selling_expenses', 'depreciation_amortisation'].includes(item.id))
    .reduce((sum, item) => sum + item.value, 0);
  const operatingProfit = grossProfit - operatingExpenses;
  
  const financeCosts = statements.incomeStatement.expenses.find(item => item.id === 'finance_costs')?.value || 0;
  const profitBeforeTax = operatingProfit - financeCosts;
  
  return {
    ...statements,
    balanceSheet: {
      ...statements.balanceSheet,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity
      }
    },
    incomeStatement: {
      ...statements.incomeStatement,
      totals: {
        totalRevenue,
        totalExpenses,
        netIncome,
        grossProfit,
        operatingProfit,
        profitBeforeTax
      }
    }
  };
}

/**
 * Filter line items based on options
 */
function filterLineItems(lineItems: StatementLineItem[], options: PopulationOptions): StatementLineItem[] {
  return lineItems.filter(item => {
    // Always include required items
    if (item.required) return true;
    
    // Include items with non-zero balances if option is set
    if (!options.includeZeroBalances && item.value === 0) return false;
    
    // Aggregate small balances if option is set
    if (options.aggregateSmallBalances && Math.abs(item.value) < options.smallBalanceThreshold) {
      return false;
    }
    
    return true;
  });
}

/**
 * Create aggregated line item for small balances
 */
function createAggregatedLineItem(
  filteredItems: StatementLineItem[],
  section: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses',
  statementType: 'balance_sheet' | 'income_statement'
): StatementLineItem | null {
  if (filteredItems.length === 0) return null;
  
  const totalValue = filteredItems.reduce((sum, item) => sum + item.value, 0);
  const allAccounts = filteredItems.flatMap(item => item.accounts);
  
  return {
    id: `other_${section}`,
    code: 'OTHER',
    name: `Other ${section.charAt(0).toUpperCase() + section.slice(1)}`,
    value: totalValue,
    accounts: allAccounts,
    level: 1,
    section,
    statementType,
    required: false
  };
}

/**
 * Main function to populate financial statements from mapped trial balance
 */
export function populateFinancialStatements(
  mappedTrialBalance: MappedTrialBalance,
  options: PopulationOptions = {
    ifrsStandard: 'full',
    currency: 'RWF',
    roundingPrecision: 1,
    includeZeroBalances: false,
    aggregateSmallBalances: true,
    smallBalanceThreshold: 10000
  }
): PopulatedStatements {
  // Get statement structures
  const balanceSheetStructure = getBalanceSheetStructure(options.ifrsStandard);
  const incomeStatementStructure = getIncomeStatementStructure();
  
  // Populate Balance Sheet
  const allBalanceSheetItems = balanceSheetStructure.map(template => 
    populateLineItem(template, mappedTrialBalance, options)
  );
  
  // Separate by section
  const assets = filterLineItems(
    allBalanceSheetItems.filter(item => item.section === 'assets'),
    options
  );
  const liabilities = filterLineItems(
    allBalanceSheetItems.filter(item => item.section === 'liabilities'),
    options
  );
  const equity = filterLineItems(
    allBalanceSheetItems.filter(item => item.section === 'equity'),
    options
  );
  
  // Populate Income Statement
  const allIncomeStatementItems = incomeStatementStructure.map(template =>
    populateLineItem(template, mappedTrialBalance, options)
  );
  
  const revenue = filterLineItems(
    allIncomeStatementItems.filter(item => item.section === 'revenue'),
    options
  );
  const expenses = filterLineItems(
    allIncomeStatementItems.filter(item => item.section === 'expenses'),
    options
  );
  
  // Create aggregated items for small balances if needed
  if (options.aggregateSmallBalances) {
    const smallAssets = allBalanceSheetItems.filter(item => 
      item.section === 'assets' && 
      !item.required && 
      Math.abs(item.value) < options.smallBalanceThreshold &&
      item.value !== 0
    );
    if (smallAssets.length > 0) {
      const aggregatedAssets = createAggregatedLineItem(smallAssets, 'assets', 'balance_sheet');
      if (aggregatedAssets) assets.push(aggregatedAssets);
    }
    
    // Similar for other sections...
  }
  
  const populatedStatements: PopulatedStatements = {
    balanceSheet: {
      assets,
      liabilities,
      equity,
      totals: { totalAssets: 0, totalLiabilities: 0, totalEquity: 0 }
    },
    incomeStatement: {
      revenue,
      expenses,
      totals: { totalRevenue: 0, totalExpenses: 0, netIncome: 0 }
    },
    equityChanges: {
      movements: [],
      totals: { openingBalance: 0, movements: 0, closingBalance: 0 }
    }
  };
  
  // Calculate derived totals
  return calculateDerivedTotals(populatedStatements);
}

/**
 * Validate statement population results
 */
export function validatePopulatedStatements(statements: PopulatedStatements): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check balance sheet equation
  const { totalAssets, totalLiabilities, totalEquity } = statements.balanceSheet.totals;
  const balanceDifference = Math.abs(totalAssets - (totalLiabilities + totalEquity));
  
  if (balanceDifference > 1) {
    errors.push(`Balance sheet does not balance: Assets (${totalAssets.toLocaleString()}) ≠ Liabilities + Equity (${(totalLiabilities + totalEquity).toLocaleString()})`);
  }
  
  // Check for negative balances where they shouldn't occur
  statements.balanceSheet.assets.forEach(item => {
    if (item.value < 0) {
      warnings.push(`Asset item "${item.name}" has negative balance: ${item.value.toLocaleString()}`);
    }
  });
  
  statements.balanceSheet.liabilities.forEach(item => {
    if (item.value < 0) {
      warnings.push(`Liability item "${item.name}" has negative balance: ${item.value.toLocaleString()}`);
    }
  });
  
  // Check for required items with zero balances
  const requiredItems = [
    ...statements.balanceSheet.assets,
    ...statements.balanceSheet.liabilities,
    ...statements.balanceSheet.equity,
    ...statements.incomeStatement.revenue,
    ...statements.incomeStatement.expenses
  ].filter(item => item.required && item.value === 0);
  
  if (requiredItems.length > 0) {
    warnings.push(`${requiredItems.length} required statement items have zero balances`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Update statements in real-time when mappings change
 */
export function updateStatementsFromMappingChange(
  _currentStatements: PopulatedStatements,
  mappedTrialBalance: MappedTrialBalance,
  _changedLineItemId: string,
  options: PopulationOptions
): PopulatedStatements {
  // For real-time updates, we could optimize by only recalculating affected items
  // For now, recalculate the entire statements for accuracy
  return populateFinancialStatements(mappedTrialBalance, options);
}

/**
 * Export statements to different formats
 */
export function exportStatements(
  statements: PopulatedStatements,
  format: 'json' | 'csv' | 'excel'
): string | Blob {
  switch (format) {
    case 'json':
      return JSON.stringify(statements, null, 2);
    
    case 'csv': {
      // Create CSV format for all statements
      let csv = 'Statement,Section,Code,Line Item,Amount,Accounts\n';
      
      // Balance Sheet
      statements.balanceSheet.assets.forEach(item => {
        csv += `Balance Sheet,Assets,${item.code},"${item.name}",${item.value},"${item.accounts.map(a => a.accountName).join('; ')}"\n`;
      });
      statements.balanceSheet.liabilities.forEach(item => {
        csv += `Balance Sheet,Liabilities,${item.code},"${item.name}",${item.value},"${item.accounts.map(a => a.accountName).join('; ')}"\n`;
      });
      statements.balanceSheet.equity.forEach(item => {
        csv += `Balance Sheet,Equity,${item.code},"${item.name}",${item.value},"${item.accounts.map(a => a.accountName).join('; ')}"\n`;
      });
      
      // Income Statement
      statements.incomeStatement.revenue.forEach(item => {
        csv += `Income Statement,Revenue,${item.code},"${item.name}",${item.value},"${item.accounts.map(a => a.accountName).join('; ')}"\n`;
      });
      statements.incomeStatement.expenses.forEach(item => {
        csv += `Income Statement,Expenses,${item.code},"${item.name}",${item.value},"${item.accounts.map(a => a.accountName).join('; ')}"\n`;
      });
      
      return csv;
    }
    
    case 'excel':
      // This would require a library like xlsx for proper Excel export
      throw new Error('Excel export not implemented yet');
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
