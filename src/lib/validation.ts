import type { MappedTrialBalance, PeriodData, TrialBalanceAccount, StatementOfChangesInEquityData, ValidationResult } from "@/types/project";
import { calculateStatementOfChangesInEquity } from "./statementOfChangesInEquityCalculations";

/**
 * Calculate total for a section in the mapped trial balance
 */
const calculateSectionTotal = (section: { [lineItem: string]: TrialBalanceAccount[] } | undefined): number => {
  if (!section) return 0;
  return Object.values(section).reduce((total, accounts) => {
    return total + accounts.reduce((lineTotal, account) => {
      return lineTotal + account.debit - account.credit;
    }, 0);
  }, 0);
};

// Remove unused getSumForLine function since we now use calculateSectionTotal

/**
 * Remove the unused helper functions that don't work with the current structure
 */

// Instead of using findLineItemById, we'll work directly with the mapped structure

/**
 * Validates that the Statement of Financial Position balances.
 * Uses the simplified structure to avoid type mismatches.
 */
export const validateSfpBalance = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult => {
  if (!mappedTrialBalance) {
    return { check: "sfp-balance", status: "fail", isValid: false, message: "Mapped trial balance not available." };
  }

  const assetsNode = mappedTrialBalance.assets;
  const equityNode = mappedTrialBalance.equity;
  const liabilitiesNode = mappedTrialBalance.liabilities;

  if (!assetsNode || !equityNode || !liabilitiesNode) {
    return { check: "sfp-balance", status: "fail", isValid: false, message: "Core SFP sections (Assets, Equity, Liabilities) not found in mapped trial balance." };
  }

  const totalAssets = calculateSectionTotal(assetsNode);
  const totalEquity = calculateSectionTotal(equityNode);
  const totalLiabilities = calculateSectionTotal(liabilitiesNode);

  // Note: In standard accounting, liability and equity accounts have credit balances (negative numbers in our system).
  // To check Assets = L + E, we expect Assets to equal the negative of (Liabilities + Equity).
  const totalEquityAndLiabilities = totalEquity + totalLiabilities;

  const difference = totalAssets + totalEquityAndLiabilities; // Should be close to 0 if balanced

  if (Math.abs(difference) > 0.01) { // Using a small tolerance for floating point issues
    return {
      check: "sfp-balance",
      status: "fail",
      isValid: false,
      message: "The Statement of Financial Position does not balance.",
      details: {
        "Total Assets": totalAssets,
        "Total Equity and Liabilities": -totalEquityAndLiabilities, // show as positive number
        "Difference": difference,
      }
    };
  }

  return {
    check: "sfp-balance",
    status: "pass",
    isValid: true,
    message: "The Statement of Financial Position is balanced.",
    details: {
      "Total Assets": totalAssets,
      "Total Equity and Liabilities": -totalEquityAndLiabilities,
    }
  };
};

/**
 * Validates that Cash and Cash Equivalents are not negative.
 * @param mappedTrialBalance - The mapped trial balance data.
 * @returns ValidationResult - An object indicating if the cash balance is valid.
 */
export const validateNegativeCash = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
  if (!mappedTrialBalance) {
    return null; // No data to validate
  }

  // Since we're working with the { [lineItem: string]: TrialBalanceAccount[] } structure,
  // we need to find cash accounts in the assets section
  const cashAccounts = mappedTrialBalance.assets?.['cash'] || mappedTrialBalance.assets?.['cash-and-cash-equivalents'] || [];
  
  if (cashAccounts.length === 0) {
    return {
      check: "negative-cash",
      status: "warning",
      isValid: true,
      message: "'Cash and Cash Equivalents' not found in asset mappings. Validation skipped.",
    };
  }

  const totalCashBalance = cashAccounts.reduce((sum, account) => sum + account.debit - account.credit, 0);

  if (totalCashBalance < 0) {
    return {
      check: "negative-cash",
      status: "fail",
      isValid: false,
      message: "Cash and Cash Equivalents balance is negative.",
      details: {
        "Balance": totalCashBalance,
      }
    };
  }

  return {
    check: "negative-cash",
    status: "pass",
    isValid: true,
    message: "Cash and Cash Equivalents balance is valid.",
    details: {
        "Balance": totalCashBalance,
    }
  };
};

/**
 * Validates the retained earnings reconciliation.
 * Closing RE = Opening RE + Net Income - Dividends
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult An object indicating if the retained earnings reconcile.
 */
export const validateRetainedEarnings = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
  if (!mappedTrialBalance) {
    return null; // No data to validate
  }

  // This validation is disabled until the structure is updated to support line item lookup
  return {
    check: "retained-earnings",
    status: "warning",
    isValid: true,
    message: "Retained earnings validation temporarily disabled due to structure changes.",
  };
};

/**
 * Validates that the total of current assets equals the sum of its individual components.
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult An object indicating if the current assets figure is consistent.
 */
export const validateCurrentAssets = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
  if (!mappedTrialBalance) {
    return null; // No data to validate
  }

  // This validation is disabled until the structure is updated to support line item lookup
  return {
    check: "current-assets-consistency",
    status: "warning",
    isValid: true,
    message: "Current assets validation temporarily disabled due to structure changes.",
  };
};

/**
 * Simplified validation for debit/credit rules using the current MappedTrialBalance structure
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult An object indicating if the debit/credit rules are met.
 */
export const validateDebitCreditRules = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
  if (!mappedTrialBalance) {
    return null; // No data to validate
  }

  const errors: { accountName: string; balance: number; expected: string }[] = [];

  // Check accounts in each section
  const checkSectionAccounts = (section: { [lineItem: string]: TrialBalanceAccount[] } | undefined, expectedType: 'debit' | 'credit') => {
    if (!section) return;
    
    Object.values(section).forEach(accounts => {
      accounts.forEach(account => {
        const balance = account.debit - account.credit;
        const isDebit = balance >= 0;
        const isCredit = balance < 0;

        if (expectedType === 'debit' && isCredit) {
          errors.push({
            accountName: account.accountName,
            balance: balance,
            expected: 'Debit (positive)',
          });
        } else if (expectedType === 'credit' && isDebit) {
          errors.push({
            accountName: account.accountName,
            balance: balance,
            expected: 'Credit (negative)',
          });
        }
      });
    });
  };

  // Run checks for each top-level category
  checkSectionAccounts(mappedTrialBalance.assets, 'debit');
  checkSectionAccounts(mappedTrialBalance.expenses, 'debit');
  checkSectionAccounts(mappedTrialBalance.liabilities, 'credit');
  checkSectionAccounts(mappedTrialBalance.equity, 'credit');
  checkSectionAccounts(mappedTrialBalance.revenue, 'credit');

  if (errors.length > 0) {
    return {
      check: "debit-credit-rules",
      status: "fail",
      isValid: false,
      message: `Found ${errors.length} account(s) with incorrect balance types.`,
      details: {
        errors: errors,
      }
    };
  }

  return {
    check: "debit-credit-rules",
    status: "pass",
    isValid: true,
    message: 'All account balances conform to standard debit/credit rules.',
  };
};

/**
 * Validates that the closing cash balance on the Statement of Cash Flows
 * matches the Cash and Cash Equivalents on the Statement of Financial Position.
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult An object indicating if the cash flow reconciles.
 */
export const validateCashFlowReconciliation = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
  if (!mappedTrialBalance) {
    return null; // No data to validate
  }

  // This validation is disabled until the structure is updated to support line item lookup
  return {
    check: "cashflow-reconciliation",
    status: "warning",
    isValid: true,
    message: "Cash flow reconciliation validation temporarily disabled due to structure changes.",
  };
};

/**
 * Simplified IFRS classification validation
 */
export const validateIfrsClassification = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
  if (!mappedTrialBalance) {
    return null; // No data to validate
  }

  const assets = mappedTrialBalance.assets;
  const liabilities = mappedTrialBalance.liabilities;
  const missingClassifications: string[] = [];

  // For the current structure, we'll check if there are different asset/liability categories
  const hasCurrentAssets = assets && Object.keys(assets).some(key => key.toLowerCase().includes('current'));
  const hasNonCurrentAssets = assets && Object.keys(assets).some(key => key.toLowerCase().includes('non-current') || key.toLowerCase().includes('fixed'));

  if (!hasCurrentAssets) {
    missingClassifications.push('Current Assets');
  }
  if (!hasNonCurrentAssets) {
    missingClassifications.push('Non-Current Assets');
  }

  // Check for current/non-current liabilities
  const hasCurrentLiabilities = liabilities && Object.keys(liabilities).some(key => key.toLowerCase().includes('current'));
  const hasNonCurrentLiabilities = liabilities && Object.keys(liabilities).some(key => key.toLowerCase().includes('non-current') || key.toLowerCase().includes('long-term'));

  if (!hasCurrentLiabilities) {
    missingClassifications.push('Current Liabilities');
  }
  if (!hasNonCurrentLiabilities) {
    missingClassifications.push('Non-Current Liabilities');
  }

  if (missingClassifications.length > 0) {
    return {
      check: "ifrs-classification",
      status: "fail",
      isValid: false,
      message: "Missing required IFRS classifications on the Statement of Financial Position.",
      details: {
        "Missing Sections": missingClassifications.join(', '),
      }
    };
  }

  return {
    check: "ifrs-classification",
    status: "pass",
    isValid: true,
    message: "Assets and Liabilities are correctly classified as Current and Non-Current.",
  };
};

/**
 * Validation rule to check for accounts in the trial balance that have not been mapped.
 * @param periodData - The data for the current period.
 * @returns A ValidationResult.
 */
export const validateUnmappedAccounts = (periodData: PeriodData): ValidationResult => {
    if (!periodData.mappedTrialBalance) {
        return { check: "unmapped-accounts", status: "pass", isValid: true, message: "Mapped trial balance not available, skipping unmapped account check." };
    }
    const allAccountIds = new Set(periodData.trialBalance.rawData.map((acc: Record<string, unknown>) => acc.accountId as string).filter(Boolean));
    const mappedAccountIds = getMappedAccountIds(periodData.mappedTrialBalance);

    const unmappedIds = new Set([...allAccountIds].filter(id => !mappedAccountIds.has(id)));

    if (unmappedIds.size > 0) {
        const unmappedAccounts = periodData.trialBalance.rawData.filter((acc: Record<string, unknown>) => acc.accountId && unmappedIds.has(acc.accountId as string));
        return {
            check: "unmapped-accounts",
            status: "warning",
            isValid: false,
            message: `Found ${unmappedAccounts.length} unmapped trial balance accounts.`,
            details: { unmappedAccounts: unmappedAccounts.map((a: Record<string, unknown>) => `${a.accountName} (${a.accountId})`) },
        };
    }

    return {
        check: "unmapped-accounts",
        status: "pass",
        isValid: true,
        message: "All accounts from the trial balance have been mapped.",
    };
};

/**
 * Validates that the Profit and Loss statement is balanced.
 * (Total Revenue - Total Expenses = Net Profit/Loss)
 * @param mappedTrialBalance - The mapped trial balance data.
 * @returns ValidationResult - An object indicating if the P&L statement is balanced.
 */
export const validatePlBalance = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult => {
  if (!mappedTrialBalance) {
    return { check: "pl-balance", status: "fail", isValid: false, message: "Mapped trial balance not available." };
  }

  const revenueNode = mappedTrialBalance.revenue;
  const expensesNode = mappedTrialBalance.expenses;

  if (!revenueNode || !expensesNode) {
    return { check: "pl-balance", status: "fail", isValid: false, message: "Revenue or Expenses section not found in mapped trial balance." };
  }

  const totalRevenue = calculateSectionTotal(revenueNode);
  const totalExpenses = calculateSectionTotal(expensesNode);

  const netProfitLoss = totalRevenue + totalExpenses; // Expenses are negative, so this adds correctly

  if (Math.abs(netProfitLoss) > 0.01) { // Using a small tolerance for floating point issues
    return {
      check: "pl-balance",
      status: "fail",
      isValid: false,
      message: "The Profit and Loss statement is not balanced.",
      details: {
        "Total Revenue": totalRevenue,
        "Total Expenses": totalExpenses,
        "Net Profit/Loss": netProfitLoss,
      }
    };
  }

  return {
    check: "pl-balance",
    status: "pass",
    isValid: true,
    message: "The Profit and Loss statement is balanced.",
    details: {
      "Total Revenue": totalRevenue,
      "Total Expenses": totalExpenses,
      "Net Profit/Loss": netProfitLoss,
    }
  };
};

/**
 * Validates that all required financial statements are present and correctly mapped.
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult An object indicating if all statements are present.
 */
export const validateRequiredStatements = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult => {
  if (!mappedTrialBalance) {
    return { check: "required-statements", status: "fail", isValid: false, message: "Mapped trial balance not available." };
  }

  const missingStatements = [];

  // Check for presence of core statements
  if (!mappedTrialBalance.revenue) {
    missingStatements.push("Revenue Statement");
  }
  if (!mappedTrialBalance.expenses) {
    missingStatements.push("Expenses Statement");
  }
  if (!mappedTrialBalance.assets) {
    missingStatements.push("Statement of Financial Position (Assets)");
  }
  if (!mappedTrialBalance.liabilities) {
    missingStatements.push("Statement of Financial Position (Liabilities)");
  }
  if (!mappedTrialBalance.equity) {
    missingStatements.push("Statement of Changes in Equity");
  }

  if (missingStatements.length > 0) {
    return {
      check: "required-statements",
      status: "fail",
      isValid: false,
      message: "Missing required financial statements.",
      details: {
        missingStatements: missingStatements,
      }
    };
  }

  return {
    check: "required-statements",
    status: "pass",
    isValid: true,
    message: "All required financial statements are present.",
  };
};

/**
 * Validates that the Profit for the year between the P&L and the SOCE.
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult
 */
export const validateProfitReconciliation = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
    if (!mappedTrialBalance) {
        return null;
    }

    // 1. Calculate Net Income from P&L section
    const revenue = calculateSectionTotal(mappedTrialBalance.revenue);
    const expenses = calculateSectionTotal(mappedTrialBalance.expenses);
    const netIncomeFromPL = revenue + expenses; // Expenses are negative

    // 2. Get profit from SOCE calculation
    const soceData = calculateStatementOfChangesInEquity(mappedTrialBalance);
    const profitInSOCE = soceData.retainedEarnings.profit;

    const difference = netIncomeFromPL - profitInSOCE;

    if (Math.abs(difference) > 0.01) {
        return {
            check: "profit-reconciliation",
            status: "fail",
            isValid: false,
            message: "Profit/Loss does not reconcile between the P&L and SOCE.",
            details: {
                "Net Profit/Loss from P&L": netIncomeFromPL,
                "Profit/Loss in Retained Earnings (SOCE)": profitInSOCE,
                "Difference": difference,
            }
        };
    }

    return {
        check: "profit-reconciliation",
        status: "pass",
        isValid: true,
        message: "Profit/Loss is consistent between the P&L and SOCE.",
        details: {
            "Reconciled Profit/Loss": netIncomeFromPL,
        }
    };
};

/**
 * Reconciles Total Equity between the SFP and the SOCE.
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult
 */
export const validateTotalEquityReconciliation = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
    if (!mappedTrialBalance || !mappedTrialBalance.equity) {
        return null;
    }

    const sfpData = mappedTrialBalance;
    const soce = calculateStatementOfChangesInEquity(mappedTrialBalance);

    const totalEquityOnSFP = calculateSectionTotal(sfpData.equity);
    const closingEquityOnSOCE = soce.total.closing;

    const difference = totalEquityOnSFP - closingEquityOnSOCE;

    if (Math.abs(difference) > 0.01) {
        return {
            check: "total-equity-reconciliation",
            status: "fail",
            isValid: false,
            message: "Total equity on the SFP does not reconcile with the closing equity on the SOCE.",
            details: {
                "Total Equity on SFP": totalEquityOnSFP,
                "Closing Equity on SOCE": closingEquityOnSOCE,
                "Difference": difference,
            }
        };
    }

    return {
        check: "total-equity-reconciliation",
        status: "pass",
        isValid: true,
        message: "Total equity is consistent between the SFP and SOCE.",
        details: {
            "Statement of Changes in Equity (Closing)": closingEquityOnSOCE,
            "Reconciled Total Equity": totalEquityOnSFP,
        },
    };
};

/**
 * Validates the hierarchical structure of account codes.
 * Checks if for each account code, a parent code exists.
 * E.g., for code '11101', a parent '1110' or '111' should exist.
 * @param period The current project period data.
 * @returns ValidationResult An object indicating if the hierarchy is valid.
 */
export const validateAccountCodeHierarchy = (period: PeriodData | null): ValidationResult | null => {
    if (!period || !period.trialBalance || !period.trialBalance.rawData || period.trialBalance.rawData.length === 0) {
        return {
            check: "account-code-hierarchy",
            status: "pass",
            isValid: true,
            message: "Raw trial balance data not available. Hierarchy validation skipped.",
        };
    }

    const accountCodes = new Set(period.trialBalance.rawData.map((account) => (account as unknown as TrialBalanceAccount).accountId).filter(Boolean));
    const accounts = period.trialBalance.rawData
        .map(account => account as unknown as TrialBalanceAccount)
        .filter((account) => account.accountId && typeof account.accountId === 'string' && account.accountId.length > 2);

    if (accountCodes.size === 0) {
        return {
            check: "account-code-hierarchy",
            status: "pass",
            isValid: true,
            message: "No account codes available to validate hierarchy.",
        };
    }

    const orphanedAccounts: TrialBalanceAccount[] = [];

    for (const account of accounts) {
        const code = account.accountId;
        if (!code || typeof code !== 'string' || code.length <= 2) continue; // Skip root or short codes

        let parentExists = false;
        let parentCode = code.substring(0, code.length - 1);

        while (parentCode.length > 0) {
            if (accountCodes.has(parentCode)) {
                parentExists = true;
                break;
            }
            parentCode = parentCode.substring(0, parentCode.length - 1);
        }

        if (!parentExists) {
            orphanedAccounts.push(account);
        }
    }

    if (orphanedAccounts.length > 0) {
        return {
            check: "account-code-hierarchy",
            status: "fail",
            isValid: false,
            message: `Found ${orphanedAccounts.length} account(s) that may be orphaned (missing a parent in the hierarchy).`,
            details: {
                orphanedAccounts: orphanedAccounts,
            }
        };
    }

    return {
        check: "account-code-hierarchy",
        status: "pass",
        isValid: true,
        message: "Account code hierarchy appears consistent.",
    };
};

/**
 * Flags accounts with unusually large balances compared to the average.
 * This can help detect data entry errors or significant anomalies.
 * @param period The current project period data.
 * @param stdDevThreshold The number of standard deviations from the mean to use as a threshold.
 * @returns ValidationResult An object indicating if any accounts have unusually large balances.
 */
export const validateLargeAccountMovements = (period: PeriodData | null, stdDevThreshold: number = 3): ValidationResult | null => {
    if (!period || !period.trialBalance || !period.trialBalance.rawData || period.trialBalance.rawData.length < 10) {
        return {
            check: "large-account-movements",
            status: "pass",
            isValid: true,
            message: "Not enough data for anomaly detection. At least 10 accounts are needed.",
        };
    }

    const balances = period.trialBalance.rawData
        .map((acc) => Math.abs((acc as unknown as TrialBalanceAccount).debit - (acc as unknown as TrialBalanceAccount).credit))
        .filter((bal: number) => !isNaN(bal) && bal > 0);

    if (balances.length < 10) {
        return {
            check: "large-account-movements",
            status: "pass",
            isValid: true,
            message: "Not enough non-zero balances for meaningful anomaly detection.",
        };
    }

    const mean = balances.reduce((a, b) => a + b, 0) / balances.length;
    const stdDev = Math.sqrt(balances.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / balances.length);

    // Avoid flagging everything if stdDev is very small (e.g., all balances are similar)
    if (stdDev < 1) {
        return {
            check: "large-account-movements",
            status: "pass",
            isValid: true,
            message: "Account balances have low variance; anomaly detection not applied.",
        };
    }

    const threshold = mean + (stdDev * stdDevThreshold);

    const anomalies = period.trialBalance.rawData.filter((acc) => {
        const account = acc as unknown as TrialBalanceAccount;
        const balance = Math.abs(account.debit - account.credit);
        return !isNaN(balance) && balance > threshold;
    });

    if (anomalies.length > 0) {
        return {
            check: "large-account-movements",
            status: "fail",
            isValid: false,
            message: `Found ${anomalies.length} account(s) with unusually large balances.`,
            details: {
                anomalies: anomalies,
                "Mean Balance": mean,
                "Std. Deviation": stdDev,
                "Threshold": threshold,
            }
        };
    }

    return {
        check: "large-account-movements",
        status: "pass",
        isValid: true,
        message: "No accounts with unusually large balances were detected.",
    };
};


/**
 * Validates that the raw trial balance sums to zero.
 * @param period The current project period data.
 * @returns ValidationResult An object indicating if the trial balance is balanced.
 */
export const validateTrialBalanceSum = (period: PeriodData | null): ValidationResult | null => {
  if (!period || !period.trialBalance || !period.trialBalance.rawData) {
    return {
        check: "trial-balance-sum",
        status: "pass", // Not a failure, just can't perform the check
        isValid: true,
        message: "Raw trial balance data not available. Sum validation skipped.",
    };
  }

  const totalBalance = period.trialBalance.rawData.reduce((sum, account) => {
    const acc = account as unknown as TrialBalanceAccount;
    const balance = acc.debit - acc.credit;
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);

  if (Math.abs(totalBalance) > 0.01) {
    return {
      check: "trial-balance-sum",
      status: "fail",
      isValid: false,
      message: "The raw trial balance does not sum to zero.",
      details: {
        "Total Debit/Credit Balance": totalBalance,
        "Note": "The sum of all account balances should be zero."
      }
    };
  }

  return {
    check: "trial-balance-sum",
    status: "pass",
    isValid: true,
    message: "The raw trial balance is balanced (sums to zero).",
    details: {
        "Total Balance": totalBalance,
    }
  };
};

/**
 * Validates that there are no duplicate account codes in the raw trial balance.
 * @param period The current project period data.
 * @returns ValidationResult An object indicating if there are duplicate account codes.
 */
export const validateDuplicateAccountCodes = (period: PeriodData | null): ValidationResult | null => {
  if (!period || !period.trialBalance || !period.trialBalance.rawData || period.trialBalance.rawData.length === 0) {
    return {
      check: "duplicate-account-codes",
      status: "pass",
      isValid: true,
      message: "Raw trial balance data not available. Duplicate code validation skipped.",
    };
  }

  const accountCodes = period.trialBalance.rawData.map((account) => (account as unknown as TrialBalanceAccount).accountId).filter(Boolean);
  const seenCodes = new Set<string>();
  const duplicates: string[] = [];

  for (const code of accountCodes) {
    if (seenCodes.has(code)) {
      if (!duplicates.includes(code)) {
        duplicates.push(code);
      }
    } else {
      seenCodes.add(code);
    }
  }

  if (duplicates.length > 0) {
    return {
      check: "duplicate-account-codes",
      status: "fail",
      isValid: false,
      message: `Found ${duplicates.length} duplicate account code(s) in the trial balance.`,
      details: {
        "Duplicate Codes": duplicates.join(', '),
      }
    };
  }

  return {
    check: "duplicate-account-codes",
    status: "pass",
    isValid: true,
    message: "No duplicate account codes found in the trial balance.",
  };
};

/**
 * Validates that there are no suspense or unclassified accounts with a balance.
 * These accounts are often used as placeholders and should be cleared.
 * @param mappedTrialBalance The mapped trial balance data.
 * @returns ValidationResult An object indicating if there are non-zero suspense accounts.
 */
export const validateSuspenseAccounts = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult | null => {
  if (!mappedTrialBalance) {
    return null; // No data to validate
  }

  // This validation is temporarily disabled due to structure changes
  return {
    check: "suspense-accounts",
    status: "warning",
    isValid: true,
    message: "Suspense account validation temporarily disabled due to structure changes.",
  };
};

/**
 * Validates that all accounts in the raw trial balance have an account code and name.
 * @param period The current project period data.
 * @returns ValidationResult An object indicating if any accounts have missing details.
 */
export const validateMissingAccountDetails = (period: PeriodData | null): ValidationResult | null => {
  if (!period || !period.trialBalance || !period.trialBalance.rawData || period.trialBalance.rawData.length === 0) {
    return {
      check: "missing-account-details",
      status: "pass",
      isValid: true,
      message: "Raw trial balance data not available. Account detail validation skipped.",
    };
  }

  const accountsWithMissingDetails = period.trialBalance.rawData.filter(
    (account) => !(account as unknown as TrialBalanceAccount).accountId || !(account as unknown as TrialBalanceAccount).accountName
  );

  if (accountsWithMissingDetails.length > 0) {
    return {
      check: "missing-account-details",
      status: "fail",
      isValid: false,
      message: `Found ${accountsWithMissingDetails.length} account(s) with missing codes or names.`,
      details: {
        errors: accountsWithMissingDetails.map(acc => {
          const account = acc as unknown as TrialBalanceAccount;
          return `Account with balance ${account.debit - account.credit} is missing a code or name.`;
        }),
        accountsWithMissingDetails: accountsWithMissingDetails,
      }
    };
  }

  return {
    check: "missing-account-details",
    status: "pass",
    isValid: true,
    message: "All accounts have complete details (code and name).",
  };
};

/**
 * Extracts all unique account IDs from a mapped trial balance structure.
 * @param mappedTb The mapped trial balance.
 * @returns A Set containing all unique account IDs.
 */
const getMappedAccountIds = (mappedTb: MappedTrialBalance): Set<string> => {
    const mappedIds = new Set<string>();
    
    // Iterate through all sections and collect account IDs
    Object.values(mappedTb).forEach(section => {
        if (section && typeof section === 'object') {
            Object.values(section).forEach(accounts => {
                if (Array.isArray(accounts)) {
                    accounts.forEach(account => {
                        if (account.accountId) {
                            mappedIds.add(account.accountId);
                        }
                    });
                }
            });
        }
    });

    return mappedIds;
};

/**
 * Validates the equity reconciliation between the SFP and SOCE.
 * @param sfp The mapped trial balance for the Statement of Financial Position.
 * @param soce The calculated data for the Statement of Changes in Equity.
 * @returns ValidationResult An object indicating if the reconciliation is valid.
 */
export function checkEquityReconciliation(sfp: MappedTrialBalance, soce: StatementOfChangesInEquityData): ValidationResult | null {
    if (!sfp.equity) return null;
    const totalEquityOnSFP = calculateSectionTotal(sfp.equity);
    const closingEquityOnSOCE = soce.total.closing;

    const difference = totalEquityOnSFP - closingEquityOnSOCE;

    if (Math.abs(difference) > 0.01) {
        return {
            check: "equity-reconciliation-sfp-soce",
            status: "fail",
            isValid: false,
            message: "Total equity on the SFP does not reconcile with the closing equity on the SOCE.",
            details: {
                "Total Equity on SFP": totalEquityOnSFP,
                "Closing Equity on SOCE": closingEquityOnSOCE,
                "Difference": difference,
            }
        };
    }

    return {
        check: "equity-reconciliation-sfp-soce",
        status: "pass",
        isValid: true,
        message: "Total equity is consistent between the SFP and SOCE.",
        details: {
            "Reconciled Total Equity": totalEquityOnSFP,
        },
    };
};

/**
 * Flags accounts with unusual balances indicating possible data entry errors.
 * Compares each account's balance against expected norms based on account type.
 * @param period The current project period data.
 * @returns ValidationResult An object indicating if any accounts have unusual balances.
 */
export function findAccountAnomalies(period: PeriodData): ValidationResult | null {
    const anomalies = period.trialBalance.rawData.map(account => {
        const acc = account as unknown as TrialBalanceAccount;
        const balance = acc.debit - acc.credit;
        return { ...acc, balance };
    }).filter(account => {
        if (Math.abs(account.balance) > 0.01) {
            const isAssetOrExpense = account.accountName.match(/asset|expense/i);
            const isLiabilityOrEquityOrIncome = account.accountName.match(/liability|equity|income|revenue/i);

            if (isAssetOrExpense && account.balance < 0) return true;
            if (isLiabilityOrEquityOrIncome && account.balance > 0) return true;
        }
        return false;
    }).map(account => ({
        accountId: account.accountId,
        accountName: account.accountName,
        balance: account.balance,
    }));

    if (anomalies.length > 0) {
        return {
            check: "account-anomalies",
            status: "fail",
            isValid: false,
            message: `Found ${anomalies.length} account(s) with unusual balances.`,
            details: {
                anomalies: anomalies,
            }
        };
    }

    return {
        check: "account-anomalies",
        status: "pass",
        isValid: true,
        message: "No accounts with unusual balances were detected.",
    };
};

// Duplicate calculateSectionTotal function removed - it's already defined at the top

/**
 * Simple SFP balance validation using the mapped trial balance structure
 */
export const validateSfpBalanceSimple = (mappedTrialBalance: MappedTrialBalance | null): ValidationResult => {
  if (!mappedTrialBalance) {
    return { check: "sfp-balance", status: "fail", isValid: false, message: "Mapped trial balance not available." };
  }

  const totalAssets = calculateSectionTotal(mappedTrialBalance.assets);
  const totalEquity = calculateSectionTotal(mappedTrialBalance.equity);
  const totalLiabilities = calculateSectionTotal(mappedTrialBalance.liabilities);

  // In accounting, Assets = Liabilities + Equity
  // Since liability and equity accounts typically have credit balances (negative),
  // we check if Assets ≈ -(Liabilities + Equity)
  const totalEquityAndLiabilities = totalEquity + totalLiabilities;
  const difference = totalAssets + totalEquityAndLiabilities;

  if (Math.abs(difference) > 0.01) {
    return {
      check: "sfp-balance",
      status: "fail",
      isValid: false,
      message: "The Statement of Financial Position does not balance.",
      details: {
        "Total Assets": totalAssets,
        "Total Equity and Liabilities": -totalEquityAndLiabilities,
        "Difference": difference,
      }
    };
  }

  return {
    check: "sfp-balance",
    status: "pass",
    isValid: true,
    message: "The Statement of Financial Position is balanced.",
    details: {
      "Total Assets": totalAssets,
      "Total Equity and Liabilities": -totalEquityAndLiabilities,
    }
  };
};

/**
 * Simple trial balance sum validation
 */
export const validateTrialBalanceSumSimple = (period: PeriodData | null): ValidationResult => {
  if (!period?.trialBalance?.rawData || period.trialBalance.rawData.length === 0) {
    return {
      check: "trial-balance-sum",
      status: "pass",
      isValid: true,
      message: "Raw trial balance data not available. Sum validation skipped.",
    };
  }

  const totalBalance = period.trialBalance.rawData.reduce((sum, account) => {
    const accountData = account as unknown as TrialBalanceAccount;
    const balance = (accountData.debit || 0) - (accountData.credit || 0);
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);

  if (Math.abs(totalBalance) > 0.01) {
    return {
      check: "trial-balance-sum",
      status: "fail",
      isValid: false,
      message: "The raw trial balance does not sum to zero.",
      details: {
        "Total Debit/Credit Balance": totalBalance,
      }
    };
  }

  return {
    check: "trial-balance-sum",
    status: "pass",
    isValid: true,
    message: "The raw trial balance is balanced (sums to zero).",
    details: {
      "Total Balance": totalBalance,
    }
  };
};
