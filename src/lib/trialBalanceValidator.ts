import type { 
  TrialBalanceAccount, 
  PeriodData, 
  MappedTrialBalance, 
  ValidationResult 
} from "@/types/project";

/**
 * Advanced Trial Balance Validator
 * Comprehensive validation beyond basic CSV checks including:
 * - Accounting equation validation (Assets = Liabilities + Equity)
 * - Period-over-period consistency checks
 * - Chart of accounts structure validation
 * - Required IFRS line items validation
 */

/**
 * Validates the fundamental accounting equation: Assets = Liabilities + Equity
 */
export const validateAccountingEquation = (
  mappedTrialBalance: MappedTrialBalance | null
): ValidationResult => {
  if (!mappedTrialBalance) {
    return {
      check: "accounting-equation",
      status: "fail",
      isValid: false,
      message: "No mapped trial balance data available for validation.",
    };
  }

  const { assets, liabilities, equity } = mappedTrialBalance;

  if (!assets || !liabilities || !equity) {
    return {
      check: "accounting-equation",
      status: "fail",
      isValid: false,
      message: "Missing core sections (Assets, Liabilities, or Equity) in mapped trial balance.",
    };
  }

  // Calculate totals for each section
  const totalAssets = calculateSectionTotal(assets);
  const totalLiabilities = calculateSectionTotal(liabilities);
  const totalEquity = calculateSectionTotal(equity);

  // In accounting: Assets = Liabilities + Equity
  // Since liabilities and equity have credit balances (negative in our system),
  // we expect: Assets + Liabilities + Equity ≈ 0
  const difference = totalAssets + totalLiabilities + totalEquity;
  const tolerance = 0.01; // Allow for rounding differences

  if (Math.abs(difference) > tolerance) {
    return {
      check: "accounting-equation",
      status: "fail",
      isValid: false,
      message: "The accounting equation (Assets = Liabilities + Equity) does not balance.",
      details: {
        "Total Assets": totalAssets,
        "Total Liabilities": Math.abs(totalLiabilities),
        "Total Equity": Math.abs(totalEquity),
        "Difference": difference,
        "Expected Difference": 0,
      },
    };
  }

  return {
    check: "accounting-equation",
    status: "pass",
    isValid: true,
    message: "The accounting equation balances correctly.",
    details: {
      "Total Assets": totalAssets,
      "Total Liabilities": Math.abs(totalLiabilities),
      "Total Equity": Math.abs(totalEquity),
    },
  };
};

/**
 * Validates that all trial balance debits equal credits
 */
export const validateTrialBalanceBalance = (
  periodData: PeriodData | null
): ValidationResult => {
  if (!periodData?.trialBalance?.rawData) {
    return {
      check: "trial-balance-balance",
      status: "fail",
      isValid: false,
      message: "No trial balance data available.",
    };
  }

  const totalDebits = periodData.trialBalance.rawData.reduce(
    (sum: number, account: TrialBalanceAccount) => sum + account.debit,
    0
  );
  const totalCredits = periodData.trialBalance.rawData.reduce(
    (sum: number, account: TrialBalanceAccount) => sum + account.credit,
    0
  );

  const difference = Math.abs(totalDebits - totalCredits);
  const tolerance = 0.01;

  if (difference > tolerance) {
    return {
      check: "trial-balance-balance",
      status: "fail",
      isValid: false,
      message: "Trial balance is out of balance - total debits do not equal total credits.",
      details: {
        "Total Debits": totalDebits,
        "Total Credits": totalCredits,
        "Difference": difference,
      },
    };
  }

  return {
    check: "trial-balance-balance",
    status: "pass",
    isValid: true,
    message: "Trial balance is in balance.",
    details: {
      "Total Debits": totalDebits,
      "Total Credits": totalCredits,
    },
  };
};

/**
 * Validates period-over-period consistency for comparative statements
 */
export const validatePeriodConsistency = (
  currentPeriod: PeriodData | null,
  previousPeriods: PeriodData[]
): ValidationResult => {
  if (!currentPeriod) {
    return {
      check: "period-consistency",
      status: "fail",
      isValid: false,
      message: "No current period data available.",
    };
  }

  if (previousPeriods.length === 0) {
    return {
      check: "period-consistency",
      status: "warning",
      isValid: true,
      message: "No previous periods available for comparison.",
    };
  }

  const issues: string[] = [];
  const previousPeriod = previousPeriods[0]; // Most recent previous period

  // Check for significant account structure changes
  const currentAccounts = new Set(
    currentPeriod.trialBalance?.rawData?.map((acc: TrialBalanceAccount) => acc.accountId) || []
  );
  const previousAccounts = new Set(
    previousPeriod.trialBalance?.rawData?.map((acc: TrialBalanceAccount) => acc.accountId) || []
  );

  const addedAccounts = Array.from(currentAccounts).filter(
    code => !previousAccounts.has(code)
  );
  const removedAccounts = Array.from(previousAccounts).filter(
    code => !currentAccounts.has(code)
  );

  if (addedAccounts.length > 0) {
    issues.push(`${addedAccounts.length} new accounts added since previous period`);
  }

  if (removedAccounts.length > 0) {
    issues.push(`${removedAccounts.length} accounts removed since previous period`);
  }

  // Check for unusual variance in key accounts (>50% change)
  const keyAccountPatterns = [
    /cash/i,
    /revenue/i,
    /income/i,
    /expense/i,
    /receivable/i,
    /payable/i,
  ];

  const significantVariances: { account: string; change: number }[] = [];

  currentPeriod.trialBalance?.rawData?.forEach((currentAccount: TrialBalanceAccount) => {
    const previousAccount = previousPeriod.trialBalance?.rawData?.find(
      (acc: TrialBalanceAccount) => acc.accountId === currentAccount.accountId
    );

    if (previousAccount) {
      const currentBalance = currentAccount.debit - currentAccount.credit;
      const previousBalance = previousAccount.debit - previousAccount.credit;

      if (Math.abs(previousBalance) > 1000) { // Only check accounts with meaningful balances
        const changePercent = Math.abs((currentBalance - previousBalance) / previousBalance) * 100;

        if (changePercent > 50 && Math.abs(currentBalance - previousBalance) > 10000) {
          const isKeyAccount = keyAccountPatterns.some(pattern =>
            pattern.test(currentAccount.accountName)
          );

          if (isKeyAccount) {
            significantVariances.push({
              account: currentAccount.accountName,
              change: changePercent,
            });
          }
        }
      }
    }
  });

  if (significantVariances.length > 0) {
    issues.push(`${significantVariances.length} key accounts with >50% variance from previous period`);
  }

  if (issues.length > 0) {
    return {
      check: "period-consistency",
      status: "warning",
      isValid: true,
      message: "Period-over-period consistency issues detected.",
      details: {
        issues,
        "Added Accounts": addedAccounts.length,
        "Removed Accounts": removedAccounts.length,
        "Significant Variances": significantVariances,
      },
    };
  }

  return {
    check: "period-consistency",
    status: "pass",
    isValid: true,
    message: "Period-over-period consistency is acceptable.",
  };
};

/**
 * Validates chart of accounts structure and hierarchy
 */
export const validateChartOfAccountsStructure = (
  periodData: PeriodData | null
): ValidationResult => {
  if (!periodData?.trialBalance?.rawData) {
    return {
      check: "chart-of-accounts-structure",
      status: "fail",
      isValid: false,
      message: "No trial balance data available.",
    };
  }

  const issues: string[] = [];
  const duplicateCodes: string[] = [];
  const missingNames: string[] = [];
  const invalidCodes: string[] = [];

  // Check for duplicate account codes
  const codeMap = new Map<string, number>();
  periodData.trialBalance.rawData.forEach((account: TrialBalanceAccount) => {
    const count = codeMap.get(account.accountId) || 0;
    codeMap.set(account.accountId, count + 1);
  });

  codeMap.forEach((count, code) => {
    if (count > 1) {
      duplicateCodes.push(code);
    }
  });

  // Check for missing account names and invalid codes
  periodData.trialBalance.rawData.forEach((account: TrialBalanceAccount) => {
    if (!account.accountName || account.accountName.trim() === '') {
      missingNames.push(account.accountId);
    }

    // Basic validation: account code should be alphanumeric and reasonable length
    if (!/^[A-Za-z0-9\-.]+$/.test(account.accountId) || 
        account.accountId.length > 20 || 
        account.accountId.length < 1) {
      invalidCodes.push(account.accountId);
    }
  });

  if (duplicateCodes.length > 0) {
    issues.push(`${duplicateCodes.length} duplicate account codes found`);
  }

  if (missingNames.length > 0) {
    issues.push(`${missingNames.length} accounts missing names`);
  }

  if (invalidCodes.length > 0) {
    issues.push(`${invalidCodes.length} accounts with invalid codes`);
  }

  if (issues.length > 0) {
    return {
      check: "chart-of-accounts-structure",
      status: "fail",
      isValid: false,
      message: "Chart of accounts structure issues detected.",
      details: {
        issues,
        "Duplicate Codes": duplicateCodes,
        "Missing Names": missingNames,
        "Invalid Codes": invalidCodes,
      },
    };
  }

  return {
    check: "chart-of-accounts-structure",
    status: "pass",
    isValid: true,
    message: "Chart of accounts structure is valid.",
  };
};

/**
 * Validates presence of required IFRS line items
 */
export const validateRequiredIfrsLineItems = (
  mappedTrialBalance: MappedTrialBalance | null
): ValidationResult => {
  if (!mappedTrialBalance) {
    return {
      check: "required-ifrs-line-items",
      status: "fail",
      isValid: false,
      message: "No mapped trial balance data available.",
    };
  }

  const missingItems: string[] = [];

  // Required IFRS Statement of Financial Position line items
  const requiredSfpItems = [
    { section: 'assets', items: ['cash', 'receivables', 'inventory'] },
    { section: 'liabilities', items: ['payables', 'provisions'] },
    { section: 'equity', items: ['share-capital', 'retained-earnings'] },
  ];

  requiredSfpItems.forEach(({ section, items }) => {
    const sectionData = mappedTrialBalance[section as keyof MappedTrialBalance] as 
      { [lineItem: string]: TrialBalanceAccount[] } | undefined;

    if (!sectionData) {
      missingItems.push(`Entire ${section} section`);
      return;
    }

    items.forEach(item => {
      const hasItem = Object.keys(sectionData).some(key => 
        key.toLowerCase().includes(item.toLowerCase())
      );

      if (!hasItem) {
        missingItems.push(`${section}.${item}`);
      }
    });
  });

  // Check for revenue and expenses (required for comprehensive income)
  if (!mappedTrialBalance.revenue || Object.keys(mappedTrialBalance.revenue).length === 0) {
    missingItems.push('Revenue items');
  }

  if (!mappedTrialBalance.expenses || Object.keys(mappedTrialBalance.expenses).length === 0) {
    missingItems.push('Expense items');
  }

  if (missingItems.length > 0) {
    return {
      check: "required-ifrs-line-items",
      status: "warning",
      isValid: true,
      message: "Some recommended IFRS line items are missing.",
      details: {
        "Missing Items": missingItems,
        "Total Missing": missingItems.length,
      },
    };
  }

  return {
    check: "required-ifrs-line-items",
    status: "pass",
    isValid: true,
    message: "All recommended IFRS line items are present.",
  };
};

/**
 * Validates that suspense accounts have zero balances
 */
export const validateSuspenseAccounts = (
  mappedTrialBalance: MappedTrialBalance | null
): ValidationResult => {
  if (!mappedTrialBalance) {
    return {
      check: "suspense-accounts",
      status: "warning",
      isValid: true,
      message: "No mapped trial balance data available.",
    };
  }

  const suspensePatterns = [
    /suspense/i,
    /clearing/i,
    /unallocated/i,
    /miscellaneous/i,
    /misc/i,
    /temp/i,
    /temporary/i,
  ];

  const suspenseAccounts: { account: string; balance: number }[] = [];

  // Check all sections for suspense accounts
  Object.values(mappedTrialBalance).forEach(section => {
    if (section && typeof section === 'object') {
      Object.values(section).forEach(accounts => {
        if (Array.isArray(accounts)) {
          accounts.forEach(account => {
            const isSuspense = suspensePatterns.some(pattern =>
              pattern.test(account.accountName) || pattern.test(account.accountCode)
            );

            if (isSuspense) {
              const balance = account.debit - account.credit;
              if (Math.abs(balance) > 0.01) {
                suspenseAccounts.push({
                  account: account.accountName,
                  balance,
                });
              }
            }
          });
        }
      });
    }
  });

  if (suspenseAccounts.length > 0) {
    return {
      check: "suspense-accounts",
      status: "warning",
      isValid: true,
      message: "Suspense accounts with non-zero balances detected.",
      details: {
        "Suspense Accounts": suspenseAccounts,
        "Total Accounts": suspenseAccounts.length,
      },
    };
  }

  return {
    check: "suspense-accounts",
    status: "pass",
    isValid: true,
    message: "No suspense accounts with balances found.",
  };
};

/**
 * Validates large or unusual account movements
 */
export const validateLargeAccountMovements = (
  periodData: PeriodData | null,
  previousPeriods: PeriodData[] = []
): ValidationResult => {
  if (!periodData?.trialBalance?.rawData) {
    return {
      check: "large-account-movements",
      status: "warning",
      isValid: true,
      message: "No trial balance data available.",
    };
  }

  const largeMovements: { account: string; balance: number; percentage?: number }[] = [];
  const threshold = 1000000; // $1M threshold for large balances

  // Identify accounts with large balances
  periodData.trialBalance.rawData.forEach((account: TrialBalanceAccount) => {
    const balance = Math.abs(account.debit - account.credit);
    
    if (balance > threshold) {
      const movement: { account: string; balance: number; percentage?: number } = {
        account: account.accountName,
        balance,
      };

      // If we have previous period data, calculate percentage change
      if (previousPeriods.length > 0) {
        const previousAccount = previousPeriods[0].trialBalance?.rawData?.find(
          (acc: TrialBalanceAccount) => acc.accountId === account.accountId
        );

        if (previousAccount) {
          const previousBalance = Math.abs(previousAccount.debit - previousAccount.credit);
          if (previousBalance > 0) {
            const changePercent = ((balance - previousBalance) / previousBalance) * 100;
            movement.percentage = changePercent;
          }
        }
      }

      largeMovements.push(movement);
    }
  });

  if (largeMovements.length > 0) {
    return {
      check: "large-account-movements",
      status: "warning",
      isValid: true,
      message: `${largeMovements.length} accounts with large balances (>${threshold.toLocaleString()}) detected.`,
      details: {
        "Large Movements": largeMovements,
        "Threshold": threshold,
      },
    };
  }

  return {
    check: "large-account-movements",
    status: "pass",
    isValid: true,
    message: "No unusually large account movements detected.",
  };
};

/**
 * Validates that accounts are mapped to appropriate statement line items
 */
export const validateAccountMappingConsistency = (
  mappedTrialBalance: MappedTrialBalance | null
): ValidationResult => {
  if (!mappedTrialBalance) {
    return {
      check: "account-mapping-consistency",
      status: "fail",
      isValid: false,
      message: "No mapped trial balance data available.",
    };
  }

  const inconsistencies: string[] = [];

  // Check that asset accounts have debit balances
  if (mappedTrialBalance.assets) {
    Object.entries(mappedTrialBalance.assets).forEach(([, accounts]) => {
      accounts.forEach(account => {
        const balance = account.debit - account.credit;
        if (balance < 0) {
          inconsistencies.push(
            `Asset account "${account.accountName}" has credit balance (${balance})`
          );
        }
      });
    });
  }

  // Check that liability accounts have credit balances
  if (mappedTrialBalance.liabilities) {
    Object.entries(mappedTrialBalance.liabilities).forEach(([, accounts]) => {
      accounts.forEach(account => {
        const balance = account.debit - account.credit;
        if (balance > 0) {
          inconsistencies.push(
            `Liability account "${account.accountName}" has debit balance (${balance})`
          );
        }
      });
    });
  }

  // Check that equity accounts have credit balances
  if (mappedTrialBalance.equity) {
    Object.entries(mappedTrialBalance.equity).forEach(([, accounts]) => {
      accounts.forEach(account => {
        const balance = account.debit - account.credit;
        if (balance > 0) {
          inconsistencies.push(
            `Equity account "${account.accountName}" has debit balance (${balance})`
          );
        }
      });
    });
  }

  if (inconsistencies.length > 0) {
    return {
      check: "account-mapping-consistency",
      status: "warning",
      isValid: true,
      message: "Account mapping inconsistencies detected.",
      details: {
        "Inconsistencies": inconsistencies,
        "Total Issues": inconsistencies.length,
      },
    };
  }

  return {
    check: "account-mapping-consistency",
    status: "pass",
    isValid: true,
    message: "Account mappings are consistent with normal balances.",
  };
};

/**
 * Helper function to calculate section totals
 */
const calculateSectionTotal = (section: { [lineItem: string]: TrialBalanceAccount[] } | undefined): number => {
  if (!section) return 0;
  return Object.values(section).reduce((total, accounts) => {
    return total + accounts.reduce((lineTotal, account) => {
      return lineTotal + account.debit - account.credit;
    }, 0);
  }, 0);
};

/**
 * Comprehensive validation runner that executes all advanced validations
 */
export const runAdvancedTrialBalanceValidation = (
  currentPeriod: PeriodData | null,
  previousPeriods: PeriodData[] = []
): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // Core accounting validations
  results.push(validateTrialBalanceBalance(currentPeriod));
  results.push(validateAccountingEquation(currentPeriod?.mappedTrialBalance || null));
  results.push(validateChartOfAccountsStructure(currentPeriod));

  // IFRS compliance validations
  results.push(validateRequiredIfrsLineItems(currentPeriod?.mappedTrialBalance || null));
  results.push(validateAccountMappingConsistency(currentPeriod?.mappedTrialBalance || null));

  // Quality assurance validations
  results.push(validateSuspenseAccounts(currentPeriod?.mappedTrialBalance || null));
  results.push(validateLargeAccountMovements(currentPeriod, previousPeriods));

  // Period consistency validations (if previous periods available)
  if (previousPeriods.length > 0) {
    results.push(validatePeriodConsistency(currentPeriod, previousPeriods));
  }

  return results.filter(result => result !== null);
};
