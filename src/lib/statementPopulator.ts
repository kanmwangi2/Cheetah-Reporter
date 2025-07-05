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
    };
  };
}

export interface PopulationOptions {
  includeZeroBalances: boolean;
  groupSimilarAccounts: boolean;
  roundingPrecision: number;
}

/**
 * Statement Populator for creating financial statements from mapped trial balance
 */
export class StatementPopulator {
  /**
   * Populate financial statements from mapped trial balance data
   */
  static populateFinancialStatements(
    mappedTrialBalance: MappedTrialBalance,
    options: PopulationOptions = {
      includeZeroBalances: false,
      groupSimilarAccounts: true,
      roundingPrecision: 2
    }
  ): PopulatedStatements {
    
    // Calculate asset line items
    const assetItems = this.createAssetLineItems(mappedTrialBalance.assets, options);
    
    // Calculate liability line items
    const liabilityItems = this.createLiabilityLineItems(mappedTrialBalance.liabilities, options);
    
    // Calculate equity line items
    const equityItems = this.createEquityLineItems(mappedTrialBalance.equity, options);
    
    // Calculate revenue line items
    const revenueItems = this.createRevenueLineItems(mappedTrialBalance.revenue, options);
    
    // Calculate expense line items
    const expenseItems = this.createExpenseLineItems(mappedTrialBalance.expenses, options);
    
    // Calculate totals
    const totalAssets = this.calculateTotal(assetItems);
    const totalLiabilities = this.calculateTotal(liabilityItems);
    const totalEquity = this.calculateTotal(equityItems);
    const totalRevenue = this.calculateTotal(revenueItems);
    const totalExpenses = this.calculateTotal(expenseItems);
    
    return {
      balanceSheet: {
        assets: assetItems,
        liabilities: liabilityItems,
        equity: equityItems,
        totals: {
          totalAssets,
          totalLiabilities,
          totalEquity
        }
      },
      incomeStatement: {
        revenue: revenueItems,
        expenses: expenseItems,
        totals: {
          totalRevenue,
          totalExpenses,
          netIncome: totalRevenue - totalExpenses
        }
      }
    };
  }

  private static createAssetLineItems(
    assets: { [lineItem: string]: TrialBalanceAccount[] },
    options: PopulationOptions
  ): StatementLineItem[] {
    return Object.entries(assets).map(([lineItem, accounts], index) => {
      const value = this.calculateAccountsValue(accounts, 'debit');
      
      if (!options.includeZeroBalances && value === 0) {
        return null;
      }
      
      return {
        id: `asset_${index}`,
        code: this.generateCode('A', index),
        name: lineItem,
        value: this.roundValue(value, options.roundingPrecision),
        accounts,
        level: 1,
        section: 'assets' as const,
        statementType: 'balance_sheet' as const,
        required: true
      };
    }).filter(Boolean) as StatementLineItem[];
  }

  private static createLiabilityLineItems(
    liabilities: { [lineItem: string]: TrialBalanceAccount[] },
    options: PopulationOptions
  ): StatementLineItem[] {
    return Object.entries(liabilities).map(([lineItem, accounts], index) => {
      const value = this.calculateAccountsValue(accounts, 'credit');
      
      if (!options.includeZeroBalances && value === 0) {
        return null;
      }
      
      return {
        id: `liability_${index}`,
        code: this.generateCode('L', index),
        name: lineItem,
        value: this.roundValue(value, options.roundingPrecision),
        accounts,
        level: 1,
        section: 'liabilities' as const,
        statementType: 'balance_sheet' as const,
        required: true
      };
    }).filter(Boolean) as StatementLineItem[];
  }

  private static createEquityLineItems(
    equity: { [lineItem: string]: TrialBalanceAccount[] },
    options: PopulationOptions
  ): StatementLineItem[] {
    return Object.entries(equity).map(([lineItem, accounts], index) => {
      const value = this.calculateAccountsValue(accounts, 'credit');
      
      if (!options.includeZeroBalances && value === 0) {
        return null;
      }
      
      return {
        id: `equity_${index}`,
        code: this.generateCode('E', index),
        name: lineItem,
        value: this.roundValue(value, options.roundingPrecision),
        accounts,
        level: 1,
        section: 'equity' as const,
        statementType: 'balance_sheet' as const,
        required: true
      };
    }).filter(Boolean) as StatementLineItem[];
  }

  private static createRevenueLineItems(
    revenue: { [lineItem: string]: TrialBalanceAccount[] },
    options: PopulationOptions
  ): StatementLineItem[] {
    return Object.entries(revenue).map(([lineItem, accounts], index) => {
      const value = this.calculateAccountsValue(accounts, 'credit');
      
      if (!options.includeZeroBalances && value === 0) {
        return null;
      }
      
      return {
        id: `revenue_${index}`,
        code: this.generateCode('R', index),
        name: lineItem,
        value: this.roundValue(value, options.roundingPrecision),
        accounts,
        level: 1,
        section: 'revenue' as const,
        statementType: 'income_statement' as const,
        required: true
      };
    }).filter(Boolean) as StatementLineItem[];
  }

  private static createExpenseLineItems(
    expenses: { [lineItem: string]: TrialBalanceAccount[] },
    options: PopulationOptions
  ): StatementLineItem[] {
    return Object.entries(expenses).map(([lineItem, accounts], index) => {
      const value = this.calculateAccountsValue(accounts, 'debit');
      
      if (!options.includeZeroBalances && value === 0) {
        return null;
      }
      
      return {
        id: `expense_${index}`,
        code: this.generateCode('X', index),
        name: lineItem,
        value: this.roundValue(value, options.roundingPrecision),
        accounts,
        level: 1,
        section: 'expenses' as const,
        statementType: 'income_statement' as const,
        required: true
      };
    }).filter(Boolean) as StatementLineItem[];
  }

  /**
   * Calculate account values using final amounts (original + adjustments)
   */
  private static calculateAccountsValue(
    accounts: TrialBalanceAccount[],
    type: 'debit' | 'credit'
  ): number {
    return accounts.reduce((total, account) => {
      // Always use final amounts for financial statements
      return total + (type === 'debit' ? account.finalDebit : account.finalCredit);
    }, 0);
  }

  private static calculateTotal(items: StatementLineItem[]): number {
    return items.reduce((total, item) => total + item.value, 0);
  }

  private static generateCode(prefix: string, index: number): string {
    return `${prefix}${(index + 1).toString().padStart(3, '0')}`;
  }

  private static roundValue(value: number, precision: number): number {
    return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  }
}
