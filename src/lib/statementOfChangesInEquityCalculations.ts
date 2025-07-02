import type { MappedTrialBalance, StatementOfChangesInEquityData } from '../types/project';

const getEquityValue = (mappedTb: MappedTrialBalance, key: string): number => {
  // Simplified: In a real scenario, you would traverse the equity line
  // similar to how getSumForLineItem works, but specific to equity components.
  // This might involve looking for specific account IDs or sub-line IDs.
  const equityLine = mappedTb.equity;
  const findSubLineTotal = (lines: any[], lineId: string): number => {
    for (const line of lines) {
      if (line.id === lineId) return line.total;
      if (line.subLines) {
        const found = findSubLineTotal(line.subLines, lineId);
        if (found) return found;
      }
    }
    return 0;
  };
  return findSubLineTotal([equityLine], key);
};

export const calculateStatementOfChangesInEquity = (mappedTb: MappedTrialBalance | null): StatementOfChangesInEquityData => {
  const emptyComponent = { opening: 0, profit: 0, oci: 0, issued: 0, dividends: 0, closing: 0 };
  if (!mappedTb) {
    return {
      shareCapital: { ...emptyComponent },
      retainedEarnings: { ...emptyComponent },
      otherReserves: { ...emptyComponent },
      total: { ...emptyComponent },
    };
  }

  // This is a simplified calculation. A real implementation would need to differentiate
  // between opening balances and current year movements, which requires more data
  // than is currently available in the MappedTrialBalance (e.g., prior year data).
  // We will assume opening balances are zero for now.

  const profitForTheYear = (mappedTb.income.total || 0) - (mappedTb.expenses.total || 0);
  const shareCapitalIssued = getEquityValue(mappedTb, 'share-capital-issued'); // Assuming this ID exists
  const dividendsPaid = getEquityValue(mappedTb, 'dividends-paid'); // Assuming this ID exists
  const oci = getEquityValue(mappedTb, 'other-comprehensive-income'); // Assuming this ID exists
  const openingShareCapital = getEquityValue(mappedTb, 'share-capital-opening');
  const openingRetainedEarnings = getEquityValue(mappedTb, 'retained-earnings-opening');
  const openingOtherReserves = getEquityValue(mappedTb, 'other-reserves-opening');

  const shareCapital = {
    opening: openingShareCapital,
    issued: shareCapitalIssued,
    profit: 0,
    oci: 0,
    dividends: 0,
    closing: openingShareCapital + shareCapitalIssued,
  };

  const retainedEarnings = {
    opening: openingRetainedEarnings,
    profit: profitForTheYear,
    oci: 0,
    issued: 0,
    dividends: dividendsPaid,
    closing: openingRetainedEarnings + profitForTheYear + dividendsPaid, // Dividends are typically negative
  };

  const otherReserves = {
    opening: openingOtherReserves,
    oci: oci,
    profit: 0,
    issued: 0,
    dividends: 0,
    closing: openingOtherReserves + oci,
  };

  const total = {
    opening: openingShareCapital + openingRetainedEarnings + openingOtherReserves,
    profit: profitForTheYear,
    oci: oci,
    issued: shareCapitalIssued,
    dividends: dividendsPaid,
    closing: shareCapital.closing + retainedEarnings.closing + otherReserves.closing,
  };

  return { shareCapital, retainedEarnings, otherReserves, total };
};
