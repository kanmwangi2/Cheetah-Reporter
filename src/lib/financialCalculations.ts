import type { MappedTrialBalance, FinancialStatementLine } from '../types/project';

/**
 * Recursively calculates the total for a financial statement line by summing up the balances of its accounts
 * and the totals of its sub-lines.
 * Balance is calculated as debit - credit.
 * @param line The FinancialStatementLine to calculate the total for.
 * @returns The calculated total.
 */
const calculateLineTotal = (line: FinancialStatementLine): number => {
  let total = 0;

  // Sum balances of accounts directly under this line
  if (line.accounts) {
    total += line.accounts.reduce((sum, account) => {
      // Assets/Expenses are typically debits (positive), Liabilities/Equity/Income are credits (negative)
      const balance = account.debit - account.credit;
      return sum + balance;
    }, 0);
  }

  // Recursively add totals from sub-lines
  if (line.subLines) {
    total += line.subLines.reduce((sum, subLine) => {
      // The total for the sub-line is also calculated recursively
      return sum + calculateLineTotal(subLine);
    }, 0);
  }

  // Assign the calculated total back to the line item for caching/later use
  line.total = total;
  return total;
};

/**
 * Traverses the entire mapped trial balance and calculates the total for each line and sub-line.
 * This populates the `total` property on each `FinancialStatementLine` object.
 * @param mappedTb The MappedTrialBalance to process.
 */
export const processMappedTrialBalance = (mappedTb: MappedTrialBalance): void => {
  Object.values(mappedTb).forEach(topLevelLine => {
    if (topLevelLine) {
      calculateLineTotal(topLevelLine);
    }
  });
};

const findAndSumLineItem = (line: FinancialStatementLine, key: string): number | null => {
  if (line.id === key) {
    return line.total;
  }
  if (line.subLines) {
    for (const subLine of line.subLines) {
      const result = findAndSumLineItem(subLine, key);
      if (result !== null) {
        return result;
      }
    }
  }
  return null;
};

export const getSumForLineItem = (mappedTb: MappedTrialBalance, lineItemKey: string): number => {
  const topLevelLines = [
    mappedTb.assets,
    mappedTb.liabilities,
    mappedTb.equity,
    mappedTb.income,
    mappedTb.expenses,
  ];

  for (const topLevelLine of topLevelLines) {
    const total = findAndSumLineItem(topLevelLine, lineItemKey);
    if (total !== null) {
      return total;
    }
  }

  console.warn(`Financial statement line item with key "${lineItemKey}" not found.`);
  return 0;
};

export const calculateTotals = (mappedTb: MappedTrialBalance | null) => {
  if (!mappedTb) {
    return {
      // Liquidity
      totalCurrentAssets: 0,
      totalCurrentLiabilities: 0,
      inventory: 0,
      // Assets / Liabilities / Equity
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      // Profitability
      revenue: 0,
      costOfGoodsSold: 0,
      operatingExpenses: 0,
      interestExpense: 0,
      taxExpense: 0,
      netIncome: 0,
    };
  }

  // Real implementation that traverses the trial balance map.
  const revenue = getSumForLineItem(mappedTb, 'revenue');
  const netIncome = getSumForLineItem(mappedTb, 'netIncome');
  const totalAssets = getSumForLineItem(mappedTb, 'totalAssets');
  const totalCurrentAssets = getSumForLineItem(mappedTb, 'totalCurrentAssets');
  const totalLiabilities = getSumForLineItem(mappedTb, 'totalLiabilities');
  const totalCurrentLiabilities = getSumForLineItem(mappedTb, 'totalCurrentLiabilities');
  const totalEquity = getSumForLineItem(mappedTb, 'totalEquity');


  return {
    // Liquidity
    totalCurrentAssets,
    totalCurrentLiabilities,
    inventory: getSumForLineItem(mappedTb, 'inventory'),
    // Assets / Liabilities / Equity
    totalAssets,
    totalLiabilities,
    totalEquity,
    // Profitability
    revenue,
    costOfGoodsSold: getSumForLineItem(mappedTb, 'cogs'),
    operatingExpenses: getSumForLineItem(mappedTb, 'opex'),
    interestExpense: getSumForLineItem(mappedTb, 'interestExpense'),
    taxExpense: getSumForLineItem(mappedTb, 'taxExpense'),
    netIncome,
  };
};
