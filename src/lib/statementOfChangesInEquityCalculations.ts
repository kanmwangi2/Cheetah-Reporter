import type { TrialBalanceData, TrialBalanceAccount, StatementOfChangesInEquityData, EquityComponent } from '../types/project';

/**
 * Enhanced Statement of Changes in Equity Calculations
 * Supports complex equity structures, treasury shares, dividend tracking, and share-based payments
 */

export interface EquityCalculationOptions {
  includeTreasuryShares: boolean;
  includeShareBasedPayments: boolean;
  includeDividendDetails: boolean;
  includeMultiClassShares: boolean;
  previousPeriodData?: TrialBalanceData | null;
}

export interface EnhancedEquityComponent extends EquityComponent {
  shareBasedPayments?: number;
  treasuryShares?: number;
  shareRepurchases?: number;
  foreignCurrencyTranslation?: number;
  actuarialGains?: number;
  fairValueReserve?: number;
}

export interface DetailedEquityData extends StatementOfChangesInEquityData {
  shareCapital: EnhancedEquityComponent;
  retainedEarnings: EnhancedEquityComponent;
  otherReserves: EnhancedEquityComponent;
  total: EnhancedEquityComponent;
  treasuryStock?: EnhancedEquityComponent;
  additionalPaidInCapital?: EnhancedEquityComponent;
  accumulatedOCI?: EnhancedEquityComponent;
  dividendDetails?: {
    interimDividends: number;
    finalDividends: number;
    totalDividendsPerShare: number;
    dividendYield: number;
  };
  shareDetails?: {
    sharesOutstandingOpening: number;
    sharesIssued: number;
    sharesPurchased: number;
    sharesOutstandingClosing: number;
    weightedAverageShares: number;
  };
}

// Enhanced types for equity calculations
export interface EquityBalances {
  shareCapitalOpening: number;
  additionalPaidInOpening: number;
  retainedEarningsOpening: number;
  accumulatedOCIOpening: number;
  otherReservesOpening: number;
  treasuryStockOpening: number;
  shareCapitalCurrent: number;
  additionalPaidInCurrent: number;
  retainedEarningsCurrent: number;
  accumulatedOCICurrent: number;
  otherReservesCurrent: number;
  treasuryStockCurrent: number;
}

export interface OCIComponents {
  foreignCurrencyTranslation: number;
  unrealizedGains: number;
  actuarialGains: number;
  cashFlowHedge: number;
  fairValueReserve: number;
  total: number;
}

export interface ShareTransactionDetails {
  sharesOutstandingOpening: number;
  sharesIssued: number;
  sharesPurchased: number;
  sharesOutstandingClosing: number;
  weightedAverageShares: number;
}

export interface DividendDetails {
  interimDividends: number;
  finalDividends: number;
  totalDividendsPerShare: number;
  dividendYield: number;
}

/**
 * Calculate enhanced statement of changes in equity
 */
export function calculateStatementOfChangesInEquity(
  trialBalance: TrialBalanceData | null,
  options: Partial<EquityCalculationOptions> = {}
): DetailedEquityData {
  if (!trialBalance) {
    return createEmptyEquityData();
  }

  const {
    includeTreasuryShares = true,
    includeShareBasedPayments = true,
    includeDividendDetails = true,
    previousPeriodData = null
  } = options;

  const accounts = trialBalance.accounts;

  // Get all equity-related balances
  const equityBalances = getEquityBalances(accounts, previousPeriodData);
  
  // Calculate profit/loss for the year
  const profitLoss = calculateProfitLoss(accounts);
  
  // Calculate other comprehensive income components
  const ociComponents = calculateOCIComponents(accounts);
  
  // Calculate share transactions
  const shareTransactions = calculateShareTransactions(accounts, previousPeriodData);
  
  // Calculate dividend information
  const dividendInfo = includeDividendDetails ? calculateDividendDetails(accounts, shareTransactions) : undefined;

  // Build equity components
  const shareCapital = buildShareCapitalComponent(equityBalances, accounts, includeShareBasedPayments);
  const additionalPaidInCapital = buildAdditionalPaidInCapital(equityBalances);
  const retainedEarnings = buildRetainedEarningsComponent(equityBalances, profitLoss, dividendInfo);
  const accumulatedOCI = buildAccumulatedOCIComponent(equityBalances, ociComponents);
  const otherReserves = buildOtherReservesComponent(equityBalances);
  const treasuryStock = includeTreasuryShares ? buildTreasuryStockComponent(equityBalances, shareTransactions) : undefined;

  // Calculate totals
  const total = calculateTotalEquity([shareCapital, additionalPaidInCapital, retainedEarnings, accumulatedOCI, otherReserves], treasuryStock);

  return {
    shareCapital,
    additionalPaidInCapital,
    retainedEarnings,
    otherReserves,
    accumulatedOCI,
    treasuryStock,
    total,
    dividendDetails: dividendInfo,
    shareDetails: shareTransactions
  };
}

function createEmptyEquityData(): DetailedEquityData {
  const emptyComponent: EnhancedEquityComponent = {
    opening: 0,
    profit: 0,
    oci: 0,
    issued: 0,
    dividends: 0,
    closing: 0,
    shareBasedPayments: 0,
    treasuryShares: 0,
    shareRepurchases: 0,
    foreignCurrencyTranslation: 0,
    actuarialGains: 0,
    fairValueReserve: 0
  };

  return {
    shareCapital: { ...emptyComponent },
    retainedEarnings: { ...emptyComponent },
    otherReserves: { ...emptyComponent },
    total: { ...emptyComponent }
  };
}

function getEquityBalances(accounts: TrialBalanceAccount[], previousPeriod: TrialBalanceData | null): EquityBalances {
  return {
    // Opening balances (from previous period or manual input)
    shareCapitalOpening: previousPeriod ? getAccountBalance(previousPeriod.accounts, 'Share Capital') : 0,
    additionalPaidInOpening: previousPeriod ? getAccountBalance(previousPeriod.accounts, 'Additional Paid-in Capital') : 0,
    retainedEarningsOpening: previousPeriod ? getAccountBalance(previousPeriod.accounts, 'Retained Earnings') : 0,
    accumulatedOCIOpening: previousPeriod ? getAccountBalance(previousPeriod.accounts, 'Accumulated Other Comprehensive Income') : 0,
    otherReservesOpening: previousPeriod ? getAccountBalance(previousPeriod.accounts, 'Other Reserves') : 0,
    treasuryStockOpening: previousPeriod ? getAccountBalance(previousPeriod.accounts, 'Treasury Stock') : 0,

    // Current period balances
    shareCapitalCurrent: getAccountBalance(accounts, 'Share Capital'),
    additionalPaidInCurrent: getAccountBalance(accounts, 'Additional Paid-in Capital'),
    retainedEarningsCurrent: getAccountBalance(accounts, 'Retained Earnings'),
    accumulatedOCICurrent: getAccountBalance(accounts, 'Accumulated Other Comprehensive Income'),
    otherReservesCurrent: getAccountBalance(accounts, 'Other Reserves'),
    treasuryStockCurrent: getAccountBalance(accounts, 'Treasury Stock')
  };
}

function calculateOCIComponents(accounts: TrialBalanceAccount[]): OCIComponents {
  const components = {
    foreignCurrencyTranslation: getAccountBalance(accounts, 'Foreign Currency Translation Adjustment'),
    unrealizedGains: getAccountBalance(accounts, 'Unrealized Gains on Securities'),
    actuarialGains: getAccountBalance(accounts, 'Actuarial Gains on Pension Plans'),
    cashFlowHedge: getAccountBalance(accounts, 'Cash Flow Hedge Reserve'),
    fairValueReserve: getAccountBalance(accounts, 'Fair Value Reserve'),
    total: 0
  };
  
  components.total = components.foreignCurrencyTranslation + components.unrealizedGains + 
                   components.actuarialGains + components.cashFlowHedge + components.fairValueReserve;
  
  return components;
}

function calculateProfitLoss(accounts: TrialBalanceAccount[]): number {
  // Calculate profit/loss by summing revenue and subtracting expenses
  const revenue = getAccountBalance(accounts, 'Revenue') + 
                 getAccountBalance(accounts, 'Sales') +
                 getAccountBalance(accounts, 'Income');
  
  const expenses = getAccountBalance(accounts, 'Expenses') +
                  getAccountBalance(accounts, 'Cost of Goods Sold') +
                  getAccountBalance(accounts, 'Operating Expenses') +
                  getAccountBalance(accounts, 'Administrative Expenses');
  
  // Also check for direct net income account
  const netIncome = getAccountBalance(accounts, 'Net Income') ||
                   getAccountBalance(accounts, 'Profit for the Year');
  
  return netIncome || (revenue - expenses);
}

function calculateWeightedAverageShares(opening: number, issued: number, purchased: number): number {
  // Simplified weighted average calculation
  // In reality, this would need to consider timing of share transactions
  const netChange = issued - purchased;
  return opening + (netChange / 2); // Assumes transactions occurred mid-year
}

function calculateShareTransactions(accounts: TrialBalanceAccount[], previousPeriod: TrialBalanceData | null): ShareTransactionDetails {
  const sharesOutstandingOpening = previousPeriod ? 
    getAccountBalance(previousPeriod.accounts, 'Shares Outstanding') : 0;
  
  const sharesIssued = getAccountBalance(accounts, 'Shares Issued During Period');
  const sharesPurchased = getAccountBalance(accounts, 'Treasury Shares Purchased');
  const sharesOutstandingClosing = getAccountBalance(accounts, 'Shares Outstanding');

  return {
    sharesOutstandingOpening,
    sharesIssued,
    sharesPurchased,
    sharesOutstandingClosing: sharesOutstandingClosing || (sharesOutstandingOpening + sharesIssued - sharesPurchased),
    weightedAverageShares: calculateWeightedAverageShares(sharesOutstandingOpening, sharesIssued, sharesPurchased)
  };
}

function calculateDividendDetails(accounts: TrialBalanceAccount[], shareDetails: ShareTransactionDetails): DividendDetails {
  const interimDividends = getAccountBalance(accounts, 'Interim Dividends Paid');
  const finalDividends = getAccountBalance(accounts, 'Final Dividends Paid');
  const totalDividends = interimDividends + finalDividends;
  
  const totalDividendsPerShare = shareDetails.weightedAverageShares > 0 ? 
    totalDividends / shareDetails.weightedAverageShares : 0;
  
  // Simplified dividend yield calculation (would need share price data)
  const dividendYield = 0; // Would calculate as (totalDividendsPerShare / sharePrice) * 100

  return {
    interimDividends,
    finalDividends,
    totalDividendsPerShare,
    dividendYield
  };
}

function buildShareCapitalComponent(balances: EquityBalances, accounts: TrialBalanceAccount[], includeShareBased: boolean): EnhancedEquityComponent {
  const shareBasedPayments = includeShareBased ? 
    getAccountBalance(accounts, 'Share-based Payment Expense') : 0;

  return {
    opening: balances.shareCapitalOpening,
    profit: 0,
    oci: 0,
    issued: balances.shareCapitalCurrent - balances.shareCapitalOpening,
    dividends: 0,
    closing: balances.shareCapitalCurrent,
    shareBasedPayments,
    treasuryShares: 0,
    shareRepurchases: 0,
    foreignCurrencyTranslation: 0,
    actuarialGains: 0,
    fairValueReserve: 0
  };
}

function buildAdditionalPaidInCapital(balances: EquityBalances): EnhancedEquityComponent {
  return {
    opening: balances.additionalPaidInOpening,
    profit: 0,
    oci: 0,
    issued: balances.additionalPaidInCurrent - balances.additionalPaidInOpening,
    dividends: 0,
    closing: balances.additionalPaidInCurrent,
    shareBasedPayments: 0,
    treasuryShares: 0,
    shareRepurchases: 0,
    foreignCurrencyTranslation: 0,
    actuarialGains: 0,
    fairValueReserve: 0
  };
}

function buildRetainedEarningsComponent(balances: EquityBalances, profitLoss: number, dividendInfo?: DividendDetails): EnhancedEquityComponent {
  const dividends = dividendInfo ? -(dividendInfo.interimDividends + dividendInfo.finalDividends) : 0;

  return {
    opening: balances.retainedEarningsOpening,
    profit: profitLoss,
    oci: 0,
    issued: 0,
    dividends,
    closing: balances.retainedEarningsOpening + profitLoss + dividends,
    shareBasedPayments: 0,
    treasuryShares: 0,
    shareRepurchases: 0,
    foreignCurrencyTranslation: 0,
    actuarialGains: 0,
    fairValueReserve: 0
  };
}

function buildAccumulatedOCIComponent(balances: EquityBalances, ociComponents: OCIComponents): EnhancedEquityComponent {
  return {
    opening: balances.accumulatedOCIOpening,
    profit: 0,
    oci: ociComponents.total,
    issued: 0,
    dividends: 0,
    closing: balances.accumulatedOCIOpening + ociComponents.total,
    shareBasedPayments: 0,
    treasuryShares: 0,
    shareRepurchases: 0,
    foreignCurrencyTranslation: ociComponents.foreignCurrencyTranslation,
    actuarialGains: ociComponents.actuarialGains,
    fairValueReserve: ociComponents.fairValueReserve
  };
}

function buildOtherReservesComponent(balances: EquityBalances): EnhancedEquityComponent {
  return {
    opening: balances.otherReservesOpening,
    profit: 0,
    oci: 0,
    issued: 0,
    dividends: 0,
    closing: balances.otherReservesCurrent,
    shareBasedPayments: 0,
    treasuryShares: 0,
    shareRepurchases: 0,
    foreignCurrencyTranslation: 0,
    actuarialGains: 0,
    fairValueReserve: 0
  };
}

function buildTreasuryStockComponent(balances: EquityBalances, shareTransactions: ShareTransactionDetails): EnhancedEquityComponent {
  const shareRepurchases = shareTransactions.sharesPurchased || 0;

  return {
    opening: balances.treasuryStockOpening,
    profit: 0,
    oci: 0,
    issued: 0,
    dividends: 0,
    closing: balances.treasuryStockCurrent,
    shareBasedPayments: 0,
    treasuryShares: balances.treasuryStockCurrent - balances.treasuryStockOpening,
    shareRepurchases,
    foreignCurrencyTranslation: 0,
    actuarialGains: 0,
    fairValueReserve: 0
  };
}

function calculateTotalEquity(components: EnhancedEquityComponent[], treasuryStock?: EnhancedEquityComponent): EnhancedEquityComponent {
  const totals = components.reduce((acc, comp) => ({
    opening: acc.opening + comp.opening,
    profit: acc.profit + comp.profit,
    oci: acc.oci + comp.oci,
    issued: acc.issued + comp.issued,
    dividends: acc.dividends + comp.dividends,
    closing: acc.closing + comp.closing,
    shareBasedPayments: (acc.shareBasedPayments || 0) + (comp.shareBasedPayments || 0),
    treasuryShares: (acc.treasuryShares || 0) + (comp.treasuryShares || 0),
    shareRepurchases: (acc.shareRepurchases || 0) + (comp.shareRepurchases || 0),
    foreignCurrencyTranslation: (acc.foreignCurrencyTranslation || 0) + (comp.foreignCurrencyTranslation || 0),
    actuarialGains: (acc.actuarialGains || 0) + (comp.actuarialGains || 0),
    fairValueReserve: (acc.fairValueReserve || 0) + (comp.fairValueReserve || 0)
  }), {
    opening: 0, profit: 0, oci: 0, issued: 0, dividends: 0, closing: 0,
    shareBasedPayments: 0, treasuryShares: 0, shareRepurchases: 0,
    foreignCurrencyTranslation: 0, actuarialGains: 0, fairValueReserve: 0
  });

  // Subtract treasury stock (treasury stock reduces total equity)
  if (treasuryStock) {
    totals.closing -= treasuryStock.closing;
    totals.opening -= treasuryStock.opening;
  }

  return totals;
}

function getAccountBalance(accounts: TrialBalanceAccount[], accountName: string): number {
  const account = accounts.find(acc => 
    acc.accountName?.toLowerCase().includes(accountName.toLowerCase())
  );
  return account ? (account.finalDebit - account.finalCredit) : 0;
}

/**
 * Validate equity statement for mathematical accuracy
 */
export function validateEquityStatement(equityData: DetailedEquityData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if closing balance equals opening + movements
  const components = ['shareCapital', 'retainedEarnings', 'otherReserves'] as const;
  
  components.forEach(component => {
    const comp = equityData[component];
    const calculatedClosing = comp.opening + comp.profit + comp.oci + comp.issued + comp.dividends + (comp.shareBasedPayments || 0);
    
    if (Math.abs(calculatedClosing - comp.closing) > 0.01) {
      errors.push(
        `${component}: Closing balance (${comp.closing}) does not equal opening balance plus movements (${calculatedClosing})`
      );
    }
  });

  // Check for negative equity
  if (equityData.total.closing < 0) {
    warnings.push('Total equity is negative - this may indicate financial distress');
  }

  // Check for unusual dividend patterns
  if (equityData.dividendDetails) {
    const { totalDividendsPerShare } = equityData.dividendDetails;
    if (totalDividendsPerShare > 10) {
      warnings.push('Dividends per share appear unusually high - please verify');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
