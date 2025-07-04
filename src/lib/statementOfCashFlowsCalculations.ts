import type { TrialBalanceData, CashFlowData, CashFlowMethod, WorkingCapitalComponents } from '@/types/project';

/**
 * Enhanced Cash Flow Calculations
 * Supports both direct and indirect methods with comprehensive working capital and non-cash adjustments
 */

export interface CashFlowCalculationOptions {
  method: CashFlowMethod;
  includeNonCashAdjustments: boolean;
  includeWorkingCapitalDetail: boolean;
  previousPeriodData?: TrialBalanceData | null;
}

export interface DetailedCashFlowData extends CashFlowData {
  method: CashFlowMethod;
  workingCapitalComponents?: WorkingCapitalComponents;
  nonCashAdjustments?: {
    depreciation: number;
    amortization: number;
    impairment: number;
    gainOnDisposal: number;
    shareBasedPayments: number;
    foreignExchangeGains: number;
    other: number;
  };
  operatingActivitiesDetail?: {
    netIncome: number;
    adjustments: number;
    workingCapitalChanges: number;
  };
}

// Re-export types for convenience
export type { CashFlowMethod } from '@/types/project';

/**
 * Calculate statement of cash flows with enhanced features
 */
export function calculateStatementOfCashFlows(
  trialBalance: TrialBalanceData | null,
  options: Partial<CashFlowCalculationOptions> = {}
): DetailedCashFlowData | null {
  if (!trialBalance) return null;

  const {
    method = 'indirect',
    includeNonCashAdjustments = true,
    includeWorkingCapitalDetail = true,
    previousPeriodData = null
  } = options;

  if (method === 'direct') {
    return calculateDirectMethod(trialBalance, previousPeriodData, {
      includeNonCashAdjustments,
      includeWorkingCapitalDetail
    });
  } else {
    return calculateIndirectMethod(trialBalance, previousPeriodData, {
      includeNonCashAdjustments,
      includeWorkingCapitalDetail
    });
  }
}

/**
 * Calculate cash flows using the indirect method
 */
function calculateIndirectMethod(
  trialBalance: TrialBalanceData,
  previousPeriod: TrialBalanceData | null,
  options: { includeNonCashAdjustments: boolean; includeWorkingCapitalDetail: boolean }
): DetailedCashFlowData {
  const accounts = trialBalance.rawData;
  
  // Get key amounts
  const netIncome = getAccountBalance(accounts, 'Net Income') || 
                   (getAccountBalance(accounts, 'Revenue') - getAccountBalance(accounts, 'Expenses'));
  
  // Non-cash adjustments
  const nonCashAdjustments = options.includeNonCashAdjustments ? {
    depreciation: getAccountBalance(accounts, 'Depreciation Expense') || 0,
    amortization: getAccountBalance(accounts, 'Amortization Expense') || 0,
    impairment: getAccountBalance(accounts, 'Impairment Loss') || 0,
    gainOnDisposal: -(getAccountBalance(accounts, 'Gain on Disposal') || 0),
    shareBasedPayments: getAccountBalance(accounts, 'Share-based Payment Expense') || 0,
    foreignExchangeGains: -(getAccountBalance(accounts, 'Foreign Exchange Gain') || 0),
    other: 0
  } : undefined;

  const totalNonCashAdjustments = nonCashAdjustments ? 
    Object.values(nonCashAdjustments).reduce((sum, val) => sum + val, 0) : 0;

  // Working capital changes
  const workingCapitalChanges = calculateWorkingCapitalChanges(accounts, previousPeriod);
  const workingCapitalComponents = options.includeWorkingCapitalDetail ? 
    calculateWorkingCapitalComponents(accounts, previousPeriod) : undefined;

  // Operating activities
  const operatingCashFlow = netIncome + totalNonCashAdjustments + workingCapitalChanges.total;

  const operating = {
    id: 'operating',
    label: 'Operating Activities',
    items: [
      {
        id: 'net-income',
        label: 'Net income',
        value: netIncome
      },
      ...(nonCashAdjustments ? [
        {
          id: 'depreciation',
          label: 'Depreciation and amortization',
          value: nonCashAdjustments.depreciation + nonCashAdjustments.amortization
        },
        ...(nonCashAdjustments.impairment !== 0 ? [{
          id: 'impairment',
          label: 'Impairment losses',
          value: nonCashAdjustments.impairment
        }] : []),
        ...(nonCashAdjustments.gainOnDisposal !== 0 ? [{
          id: 'gain-disposal',
          label: 'Gain on disposal of assets',
          value: nonCashAdjustments.gainOnDisposal
        }] : []),
        ...(nonCashAdjustments.shareBasedPayments !== 0 ? [{
          id: 'share-based',
          label: 'Share-based payment expense',
          value: nonCashAdjustments.shareBasedPayments
        }] : [])
      ] : []),
      ...workingCapitalChanges.items
    ],
    total: operatingCashFlow
  };

  // Investing activities
  const investing = calculateInvestingActivities(accounts, previousPeriod);

  // Financing activities
  const financing = calculateFinancingActivities(accounts, previousPeriod);

  // Net increase and cash balances
  const netIncrease = operating.total + investing.total + financing.total;
  const cashAtBeginning = previousPeriod ? 
    getAccountBalance(previousPeriod.rawData, 'Cash and Cash Equivalents') || 0 : 0;
  const cashAtEnd = getAccountBalance(accounts, 'Cash and Cash Equivalents') || 0;

  return {
    method: 'indirect',
    operating,
    investing,
    financing,
    netIncrease,
    cashAtBeginning,
    cashAtEnd,
    nonCashAdjustments,
    workingCapitalComponents,
    operatingActivitiesDetail: {
      netIncome,
      adjustments: totalNonCashAdjustments,
      workingCapitalChanges: workingCapitalChanges.total
    }
  };
}

/**
 * Calculate cash flows using the direct method
 */
function calculateDirectMethod(
  trialBalance: TrialBalanceData,
  previousPeriod: TrialBalanceData | null,
  options: { includeNonCashAdjustments: boolean; includeWorkingCapitalDetail: boolean }
): DetailedCashFlowData {
  const accounts = trialBalance.rawData;

  // Direct method operating activities
  const cashFromCustomers = getAccountBalance(accounts, 'Cash Receipts from Customers') || 
                           estimateCashFromCustomers(accounts, previousPeriod);
  const cashToSuppliers = getAccountBalance(accounts, 'Cash Payments to Suppliers') || 
                         estimateCashToSuppliers(accounts, previousPeriod);
  const cashToEmployees = getAccountBalance(accounts, 'Cash Payments to Employees') || 
                         getAccountBalance(accounts, 'Salary Expense') || 0;
  const cashForOperatingExpenses = getAccountBalance(accounts, 'Cash for Operating Expenses') || 
                                  estimateOperatingCashPayments(accounts, previousPeriod);
  const interestReceived = getAccountBalance(accounts, 'Interest Received') || 0;
  const interestPaid = getAccountBalance(accounts, 'Interest Paid') || 
                      getAccountBalance(accounts, 'Interest Expense') || 0;
  const incomeTaxPaid = getAccountBalance(accounts, 'Income Tax Paid') || 
                       getAccountBalance(accounts, 'Income Tax Expense') || 0;

  const operatingCashFlow = cashFromCustomers - cashToSuppliers - cashToEmployees - 
                           cashForOperatingExpenses + interestReceived - interestPaid - incomeTaxPaid;

  const operating = {
    id: 'operating',
    label: 'Operating Activities',
    items: [
      {
        id: 'cash-from-customers',
        label: 'Cash receipts from customers',
        value: cashFromCustomers
      },
      {
        id: 'cash-to-suppliers',
        label: 'Cash payments to suppliers',
        value: -cashToSuppliers
      },
      {
        id: 'cash-to-employees',
        label: 'Cash payments to employees',
        value: -cashToEmployees
      },
      {
        id: 'cash-operating-expenses',
        label: 'Cash payments for operating expenses',
        value: -cashForOperatingExpenses
      },
      ...(interestReceived !== 0 ? [{
        id: 'interest-received',
        label: 'Interest received',
        value: interestReceived
      }] : []),
      ...(interestPaid !== 0 ? [{
        id: 'interest-paid',
        label: 'Interest paid',
        value: -interestPaid
      }] : []),
      ...(incomeTaxPaid !== 0 ? [{
        id: 'tax-paid',
        label: 'Income tax paid',
        value: -incomeTaxPaid
      }] : [])
    ],
    total: operatingCashFlow
  };

  // Investing and financing activities are the same for both methods
  const investing = calculateInvestingActivities(accounts, previousPeriod);
  const financing = calculateFinancingActivities(accounts, previousPeriod);

  const netIncrease = operating.total + investing.total + financing.total;
  const cashAtBeginning = previousPeriod ? 
    getAccountBalance(previousPeriod.rawData, 'Cash and Cash Equivalents') || 0 : 0;
  const cashAtEnd = getAccountBalance(accounts, 'Cash and Cash Equivalents') || 0;

  // Calculate working capital components if requested
  const workingCapitalComponents = options.includeWorkingCapitalDetail ? 
    calculateWorkingCapitalComponents(accounts, previousPeriod) : undefined;

  return {
    method: 'direct',
    operating,
    investing,
    financing,
    netIncrease,
    cashAtBeginning,
    cashAtEnd,
    workingCapitalComponents
  };
}

/**
 * Calculate working capital changes for indirect method
 */
function calculateWorkingCapitalChanges(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
) {
  if (!previousPeriod) {
    return { items: [], total: 0 };
  }

  const changes = [
    {
      id: 'accounts-receivable',
      label: 'Increase in accounts receivable',
      current: getAccountBalance(accounts, 'Accounts Receivable') || 0,
      previous: getAccountBalance(previousPeriod.rawData, 'Accounts Receivable') || 0
    },
    {
      id: 'inventory',
      label: 'Increase in inventory',
      current: getAccountBalance(accounts, 'Inventory') || 0,
      previous: getAccountBalance(previousPeriod.rawData, 'Inventory') || 0
    },
    {
      id: 'prepaid-expenses',
      label: 'Increase in prepaid expenses',
      current: getAccountBalance(accounts, 'Prepaid Expenses') || 0,
      previous: getAccountBalance(previousPeriod.rawData, 'Prepaid Expenses') || 0
    },
    {
      id: 'accounts-payable',
      label: 'Increase in accounts payable',
      current: getAccountBalance(accounts, 'Accounts Payable') || 0,
      previous: getAccountBalance(previousPeriod.rawData, 'Accounts Payable') || 0
    },
    {
      id: 'accrued-liabilities',
      label: 'Increase in accrued liabilities',
      current: getAccountBalance(accounts, 'Accrued Liabilities') || 0,
      previous: getAccountBalance(previousPeriod.rawData, 'Accrued Liabilities') || 0
    }
  ];

  const items = changes
    .map(change => {
      const increase = change.current - change.previous;
      // For assets, increases reduce cash flow (negative)
      // For liabilities, increases improve cash flow (positive)
      const cashFlowEffect = change.id.includes('payable') || change.id.includes('accrued') ? 
        increase : -increase;
      
      return {
        id: change.id,
        label: increase >= 0 ? change.label : change.label.replace('Increase', 'Decrease'),
        value: cashFlowEffect
      };
    })
    .filter(item => Math.abs(item.value) > 0.01); // Only include material changes

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return { items, total };
}

/**
 * Calculate detailed working capital components
 */
function calculateWorkingCapitalComponents(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
): WorkingCapitalComponents {
  const current = {
    accountsReceivable: getAccountBalance(accounts, 'Accounts Receivable') || 0,
    inventory: getAccountBalance(accounts, 'Inventory') || 0,
    prepaidExpenses: getAccountBalance(accounts, 'Prepaid Expenses') || 0,
    accountsPayable: getAccountBalance(accounts, 'Accounts Payable') || 0,
    accruedLiabilities: getAccountBalance(accounts, 'Accrued Liabilities') || 0
  };

  const previous = previousPeriod ? {
    accountsReceivable: getAccountBalance(previousPeriod.rawData, 'Accounts Receivable') || 0,
    inventory: getAccountBalance(previousPeriod.rawData, 'Inventory') || 0,
    prepaidExpenses: getAccountBalance(previousPeriod.rawData, 'Prepaid Expenses') || 0,
    accountsPayable: getAccountBalance(previousPeriod.rawData, 'Accounts Payable') || 0,
    accruedLiabilities: getAccountBalance(previousPeriod.rawData, 'Accrued Liabilities') || 0
  } : {
    accountsReceivable: 0,
    inventory: 0,
    prepaidExpenses: 0,
    accountsPayable: 0,
    accruedLiabilities: 0
  };

  return {
    current,
    previous,
    changes: {
      accountsReceivable: current.accountsReceivable - previous.accountsReceivable,
      inventory: current.inventory - previous.inventory,
      prepaidExpenses: current.prepaidExpenses - previous.prepaidExpenses,
      accountsPayable: current.accountsPayable - previous.accountsPayable,
      accruedLiabilities: current.accruedLiabilities - previous.accruedLiabilities
    }
  };
}

/**
 * Calculate investing activities
 */
function calculateInvestingActivities(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
) {
  const purchaseOfPPE = getAccountBalance(accounts, 'Capital Expenditures') || 
                       estimatePPEPurchases(accounts, previousPeriod);
  const proceedsFromDisposal = getAccountBalance(accounts, 'Proceeds from Asset Disposal') || 0;
  const investmentPurchases = getAccountBalance(accounts, 'Investment Purchases') || 0;
  const investmentSales = getAccountBalance(accounts, 'Investment Sales') || 0;
  const acquisitions = getAccountBalance(accounts, 'Business Acquisitions') || 0;

  const items = [
    ...(purchaseOfPPE !== 0 ? [{
      id: 'ppe-purchases',
      label: 'Purchase of property, plant and equipment',
      value: -Math.abs(purchaseOfPPE)
    }] : []),
    ...(proceedsFromDisposal !== 0 ? [{
      id: 'asset-disposal',
      label: 'Proceeds from disposal of assets',
      value: proceedsFromDisposal
    }] : []),
    ...(investmentPurchases !== 0 ? [{
      id: 'investment-purchases',
      label: 'Purchase of investments',
      value: -Math.abs(investmentPurchases)
    }] : []),
    ...(investmentSales !== 0 ? [{
      id: 'investment-sales',
      label: 'Proceeds from sale of investments',
      value: investmentSales
    }] : []),
    ...(acquisitions !== 0 ? [{
      id: 'acquisitions',
      label: 'Acquisitions, net of cash acquired',
      value: -Math.abs(acquisitions)
    }] : [])
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return {
    id: 'investing',
    label: 'Investing Activities',
    items,
    total
  };
}

/**
 * Calculate financing activities
 */
function calculateFinancingActivities(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
) {
  const borrowings = getAccountBalance(accounts, 'Proceeds from Borrowings') || 
                    estimateBorrowingChanges(accounts, previousPeriod);
  const debtRepayments = getAccountBalance(accounts, 'Debt Repayments') || 0;
  const equityIssuance = getAccountBalance(accounts, 'Share Issuance Proceeds') || 
                        estimateEquityChanges(accounts, previousPeriod);
  const dividendsPaid = getAccountBalance(accounts, 'Dividends Paid') || 0;
  const shareRepurchases = getAccountBalance(accounts, 'Share Repurchases') || 0;

  const items = [
    ...(borrowings !== 0 ? [{
      id: 'borrowings',
      label: 'Proceeds from borrowings',
      value: borrowings
    }] : []),
    ...(debtRepayments !== 0 ? [{
      id: 'debt-repayments',
      label: 'Repayment of borrowings',
      value: -Math.abs(debtRepayments)
    }] : []),
    ...(equityIssuance !== 0 ? [{
      id: 'equity-issuance',
      label: 'Proceeds from issuance of shares',
      value: equityIssuance
    }] : []),
    ...(dividendsPaid !== 0 ? [{
      id: 'dividends',
      label: 'Dividends paid',
      value: -Math.abs(dividendsPaid)
    }] : []),
    ...(shareRepurchases !== 0 ? [{
      id: 'share-repurchases',
      label: 'Purchase of treasury shares',
      value: -Math.abs(shareRepurchases)
    }] : [])
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return {
    id: 'financing',
    label: 'Financing Activities',
    items,
    total
  };
}

// Utility functions

function getAccountBalance(accounts: TrialBalanceData['rawData'], accountName: string): number {
  const account = accounts.find(acc => 
    acc.accountName?.toLowerCase().includes(accountName.toLowerCase())
  );
  // Calculate balance as debit minus credit (for most account types)
  // This might need refinement based on account type (assets/expenses vs liabilities/equity/revenue)
  return account ? (account.debit - account.credit) : 0;
}

function estimateCashFromCustomers(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
): number {
  const revenue = getAccountBalance(accounts, 'Revenue');
  const arCurrent = getAccountBalance(accounts, 'Accounts Receivable');
  const arPrevious = previousPeriod ? getAccountBalance(previousPeriod.rawData, 'Accounts Receivable') : 0;
  return revenue - (arCurrent - arPrevious);
}

function estimateCashToSuppliers(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
): number {
  const cogs = getAccountBalance(accounts, 'Cost of Goods Sold');
  const inventoryCurrent = getAccountBalance(accounts, 'Inventory');
  const inventoryPrevious = previousPeriod ? getAccountBalance(previousPeriod.rawData, 'Inventory') : 0;
  const apCurrent = getAccountBalance(accounts, 'Accounts Payable');
  const apPrevious = previousPeriod ? getAccountBalance(previousPeriod.rawData, 'Accounts Payable') : 0;
  
  return cogs + (inventoryCurrent - inventoryPrevious) - (apCurrent - apPrevious);
}

function estimateOperatingCashPayments(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
): number {
  const operatingExpenses = getAccountBalance(accounts, 'Operating Expenses') +
                           getAccountBalance(accounts, 'Administrative Expenses') +
                           getAccountBalance(accounts, 'Selling Expenses');
  const depreciation = getAccountBalance(accounts, 'Depreciation Expense');
  const prepaidCurrent = getAccountBalance(accounts, 'Prepaid Expenses');
  const prepaidPrevious = previousPeriod ? getAccountBalance(previousPeriod.rawData, 'Prepaid Expenses') : 0;
  
  return operatingExpenses - depreciation + (prepaidCurrent - prepaidPrevious);
}

function estimatePPEPurchases(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
): number {
  if (!previousPeriod) return 0;
  
  const ppeCurrent = getAccountBalance(accounts, 'Property, Plant and Equipment');
  const ppePrevious = getAccountBalance(previousPeriod.rawData, 'Property, Plant and Equipment');
  const depreciation = getAccountBalance(accounts, 'Depreciation Expense');
  const disposals = getAccountBalance(accounts, 'Asset Disposals') || 0;
  
  return ppeCurrent - ppePrevious + depreciation + disposals;
}

function estimateBorrowingChanges(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
): number {
  if (!previousPeriod) return 0;
  
  const debtCurrent = getAccountBalance(accounts, 'Long-term Debt') + 
                     getAccountBalance(accounts, 'Short-term Debt');
  const debtPrevious = getAccountBalance(previousPeriod.rawData, 'Long-term Debt') + 
                      getAccountBalance(previousPeriod.rawData, 'Short-term Debt');
  
  return Math.max(0, debtCurrent - debtPrevious); // Only net increases
}

function estimateEquityChanges(
  accounts: TrialBalanceData['rawData'],
  previousPeriod: TrialBalanceData | null
): number {
  if (!previousPeriod) return 0;
  
  const equityCurrent = getAccountBalance(accounts, 'Share Capital') + 
                       getAccountBalance(accounts, 'Additional Paid-in Capital');
  const equityPrevious = getAccountBalance(previousPeriod.rawData, 'Share Capital') + 
                        getAccountBalance(previousPeriod.rawData, 'Additional Paid-in Capital');
  
  return Math.max(0, equityCurrent - equityPrevious); // Only net increases
}

/**
 * Validate cash flow statement for mathematical accuracy
 */
export function validateCashFlowStatement(cashFlowData: DetailedCashFlowData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if net change equals ending minus beginning cash
  const calculatedChange = cashFlowData.cashAtEnd - cashFlowData.cashAtBeginning;
  const reportedChange = cashFlowData.netIncrease;
  
  if (Math.abs(calculatedChange - reportedChange) > 0.01) {
    errors.push(
      `Net change in cash (${reportedChange}) does not equal ending cash (${cashFlowData.cashAtEnd}) ` +
      `minus beginning cash (${cashFlowData.cashAtBeginning})`
    );
  }

  // Check for negative cash receipts in direct method
  if (cashFlowData.method === 'direct') {
    const negativeReceipts = cashFlowData.operating.items.filter(item => 
      item.id.includes('receipts') && item.value < 0
    );
    if (negativeReceipts.length > 0) {
      warnings.push('Negative cash receipts detected - please verify amounts');
    }
  }

  // Check for unusually large cash flows
  const totalAssets = Math.abs(cashFlowData.operating.total) + 
                     Math.abs(cashFlowData.investing.total) + 
                     Math.abs(cashFlowData.financing.total);
  
  if (Math.abs(cashFlowData.netIncrease) > totalAssets * 0.5) {
    warnings.push('Net cash change is unusually large relative to total cash flows');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
