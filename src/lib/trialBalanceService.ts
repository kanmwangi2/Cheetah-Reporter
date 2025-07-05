import type { 
  TrialBalanceAccount, 
  TrialBalanceData, 
  TrialBalanceEdit, 
  MappedTrialBalance 
} from '../types/project';

/**
 * Trial Balance Service
 * Single source of truth for all trial balance operations:
 * 1. Import & Save
 * 2. Edit accounts, descriptions, mappings, amounts
 * 3. Apply adjustments (original + adjustment = final)
 * 4. Provide final amounts for financial statements
 */
export class TrialBalanceService {
  
  /**
   * Create trial balance from import
   */
  static createFromImport(
    accounts: TrialBalanceAccount[],
    mappings: { [accountId: string]: { statement: keyof MappedTrialBalance | 'unmapped'; lineItem: string } },
    userId: string,
    userName: string,
    fileName?: string
  ): TrialBalanceData {
    
    const now = new Date();
    
    // Initialize accounts with proper structure (original, adjustment, final)
    const trialBalanceAccounts = accounts.map(account => ({
      ...account,
      // ORIGINAL amounts (never change after import)
      originalDebit: account.debit,
      originalCredit: account.credit,
      
      // ADJUSTMENT amounts (start at zero)
      adjustmentDebit: 0,
      adjustmentCredit: 0,
      
      // FINAL amounts (original + adjustments)
      finalDebit: account.debit,
      finalCredit: account.credit,
      
      // Metadata
      description: account.accountName,
      isEdited: false,
      lastModified: now,
      modifiedBy: userId
    }));

    // Create mapped trial balance structure
    const mappedTrialBalance = this.createMappedTrialBalance(trialBalanceAccounts, mappings);

    // Create initial edit record
    const initialEdit: TrialBalanceEdit = {
      id: `edit_${Date.now()}`,
      timestamp: now,
      userId,
      userName,
      action: 'import',
      changes: [{
        field: 'accounts',
        oldValue: null,
        newValue: trialBalanceAccounts.length
      }],
      description: `Imported ${trialBalanceAccounts.length} accounts from ${fileName || 'CSV file'}`
    };

    return {
      importDate: now,
      importedBy: userId,
      fileName,
      accounts: trialBalanceAccounts,
      mappings,
      mappedTrialBalance,
      version: 1,
      hasAdjustments: false,
      lastModified: now,
      editHistory: [initialEdit]
    };
  }

  /**
   * Get final amounts for all accounts (original + adjustments)
   */
  static getFinalAccounts(trialBalance: TrialBalanceData): TrialBalanceAccount[] {
    return trialBalance.accounts.map(account => ({
      ...account,
      finalDebit: account.originalDebit + account.adjustmentDebit,
      finalCredit: account.originalCredit + account.adjustmentCredit
    }));
  }

  /**
   * Edit an account (description, amounts, etc.)
   */
  static editAccount(
    trialBalance: TrialBalanceData,
    accountId: string,
    changes: Partial<TrialBalanceAccount>,
    userId: string,
    userName: string
  ): TrialBalanceData {
    
    const now = new Date();
    const accountIndex = trialBalance.accounts.findIndex(a => a.accountId === accountId);
    
    if (accountIndex === -1) {
      throw new Error(`Account ${accountId} not found`);
    }

    const oldAccount = trialBalance.accounts[accountIndex];
    const newAccount = {
      ...oldAccount,
      ...changes,
      isEdited: true,
      lastModified: now,
      modifiedBy: userId,
      // Recalculate final amounts if adjustments changed
      finalDebit: (changes.adjustmentDebit !== undefined ? 
        oldAccount.originalDebit + changes.adjustmentDebit : 
        oldAccount.finalDebit),
      finalCredit: (changes.adjustmentCredit !== undefined ? 
        oldAccount.originalCredit + changes.adjustmentCredit : 
        oldAccount.finalCredit)
    };

    // Track changes for audit trail
    const editChanges = Object.entries(changes).map(([field, newValue]) => {
      const oldValue = (oldAccount as unknown as Record<string, unknown>)[field];
      return {
        field,
        oldValue: typeof oldValue === 'object' && oldValue instanceof Date ? 
          oldValue.toISOString() : 
          (typeof oldValue === 'string' || typeof oldValue === 'number' || typeof oldValue === 'boolean' ? oldValue : null),
        newValue: typeof newValue === 'object' && newValue instanceof Date ? 
          newValue.toISOString() : 
          (typeof newValue === 'string' || typeof newValue === 'number' || typeof newValue === 'boolean' ? newValue : null)
      };
    });

    const edit: TrialBalanceEdit = {
      id: `edit_${Date.now()}`,
      timestamp: now,
      userId,
      userName,
      action: 'edit_account',
      accountId,
      changes: editChanges,
      description: `Updated account ${accountId}`
    };

    const updatedAccounts = [...trialBalance.accounts];
    updatedAccounts[accountIndex] = newAccount;

    // Regenerate mapped trial balance
    const mappedTrialBalance = this.createMappedTrialBalance(updatedAccounts, trialBalance.mappings);

    return {
      ...trialBalance,
      accounts: updatedAccounts,
      mappedTrialBalance,
      version: trialBalance.version + 1,
      hasAdjustments: updatedAccounts.some(a => a.adjustmentDebit !== 0 || a.adjustmentCredit !== 0),
      lastModified: now,
      editHistory: [...trialBalance.editHistory, edit]
    };
  }

  /**
   * Update account mapping
   */
  static updateMapping(
    trialBalance: TrialBalanceData,
    accountId: string,
    statement: keyof MappedTrialBalance | 'unmapped',
    lineItem: string,
    userId: string,
    userName: string
  ): TrialBalanceData {
    
    const now = new Date();
    const oldMapping = trialBalance.mappings[accountId];
    const newMapping = { statement, lineItem };

    const edit: TrialBalanceEdit = {
      id: `edit_${Date.now()}`,
      timestamp: now,
      userId,
      userName,
      action: 'edit_mapping',
      accountId,
      changes: [
        {
          field: 'statement',
          oldValue: oldMapping?.statement || null,
          newValue: statement
        },
        {
          field: 'lineItem',
          oldValue: oldMapping?.lineItem || null,
          newValue: lineItem
        }
      ],
      description: `Mapped account ${accountId} to ${statement}.${lineItem}`
    };

    const updatedMappings = {
      ...trialBalance.mappings,
      [accountId]: newMapping
    };

    // Regenerate mapped trial balance
    const mappedTrialBalance = this.createMappedTrialBalance(trialBalance.accounts, updatedMappings);

    return {
      ...trialBalance,
      mappings: updatedMappings,
      mappedTrialBalance,
      version: trialBalance.version + 1,
      lastModified: now,
      editHistory: [...trialBalance.editHistory, edit]
    };
  }

  /**
   * Apply adjustment to an account
   */
  static applyAdjustment(
    trialBalance: TrialBalanceData,
    accountId: string,
    adjustmentDebit: number,
    adjustmentCredit: number,
    userId: string,
    userName: string,
    description?: string
  ): TrialBalanceData {
    
    const accountIndex = trialBalance.accounts.findIndex(a => a.accountId === accountId);
    if (accountIndex === -1) {
      throw new Error(`Account ${accountId} not found`);
    }

    const oldAccount = trialBalance.accounts[accountIndex];
    const newAccount = {
      ...oldAccount,
      adjustmentDebit: oldAccount.adjustmentDebit + adjustmentDebit,
      adjustmentCredit: oldAccount.adjustmentCredit + adjustmentCredit,
      finalDebit: oldAccount.originalDebit + oldAccount.adjustmentDebit + adjustmentDebit,
      finalCredit: oldAccount.originalCredit + oldAccount.adjustmentCredit + adjustmentCredit,
      isEdited: true,
      lastModified: new Date(),
      modifiedBy: userId
    };

    const edit: TrialBalanceEdit = {
      id: `edit_${Date.now()}`,
      timestamp: new Date(),
      userId,
      userName,
      action: 'add_adjustment',
      accountId,
      changes: [
        {
          field: 'adjustmentDebit',
          oldValue: oldAccount.adjustmentDebit,
          newValue: newAccount.adjustmentDebit
        },
        {
          field: 'adjustmentCredit',
          oldValue: oldAccount.adjustmentCredit,
          newValue: newAccount.adjustmentCredit
        }
      ],
      description: description || `Applied adjustment to ${accountId}: Dr ${adjustmentDebit}, Cr ${adjustmentCredit}`
    };

    const updatedAccounts = [...trialBalance.accounts];
    updatedAccounts[accountIndex] = newAccount;

    // Regenerate mapped trial balance with final amounts
    const mappedTrialBalance = this.createMappedTrialBalance(updatedAccounts, trialBalance.mappings, true);

    return {
      ...trialBalance,
      accounts: updatedAccounts,
      mappedTrialBalance,
      version: trialBalance.version + 1,
      hasAdjustments: true,
      lastModified: new Date(),
      editHistory: [...trialBalance.editHistory, edit]
    };
  }

  /**
   * Create mapped trial balance structure from accounts and mappings
   */
  private static createMappedTrialBalance(
    accounts: TrialBalanceAccount[],
    mappings: { [accountId: string]: { statement: keyof MappedTrialBalance | 'unmapped'; lineItem: string } },
    useFinalAmounts = false
  ): MappedTrialBalance {
    
    const mapped: MappedTrialBalance = {
      assets: {},
      liabilities: {},
      equity: {},
      revenue: {},
      expenses: {}
    };

    accounts.forEach(account => {
      const mapping = mappings[account.accountId];
      if (!mapping || mapping.statement === 'unmapped' || !mapping.lineItem) {
        return; // Skip unmapped accounts
      }

      const statement = mapping.statement;
      const lineItem = mapping.lineItem;

      if (!mapped[statement][lineItem]) {
        mapped[statement][lineItem] = [];
      }

      // Use final amounts if adjustments have been applied, otherwise use original amounts
      const accountToAdd = useFinalAmounts ? {
        ...account,
        debit: account.finalDebit,
        credit: account.finalCredit
      } : account;

      mapped[statement][lineItem].push(accountToAdd);
    });

    return mapped;
  }

  /**
   * Validate trial balance (debits = credits)
   */
  static validate(trialBalance: TrialBalanceData, useFinalAmounts = true): {
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
  } {
    
    const accounts = useFinalAmounts ? this.getFinalAccounts(trialBalance) : trialBalance.accounts;
    
    const totalDebits = accounts.reduce((sum, account) => 
      sum + (useFinalAmounts ? account.finalDebit : account.originalDebit), 0);
    
    const totalCredits = accounts.reduce((sum, account) => 
      sum + (useFinalAmounts ? account.finalCredit : account.originalCredit), 0);
    
    const difference = Math.abs(totalDebits - totalCredits);
    
    return {
      isBalanced: difference < 0.01, // Allow for rounding differences
      totalDebits,
      totalCredits,
      difference
    };
  }

  /**
   * Export trial balance data
   */
  static exportData(trialBalance: TrialBalanceData, format: 'csv' | 'json' = 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(trialBalance, null, 2);
    }

    // CSV export with all columns
    const headers = [
      'Account ID',
      'Account Name', 
      'Description',
      'Original Debit',
      'Original Credit',
      'Adjustment Debit',
      'Adjustment Credit',
      'Final Debit',
      'Final Credit',
      'Statement',
      'Line Item'
    ];

    const rows = trialBalance.accounts.map(account => {
      const mapping = trialBalance.mappings[account.accountId];
      return [
        account.accountId,
        account.accountName,
        account.description || '',
        account.originalDebit.toString(),
        account.originalCredit.toString(),
        account.adjustmentDebit.toString(),
        account.adjustmentCredit.toString(),
        account.finalDebit.toString(),
        account.finalCredit.toString(),
        mapping?.statement || 'unmapped',
        mapping?.lineItem || ''
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
