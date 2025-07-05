/**
 * Trial Balance Utilities
 * Helper functions for working with trial balance data and adjustments
 */

import type { TrialBalanceData, TrialBalanceAccount, MappedTrialBalance, PeriodData } from '../types/project';
import type { AdjustedTrialBalance } from '../types/adjustments';
import { AdjustmentsService } from './adjustmentsService';

/**
 * Convert MappedTrialBalance to TrialBalanceData format for adjustments
 */
function convertMappedToTrialBalanceData(mapped: MappedTrialBalance, period: PeriodData): TrialBalanceData {
  // Flatten all accounts from mapped structure
  const rawData: TrialBalanceAccount[] = [];
  const mappings: { [accountId: string]: { statement: keyof MappedTrialBalance | 'unmapped'; lineItem: string } } = {};

  // Process each statement type
  Object.entries(mapped).forEach(([statementType, lineItems]) => {
    Object.entries(lineItems).forEach(([lineItem, accounts]) => {
      (accounts as TrialBalanceAccount[]).forEach(account => {
        rawData.push(account);
        mappings[account.accountId] = {
          statement: statementType as keyof MappedTrialBalance,
          lineItem: lineItem
        };
      });
    });
  });

  return {
    importDate: period.trialBalance.importDate,
    importedBy: period.trialBalance.importedBy,
    fileName: period.trialBalance.fileName,
    accounts: rawData,
    mappings,
    mappedTrialBalance: mapped,
    version: period.trialBalance.version,
    isLocked: period.trialBalance.isLocked,
    hasAdjustments: period.trialBalance.hasAdjustments,
    lastModified: period.trialBalance.lastModified,
    editHistory: period.trialBalance.editHistory
  };
}

/**
 * Get the adjusted trial balance for a given period using MappedTrialBalance
 */
export async function getAdjustedTrialBalanceFromMapped(
  projectId: string,
  periodId: string,
  mappedTrialBalance: MappedTrialBalance,
  period: PeriodData
): Promise<AdjustedTrialBalance> {
  const trialBalanceData = convertMappedToTrialBalanceData(mappedTrialBalance, period);
  return await AdjustmentsService.calculateAdjustedTrialBalance(
    projectId,
    periodId,
    trialBalanceData
  );
}

/**
 * Get the adjusted trial balance for a given period
 * This function should be used throughout the app instead of accessing rawData directly
 */
export async function getAdjustedTrialBalance(
  projectId: string,
  periodId: string,
  originalTrialBalance: TrialBalanceData
): Promise<AdjustedTrialBalance> {
  return await AdjustmentsService.calculateAdjustedTrialBalance(
    projectId,
    periodId,
    originalTrialBalance
  );
}

/**
 * Get trial balance accounts with adjustments applied
 * Use this function in financial statement calculations
 */
export async function getAdjustedAccounts(
  projectId: string,
  periodId: string,
  originalTrialBalance: TrialBalanceData
): Promise<TrialBalanceAccount[]> {
  const adjustedTB = await getAdjustedTrialBalance(projectId, periodId, originalTrialBalance);
  return adjustedTB.adjustedBalances;
}

/**
 * Find account balance in adjusted trial balance
 */
export function findAccountBalance(
  accounts: TrialBalanceAccount[],
  accountName: string
): number {
  const account = accounts.find(acc => 
    acc.accountName.toLowerCase().includes(accountName.toLowerCase())
  );
  return account ? (account.debit - account.credit) : 0;
}

/**
 * Find accounts by pattern in adjusted trial balance
 */
export function findAccountsByPattern(
  accounts: TrialBalanceAccount[],
  patterns: string[]
): TrialBalanceAccount[] {
  return accounts.filter(account =>
    patterns.some(pattern =>
      account.accountName.toLowerCase().includes(pattern.toLowerCase())
    )
  );
}

/**
 * Calculate total for accounts matching patterns
 */
export function calculateTotalForAccounts(
  accounts: TrialBalanceAccount[],
  patterns: string[],
  isCredit = false
): number {
  const matchingAccounts = findAccountsByPattern(accounts, patterns);
  return matchingAccounts.reduce((total, account) => {
    const balance = account.debit - account.credit;
    return total + (isCredit ? Math.abs(balance) : balance);
  }, 0);
}

/**
 * Check if period has adjustments
 */
export async function hasAdjustments(
  projectId: string,
  periodId: string
): Promise<boolean> {
  try {
    const entries = await AdjustmentsService.getJournalEntries(projectId, periodId);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get adjustment summary for a period
 */
export async function getAdjustmentSummary(
  projectId: string,
  periodId: string,
  originalTrialBalance: TrialBalanceData
) {
  const adjustedTB = await getAdjustedTrialBalance(projectId, periodId, originalTrialBalance);
  return adjustedTB.adjustmentSummary;
}

/**
 * Wrapper for financial statement calculations to use adjusted trial balance with MappedTrialBalance
 */
export class AdjustedFinancialCalculations {
  
  static async getStatementOfFinancialPosition(
    projectId: string,
    periodId: string,
    mappedTrialBalance: MappedTrialBalance,
    period: PeriodData
  ) {
    const adjustedTB = await getAdjustedTrialBalanceFromMapped(projectId, periodId, mappedTrialBalance, period);
    const adjustedAccounts = adjustedTB.adjustedBalances;
    
    // Current Assets
    const cash = calculateTotalForAccounts(adjustedAccounts, ['cash', 'bank']);
    const receivables = calculateTotalForAccounts(adjustedAccounts, ['receivable', 'debtor']);
    const inventory = calculateTotalForAccounts(adjustedAccounts, ['inventory', 'stock']);
    const prepayments = calculateTotalForAccounts(adjustedAccounts, ['prepaid', 'prepayment']);
    const currentAssets = cash + receivables + inventory + prepayments;

    // Non-Current Assets
    const ppe = calculateTotalForAccounts(adjustedAccounts, ['property', 'plant', 'equipment', 'building', 'machinery']);
    const intangibles = calculateTotalForAccounts(adjustedAccounts, ['intangible', 'goodwill', 'patent']);
    const investments = calculateTotalForAccounts(adjustedAccounts, ['investment', 'securities']);
    const nonCurrentAssets = ppe + intangibles + investments;

    // Current Liabilities
    const payables = calculateTotalForAccounts(adjustedAccounts, ['payable', 'creditor'], true);
    const shortTermDebt = calculateTotalForAccounts(adjustedAccounts, ['short term debt', 'current portion'], true);
    const accruals = calculateTotalForAccounts(adjustedAccounts, ['accrued', 'accrual'], true);
    const currentLiabilities = payables + shortTermDebt + accruals;

    // Non-Current Liabilities
    const longTermDebt = calculateTotalForAccounts(adjustedAccounts, ['long term debt', 'mortgage'], true);
    const provisions = calculateTotalForAccounts(adjustedAccounts, ['provision'], true);
    const nonCurrentLiabilities = longTermDebt + provisions;

    // Equity
    const shareCapital = calculateTotalForAccounts(adjustedAccounts, ['share capital', 'common stock'], true);
    const retainedEarnings = calculateTotalForAccounts(adjustedAccounts, ['retained earnings', 'accumulated'], true);
    const otherEquity = calculateTotalForAccounts(adjustedAccounts, ['other equity', 'reserves'], true);
    const totalEquity = shareCapital + retainedEarnings + otherEquity;

    return {
      currentAssets,
      nonCurrentAssets,
      totalAssets: currentAssets + nonCurrentAssets,
      currentLiabilities,
      nonCurrentLiabilities,
      totalLiabilities: currentLiabilities + nonCurrentLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: currentLiabilities + nonCurrentLiabilities + totalEquity,
      adjustmentSummary: adjustedTB.adjustmentSummary
    };
  }

  static async getStatementOfProfitOrLoss(
    projectId: string,
    periodId: string,
    mappedTrialBalance: MappedTrialBalance,
    period: PeriodData
  ) {
    const adjustedTB = await getAdjustedTrialBalanceFromMapped(projectId, periodId, mappedTrialBalance, period);
    const adjustedAccounts = adjustedTB.adjustedBalances;
    
    // Revenue
    const revenue = calculateTotalForAccounts(adjustedAccounts, ['revenue', 'sales', 'income'], true);
    const otherIncome = calculateTotalForAccounts(adjustedAccounts, ['other income', 'gain'], true);
    const totalRevenue = revenue + otherIncome;

    // Expenses
    const costOfSales = calculateTotalForAccounts(adjustedAccounts, ['cost of sales', 'cost of goods']);
    const operatingExpenses = calculateTotalForAccounts(adjustedAccounts, ['expense', 'administrative', 'selling']);
    const financeCosts = calculateTotalForAccounts(adjustedAccounts, ['interest expense', 'finance cost']);
    const depreciation = calculateTotalForAccounts(adjustedAccounts, ['depreciation', 'amortization']);

    const grossProfit = totalRevenue - costOfSales;
    const operatingProfit = grossProfit - operatingExpenses - depreciation;
    const profitBeforeTax = operatingProfit - financeCosts;
    const netProfit = profitBeforeTax; // Tax calculation would be more complex

    return {
      totalRevenue,
      costOfSales,
      grossProfit,
      operatingExpenses,
      depreciation,
      operatingProfit,
      financeCosts,
      profitBeforeTax,
      netProfit,
      adjustmentSummary: adjustedTB.adjustmentSummary
    };
  }
}
