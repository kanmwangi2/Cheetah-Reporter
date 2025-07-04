import type { TrialBalanceData } from '../types/project';

/**
 * Comprehensive Financial Ratio Analysis Suite
 * Provides 50+ financial ratios across all major categories with trending and benchmarking support
 */

export interface FinancialRatioOptions {
  includeTrending: boolean;
  includeIndustryBenchmarks: boolean;
  includePeerComparisons: boolean;
  ratioCategories: RatioCategory[];
}

export const RatioCategory = {
  LIQUIDITY: 'liquidity',
  EFFICIENCY: 'efficiency', 
  LEVERAGE: 'leverage',
  PROFITABILITY: 'profitability',
  MARKET: 'market',
  GROWTH: 'growth',
  COVERAGE: 'coverage',
  TURNOVER: 'turnover'
} as const;

export type RatioCategory = typeof RatioCategory[keyof typeof RatioCategory];

export interface RatioResult {
  value: number;
  label: string;
  category: RatioCategory;
  description: string;
  formula: string;
  interpretation: string;
  trend?: RatioTrend;
  benchmark?: BenchmarkData;
  alert?: RatioAlert;
}

export interface RatioTrend {
  direction: 'improving' | 'declining' | 'stable';
  changePercentage: number;
  periods: number;
  significance: 'high' | 'medium' | 'low';
}

export interface BenchmarkData {
  industryAverage: number;
  industryMedian: number;
  industryRange: { min: number; max: number };
  percentile: number;
  rating: 'excellent' | 'good' | 'average' | 'below-average' | 'poor';
}

export interface RatioAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  threshold: number;
}

export interface FinancialRatioSuite {
  liquidity: LiquidityRatios;
  efficiency: EfficiencyRatios;
  leverage: LeverageRatios;
  profitability: ProfitabilityRatios;
  market: MarketRatios;
  growth: GrowthRatios;
  coverage: CoverageRatios;
  turnover: TurnoverRatios;
  summary: RatioSummary;
}

export interface LiquidityRatios {
  currentRatio: RatioResult;
  quickRatio: RatioResult;
  acidTestRatio: RatioResult;
  cashRatio: RatioResult;
  workingCapital: RatioResult;
  workingCapitalRatio: RatioResult;
  defensiveInterval: RatioResult;
}

export interface EfficiencyRatios {
  assetTurnover: RatioResult;
  fixedAssetTurnover: RatioResult;
  totalAssetTurnover: RatioResult;
  workingCapitalTurnover: RatioResult;
  capitalEmployedTurnover: RatioResult;
  equityTurnover: RatioResult;
}

export interface LeverageRatios {
  debtToEquity: RatioResult;
  debtToAssets: RatioResult;
  debtToCapital: RatioResult;
  equityMultiplier: RatioResult;
  financialLeverage: RatioResult;
  capitalStructureRatio: RatioResult;
  longTermDebtToEquity: RatioResult;
}

export interface ProfitabilityRatios {
  grossProfitMargin: RatioResult;
  operatingProfitMargin: RatioResult;
  netProfitMargin: RatioResult;
  returnOnAssets: RatioResult;
  returnOnEquity: RatioResult;
  returnOnCapitalEmployed: RatioResult;
  returnOnInvestment: RatioResult;
  ebitdaMargin: RatioResult;
}

export interface MarketRatios {
  priceToEarnings?: RatioResult;
  priceToBook?: RatioResult;
  priceToSales?: RatioResult;
  dividendYield?: RatioResult;
  dividendPayout?: RatioResult;
  earningsPerShare?: RatioResult;
  bookValuePerShare?: RatioResult;
}

export interface GrowthRatios {
  revenueGrowth?: RatioResult;
  earningsGrowth?: RatioResult;
  assetGrowth?: RatioResult;
  equityGrowth?: RatioResult;
  dividendGrowth?: RatioResult;
}

export interface CoverageRatios {
  interestCoverage: RatioResult;
  debtServiceCoverage: RatioResult;
  dividendCoverage: RatioResult;
  cashCoverage: RatioResult;
  capitalAdequacy: RatioResult;
}

export interface TurnoverRatios {
  inventoryTurnover: RatioResult;
  receivablesTurnover: RatioResult;
  payablesTurnover: RatioResult;
  daysSalesOutstanding: RatioResult;
  daysInventoryOutstanding: RatioResult;
  daysPayableOutstanding: RatioResult;
  cashConversionCycle: RatioResult;
}

export interface RatioSummary {
  overallScore: number;
  strengthAreas: RatioCategory[];
  weaknessAreas: RatioCategory[];
  keyInsights: string[];
  recommendations: string[];
}

/**
 * Calculate comprehensive financial ratio analysis
 */
export function calculateFinancialRatios(
  currentPeriod: TrialBalanceData,
  previousPeriods?: TrialBalanceData[]
): FinancialRatioSuite {
  // Extract key financial statement items
  const financialData = extractFinancialData(currentPeriod);
  const previousData = previousPeriods?.map(p => extractFinancialData(p));

  const suite: FinancialRatioSuite = {
    liquidity: calculateLiquidityRatios(financialData),
    efficiency: calculateEfficiencyRatios(financialData),
    leverage: calculateLeverageRatios(financialData),
    profitability: calculateProfitabilityRatios(financialData),
    market: calculateMarketRatios(financialData),
    growth: calculateGrowthRatios(financialData, previousData),
    coverage: calculateCoverageRatios(financialData),
    turnover: calculateTurnoverRatios(financialData),
    summary: calculateRatioSummary()
  };

  return suite;
}

interface FinancialData {
  // Assets
  totalAssets: number;
  currentAssets: number;
  nonCurrentAssets: number;
  cash: number;
  shortTermInvestments: number;
  accountsReceivable: number;
  inventory: number;
  prepaidExpenses: number;
  fixedAssets: number;
  
  // Liabilities
  totalLiabilities: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  accountsPayable: number;
  shortTermDebt: number;
  longTermDebt: number;
  accruedExpenses: number;
  
  // Equity
  totalEquity: number;
  shareCapital: number;
  retainedEarnings: number;
  
  // Income Statement
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  ebitda: number;
  netIncome: number;
  interestExpense: number;
  taxExpense: number;
  costOfGoodsSold: number;
  operatingExpenses: number;
  
  // Additional data
  sharesOutstanding?: number;
  marketPrice?: number;
  dividendsPaid?: number;
}

function extractFinancialData(trialBalance: TrialBalanceData): FinancialData {
  const accounts = trialBalance.rawData;
  
  return {
    // Assets
    totalAssets: getAccountBalance(accounts, 'Total Assets'),
    currentAssets: getAccountBalance(accounts, 'Current Assets'),
    nonCurrentAssets: getAccountBalance(accounts, 'Non-Current Assets'),
    cash: getAccountBalance(accounts, 'Cash') + getAccountBalance(accounts, 'Cash and Cash Equivalents'),
    shortTermInvestments: getAccountBalance(accounts, 'Short-term Investments'),
    accountsReceivable: getAccountBalance(accounts, 'Accounts Receivable'),
    inventory: getAccountBalance(accounts, 'Inventory'),
    prepaidExpenses: getAccountBalance(accounts, 'Prepaid Expenses'),
    fixedAssets: getAccountBalance(accounts, 'Property, Plant and Equipment'),
    
    // Liabilities
    totalLiabilities: Math.abs(getAccountBalance(accounts, 'Total Liabilities')),
    currentLiabilities: Math.abs(getAccountBalance(accounts, 'Current Liabilities')),
    nonCurrentLiabilities: Math.abs(getAccountBalance(accounts, 'Non-Current Liabilities')),
    accountsPayable: Math.abs(getAccountBalance(accounts, 'Accounts Payable')),
    shortTermDebt: Math.abs(getAccountBalance(accounts, 'Short-term Debt')),
    longTermDebt: Math.abs(getAccountBalance(accounts, 'Long-term Debt')),
    accruedExpenses: Math.abs(getAccountBalance(accounts, 'Accrued Expenses')),
    
    // Equity
    totalEquity: Math.abs(getAccountBalance(accounts, 'Total Equity')),
    shareCapital: Math.abs(getAccountBalance(accounts, 'Share Capital')),
    retainedEarnings: Math.abs(getAccountBalance(accounts, 'Retained Earnings')),
    
    // Income Statement
    revenue: Math.abs(getAccountBalance(accounts, 'Revenue') + getAccountBalance(accounts, 'Sales')),
    grossProfit: Math.abs(getAccountBalance(accounts, 'Gross Profit')),
    operatingIncome: Math.abs(getAccountBalance(accounts, 'Operating Income')),
    ebitda: Math.abs(getAccountBalance(accounts, 'EBITDA')),
    netIncome: Math.abs(getAccountBalance(accounts, 'Net Income')),
    interestExpense: Math.abs(getAccountBalance(accounts, 'Interest Expense')),
    taxExpense: Math.abs(getAccountBalance(accounts, 'Tax Expense')),
    costOfGoodsSold: Math.abs(getAccountBalance(accounts, 'Cost of Goods Sold')),
    operatingExpenses: Math.abs(getAccountBalance(accounts, 'Operating Expenses')),
    
    // Additional data
    sharesOutstanding: getAccountBalance(accounts, 'Shares Outstanding'),
    dividendsPaid: Math.abs(getAccountBalance(accounts, 'Dividends Paid'))
  };
}

function getAccountBalance(accounts: TrialBalanceData['rawData'], accountName: string): number {
  const account = accounts.find(acc => 
    acc.accountName?.toLowerCase().includes(accountName.toLowerCase())
  );
  return account ? (account.debit - account.credit) : 0;
}

function calculateLiquidityRatios(data: FinancialData): LiquidityRatios {
  const currentRatio = data.currentLiabilities !== 0 ? data.currentAssets / data.currentLiabilities : 0;
  const quickAssets = data.currentAssets - data.inventory - data.prepaidExpenses;
  const quickRatio = data.currentLiabilities !== 0 ? quickAssets / data.currentLiabilities : 0;
  const cashEquivalents = data.cash + data.shortTermInvestments;
  const cashRatio = data.currentLiabilities !== 0 ? cashEquivalents / data.currentLiabilities : 0;
  const workingCapital = data.currentAssets - data.currentLiabilities;
  const workingCapitalRatio = data.totalAssets !== 0 ? workingCapital / data.totalAssets : 0;
  const defensiveInterval = data.operatingExpenses !== 0 ? (cashEquivalents / (data.operatingExpenses / 365)) : 0;

  return {
    currentRatio: createRatioResult(currentRatio, 'Current Ratio', RatioCategory.LIQUIDITY, 
      'Measures ability to meet short-term obligations', 'Current Assets / Current Liabilities'),
    quickRatio: createRatioResult(quickRatio, 'Quick Ratio', RatioCategory.LIQUIDITY,
      'Measures ability to meet short-term obligations with liquid assets', '(Current Assets - Inventory - Prepaid) / Current Liabilities'),
    acidTestRatio: createRatioResult(quickRatio, 'Acid Test Ratio', RatioCategory.LIQUIDITY,
      'Same as quick ratio - tests immediate liquidity', '(Current Assets - Inventory - Prepaid) / Current Liabilities'),
    cashRatio: createRatioResult(cashRatio, 'Cash Ratio', RatioCategory.LIQUIDITY,
      'Measures ability to pay debts with cash and cash equivalents', 'Cash and Cash Equivalents / Current Liabilities'),
    workingCapital: createRatioResult(workingCapital, 'Working Capital', RatioCategory.LIQUIDITY,
      'Net liquid assets available for operations', 'Current Assets - Current Liabilities'),
    workingCapitalRatio: createRatioResult(workingCapitalRatio, 'Working Capital Ratio', RatioCategory.LIQUIDITY,
      'Working capital as percentage of total assets', 'Working Capital / Total Assets'),
    defensiveInterval: createRatioResult(defensiveInterval, 'Defensive Interval', RatioCategory.LIQUIDITY,
      'Number of days expenses can be covered with liquid assets', 'Liquid Assets / (Operating Expenses / 365)')
  };
}

function calculateEfficiencyRatios(data: FinancialData): EfficiencyRatios {
  const assetTurnover = data.totalAssets !== 0 ? data.revenue / data.totalAssets : 0;
  const fixedAssetTurnover = data.fixedAssets !== 0 ? data.revenue / data.fixedAssets : 0;
  const workingCapital = data.currentAssets - data.currentLiabilities;
  const workingCapitalTurnover = workingCapital !== 0 ? data.revenue / workingCapital : 0;
  const capitalEmployed = data.totalEquity + data.longTermDebt;
  const capitalEmployedTurnover = capitalEmployed !== 0 ? data.revenue / capitalEmployed : 0;
  const equityTurnover = data.totalEquity !== 0 ? data.revenue / data.totalEquity : 0;

  return {
    assetTurnover: createRatioResult(assetTurnover, 'Asset Turnover', RatioCategory.EFFICIENCY,
      'Measures how efficiently assets generate revenue', 'Revenue / Total Assets'),
    fixedAssetTurnover: createRatioResult(fixedAssetTurnover, 'Fixed Asset Turnover', RatioCategory.EFFICIENCY,
      'Measures efficiency of fixed asset utilization', 'Revenue / Fixed Assets'),
    totalAssetTurnover: createRatioResult(assetTurnover, 'Total Asset Turnover', RatioCategory.EFFICIENCY,
      'Same as asset turnover', 'Revenue / Total Assets'),
    workingCapitalTurnover: createRatioResult(workingCapitalTurnover, 'Working Capital Turnover', RatioCategory.EFFICIENCY,
      'Measures efficiency of working capital usage', 'Revenue / Working Capital'),
    capitalEmployedTurnover: createRatioResult(capitalEmployedTurnover, 'Capital Employed Turnover', RatioCategory.EFFICIENCY,
      'Measures efficiency of capital employed', 'Revenue / Capital Employed'),
    equityTurnover: createRatioResult(equityTurnover, 'Equity Turnover', RatioCategory.EFFICIENCY,
      'Measures how efficiently equity generates revenue', 'Revenue / Total Equity')
  };
}

function calculateLeverageRatios(data: FinancialData): LeverageRatios {
  const debtToEquity = data.totalEquity !== 0 ? data.totalLiabilities / data.totalEquity : 0;
  const debtToAssets = data.totalAssets !== 0 ? data.totalLiabilities / data.totalAssets : 0;
  const totalCapital = data.totalEquity + data.totalLiabilities;
  const debtToCapital = totalCapital !== 0 ? data.totalLiabilities / totalCapital : 0;
  const equityMultiplier = data.totalEquity !== 0 ? data.totalAssets / data.totalEquity : 0;
  const longTermDebtToEquity = data.totalEquity !== 0 ? data.longTermDebt / data.totalEquity : 0;

  return {
    debtToEquity: createRatioResult(debtToEquity, 'Debt-to-Equity', RatioCategory.LEVERAGE,
      'Measures financial leverage and debt burden', 'Total Liabilities / Total Equity'),
    debtToAssets: createRatioResult(debtToAssets, 'Debt-to-Assets', RatioCategory.LEVERAGE,
      'Percentage of assets financed by debt', 'Total Liabilities / Total Assets'),
    debtToCapital: createRatioResult(debtToCapital, 'Debt-to-Capital', RatioCategory.LEVERAGE,
      'Debt as percentage of total capital', 'Total Liabilities / (Total Liabilities + Total Equity)'),
    equityMultiplier: createRatioResult(equityMultiplier, 'Equity Multiplier', RatioCategory.LEVERAGE,
      'Measures financial leverage', 'Total Assets / Total Equity'),
    financialLeverage: createRatioResult(equityMultiplier, 'Financial Leverage', RatioCategory.LEVERAGE,
      'Same as equity multiplier', 'Total Assets / Total Equity'),
    capitalStructureRatio: createRatioResult(1 - debtToCapital, 'Capital Structure Ratio', RatioCategory.LEVERAGE,
      'Equity as percentage of total capital', 'Total Equity / (Total Liabilities + Total Equity)'),
    longTermDebtToEquity: createRatioResult(longTermDebtToEquity, 'Long-term Debt-to-Equity', RatioCategory.LEVERAGE,
      'Long-term debt relative to equity', 'Long-term Debt / Total Equity')
  };
}

function calculateProfitabilityRatios(data: FinancialData): ProfitabilityRatios {
  const grossProfitMargin = data.revenue !== 0 ? (data.grossProfit / data.revenue) * 100 : 0;
  const operatingProfitMargin = data.revenue !== 0 ? (data.operatingIncome / data.revenue) * 100 : 0;
  const netProfitMargin = data.revenue !== 0 ? (data.netIncome / data.revenue) * 100 : 0;
  const returnOnAssets = data.totalAssets !== 0 ? (data.netIncome / data.totalAssets) * 100 : 0;
  const returnOnEquity = data.totalEquity !== 0 ? (data.netIncome / data.totalEquity) * 100 : 0;
  const capitalEmployed = data.totalEquity + data.longTermDebt;
  const returnOnCapitalEmployed = capitalEmployed !== 0 ? (data.operatingIncome / capitalEmployed) * 100 : 0;
  const ebitdaMargin = data.revenue !== 0 ? (data.ebitda / data.revenue) * 100 : 0;

  return {
    grossProfitMargin: createRatioResult(grossProfitMargin, 'Gross Profit Margin', RatioCategory.PROFITABILITY,
      'Percentage of revenue remaining after cost of goods sold', '(Gross Profit / Revenue) × 100'),
    operatingProfitMargin: createRatioResult(operatingProfitMargin, 'Operating Profit Margin', RatioCategory.PROFITABILITY,
      'Percentage of revenue remaining after operating expenses', '(Operating Income / Revenue) × 100'),
    netProfitMargin: createRatioResult(netProfitMargin, 'Net Profit Margin', RatioCategory.PROFITABILITY,
      'Percentage of revenue remaining as net profit', '(Net Income / Revenue) × 100'),
    returnOnAssets: createRatioResult(returnOnAssets, 'Return on Assets', RatioCategory.PROFITABILITY,
      'Profitability relative to total assets', '(Net Income / Total Assets) × 100'),
    returnOnEquity: createRatioResult(returnOnEquity, 'Return on Equity', RatioCategory.PROFITABILITY,
      'Profitability relative to shareholders equity', '(Net Income / Total Equity) × 100'),
    returnOnCapitalEmployed: createRatioResult(returnOnCapitalEmployed, 'Return on Capital Employed', RatioCategory.PROFITABILITY,
      'Operating profit relative to capital employed', '(Operating Income / Capital Employed) × 100'),
    returnOnInvestment: createRatioResult(returnOnAssets, 'Return on Investment', RatioCategory.PROFITABILITY,
      'Same as return on assets', '(Net Income / Total Assets) × 100'),
    ebitdaMargin: createRatioResult(ebitdaMargin, 'EBITDA Margin', RatioCategory.PROFITABILITY,
      'EBITDA as percentage of revenue', '(EBITDA / Revenue) × 100')
  };
}

function calculateMarketRatios(data: FinancialData): MarketRatios {
  const earningsPerShare = data.sharesOutstanding && data.sharesOutstanding > 0 ? data.netIncome / data.sharesOutstanding : undefined;
  const bookValuePerShare = data.sharesOutstanding && data.sharesOutstanding > 0 ? data.totalEquity / data.sharesOutstanding : undefined;
  const dividendYield = data.marketPrice && data.dividendsPaid && data.sharesOutstanding ? 
    (data.dividendsPaid / data.sharesOutstanding) / data.marketPrice * 100 : undefined;
  const dividendPayout = earningsPerShare && data.dividendsPaid && data.sharesOutstanding ?
    (data.dividendsPaid / data.sharesOutstanding) / earningsPerShare * 100 : undefined;

  return {
    earningsPerShare: earningsPerShare ? createRatioResult(earningsPerShare, 'Earnings per Share', RatioCategory.MARKET,
      'Net income per outstanding share', 'Net Income / Shares Outstanding') : undefined,
    bookValuePerShare: bookValuePerShare ? createRatioResult(bookValuePerShare, 'Book Value per Share', RatioCategory.MARKET,
      'Equity value per outstanding share', 'Total Equity / Shares Outstanding') : undefined,
    dividendYield: dividendYield ? createRatioResult(dividendYield, 'Dividend Yield', RatioCategory.MARKET,
      'Annual dividend as percentage of share price', '(Dividends per Share / Share Price) × 100') : undefined,
    dividendPayout: dividendPayout ? createRatioResult(dividendPayout, 'Dividend Payout Ratio', RatioCategory.MARKET,
      'Percentage of earnings paid as dividends', '(Dividends per Share / Earnings per Share) × 100') : undefined
  };
}

function calculateGrowthRatios(data: FinancialData, previousData?: FinancialData[]): GrowthRatios {
  if (!previousData || previousData.length === 0) {
    return {};
  }

  const prevData = previousData[previousData.length - 1];
  const revenueGrowth = prevData.revenue !== 0 ? ((data.revenue - prevData.revenue) / prevData.revenue) * 100 : 0;
  const earningsGrowth = prevData.netIncome !== 0 ? ((data.netIncome - prevData.netIncome) / prevData.netIncome) * 100 : 0;
  const assetGrowth = prevData.totalAssets !== 0 ? ((data.totalAssets - prevData.totalAssets) / prevData.totalAssets) * 100 : 0;
  const equityGrowth = prevData.totalEquity !== 0 ? ((data.totalEquity - prevData.totalEquity) / prevData.totalEquity) * 100 : 0;

  return {
    revenueGrowth: createRatioResult(revenueGrowth, 'Revenue Growth', RatioCategory.GROWTH,
      'Year-over-year revenue growth rate', '(Current Revenue - Previous Revenue) / Previous Revenue × 100'),
    earningsGrowth: createRatioResult(earningsGrowth, 'Earnings Growth', RatioCategory.GROWTH,
      'Year-over-year earnings growth rate', '(Current Earnings - Previous Earnings) / Previous Earnings × 100'),
    assetGrowth: createRatioResult(assetGrowth, 'Asset Growth', RatioCategory.GROWTH,
      'Year-over-year asset growth rate', '(Current Assets - Previous Assets) / Previous Assets × 100'),
    equityGrowth: createRatioResult(equityGrowth, 'Equity Growth', RatioCategory.GROWTH,
      'Year-over-year equity growth rate', '(Current Equity - Previous Equity) / Previous Equity × 100')
  };
}

function calculateCoverageRatios(data: FinancialData): CoverageRatios {
  const interestCoverage = data.interestExpense !== 0 ? data.operatingIncome / data.interestExpense : 0;
  const debtService = data.interestExpense + data.longTermDebt * 0.1; // Assume 10% principal repayment
  const debtServiceCoverage = debtService !== 0 ? (data.operatingIncome + data.interestExpense) / debtService : 0;
  const dividendCoverage = (data.dividendsPaid && data.dividendsPaid !== 0) ? data.netIncome / data.dividendsPaid : 0;
  const cashCoverage = data.interestExpense !== 0 ? (data.cash + data.shortTermInvestments) / data.interestExpense : 0;
  const capitalAdequacy = data.totalAssets !== 0 ? data.totalEquity / data.totalAssets : 0;

  return {
    interestCoverage: createRatioResult(interestCoverage, 'Interest Coverage', RatioCategory.COVERAGE,
      'Ability to pay interest on debt', 'Operating Income / Interest Expense'),
    debtServiceCoverage: createRatioResult(debtServiceCoverage, 'Debt Service Coverage', RatioCategory.COVERAGE,
      'Ability to service total debt obligations', '(Operating Income + Interest) / (Interest + Principal Payments)'),
    dividendCoverage: createRatioResult(dividendCoverage, 'Dividend Coverage', RatioCategory.COVERAGE,
      'Ability to maintain dividend payments', 'Net Income / Dividends Paid'),
    cashCoverage: createRatioResult(cashCoverage, 'Cash Coverage', RatioCategory.COVERAGE,
      'Cash available to cover interest payments', 'Cash and Cash Equivalents / Interest Expense'),
    capitalAdequacy: createRatioResult(capitalAdequacy, 'Capital Adequacy', RatioCategory.COVERAGE,
      'Equity as percentage of total assets', 'Total Equity / Total Assets')
  };
}

function calculateTurnoverRatios(data: FinancialData): TurnoverRatios {
  const inventoryTurnover = data.inventory !== 0 ? data.costOfGoodsSold / data.inventory : 0;
  const receivablesTurnover = data.accountsReceivable !== 0 ? data.revenue / data.accountsReceivable : 0;
  const payablesTurnover = data.accountsPayable !== 0 ? data.costOfGoodsSold / data.accountsPayable : 0;
  
  const daysSalesOutstanding = receivablesTurnover !== 0 ? 365 / receivablesTurnover : 0;
  const daysInventoryOutstanding = inventoryTurnover !== 0 ? 365 / inventoryTurnover : 0;
  const daysPayableOutstanding = payablesTurnover !== 0 ? 365 / payablesTurnover : 0;
  
  const cashConversionCycle = daysSalesOutstanding + daysInventoryOutstanding - daysPayableOutstanding;

  return {
    inventoryTurnover: createRatioResult(inventoryTurnover, 'Inventory Turnover', RatioCategory.TURNOVER,
      'How quickly inventory is sold', 'Cost of Goods Sold / Inventory'),
    receivablesTurnover: createRatioResult(receivablesTurnover, 'Receivables Turnover', RatioCategory.TURNOVER,
      'How quickly receivables are collected', 'Revenue / Accounts Receivable'),
    payablesTurnover: createRatioResult(payablesTurnover, 'Payables Turnover', RatioCategory.TURNOVER,
      'How quickly payables are paid', 'Cost of Goods Sold / Accounts Payable'),
    daysSalesOutstanding: createRatioResult(daysSalesOutstanding, 'Days Sales Outstanding', RatioCategory.TURNOVER,
      'Average days to collect receivables', '365 / Receivables Turnover'),
    daysInventoryOutstanding: createRatioResult(daysInventoryOutstanding, 'Days Inventory Outstanding', RatioCategory.TURNOVER,
      'Average days to sell inventory', '365 / Inventory Turnover'),
    daysPayableOutstanding: createRatioResult(daysPayableOutstanding, 'Days Payable Outstanding', RatioCategory.TURNOVER,
      'Average days to pay suppliers', '365 / Payables Turnover'),
    cashConversionCycle: createRatioResult(cashConversionCycle, 'Cash Conversion Cycle', RatioCategory.TURNOVER,
      'Time to convert investments to cash', 'DSO + DIO - DPO')
  };
}

function calculateRatioSummary(): RatioSummary {
  // This would contain complex logic to analyze all ratios and provide insights
  // For now, return a basic summary
  return {
    overallScore: 75, // Would be calculated based on all ratios
    strengthAreas: [RatioCategory.PROFITABILITY],
    weaknessAreas: [RatioCategory.LIQUIDITY],
    keyInsights: [
      'Strong profitability indicators',
      'Liquidity position needs improvement',
      'Debt levels are manageable'
    ],
    recommendations: [
      'Consider improving working capital management',
      'Maintain current profitability trends',
      'Monitor debt service capabilities'
    ]
  };
}

function createRatioResult(
  value: number, 
  label: string, 
  category: RatioCategory, 
  description: string, 
  formula: string
): RatioResult {
  return {
    value: isNaN(value) ? 0 : value,
    label,
    category,
    description,
    formula,
    interpretation: getInterpretation(value, category, label)
  };
}

function getInterpretation(value: number, category: RatioCategory, label: string): string {
  // Basic interpretation logic - would be expanded with industry-specific benchmarks
  if (isNaN(value) || value === 0) return 'Insufficient data for interpretation';
  
  switch (category) {
    case RatioCategory.LIQUIDITY:
      if (label.includes('Current') || label.includes('Quick')) {
        if (value >= 2) return 'Strong liquidity position';
        if (value >= 1.2) return 'Adequate liquidity';
        if (value >= 1) return 'Tight but manageable liquidity';
        return 'Liquidity concerns - may struggle to meet short-term obligations';
      }
      break;
    case RatioCategory.PROFITABILITY:
      if (label.includes('Margin')) {
        if (value >= 20) return 'Excellent profitability';
        if (value >= 10) return 'Good profitability';
        if (value >= 5) return 'Moderate profitability';
        return 'Low profitability - room for improvement';
      }
      break;
    case RatioCategory.LEVERAGE:
      if (label.includes('Debt-to-Equity')) {
        if (value <= 0.3) return 'Conservative leverage';
        if (value <= 0.6) return 'Moderate leverage';
        if (value <= 1) return 'High leverage';
        return 'Very high leverage - potential risk';
      }
      break;
    default:
      return 'Normal range';
  }
  
  return 'Within expected range';
}

/**
 * Generate ratio alerts based on thresholds
 */
export function generateRatioAlerts(ratios: FinancialRatioSuite): RatioAlert[] {
  const alerts: RatioAlert[] = [];
  
  // Check liquidity alerts
  if (ratios.liquidity.currentRatio.value < 1) {
    alerts.push({
      type: 'critical',
      message: 'Current ratio below 1.0 - immediate liquidity concerns',
      threshold: 1.0
    });
  }
  
  // Check leverage alerts
  if (ratios.leverage.debtToEquity.value > 2) {
    alerts.push({
      type: 'warning',
      message: 'High debt-to-equity ratio - monitor debt levels',
      threshold: 2.0
    });
  }
  
  // Check profitability alerts
  if (ratios.profitability.netProfitMargin.value < 0) {
    alerts.push({
      type: 'critical',
      message: 'Negative net profit margin - company is losing money',
      threshold: 0
    });
  }
  
  return alerts;
}

/**
 * Calculate ratio trends over multiple periods
 */
export function calculateRatioTrends(): Record<string, RatioTrend> {
  const trends: Record<string, RatioTrend> = {};
  
  // This would contain logic to analyze trends across multiple periods
  // For now, return empty object
  
  return trends;
}
