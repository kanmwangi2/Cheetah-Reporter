import type { MappedTrialBalance, StatementOfCashFlowsData, CashFlowItem } from '../types/project';
import { getSumForLineItem } from './financialCalculations'; // Assuming this can be reused

// Note: A proper indirect method cash flow statement requires comparative balance sheet data 
// (i.e., this year's balance sheet vs. last year's). Since we don't have that structure yet,
// this calculation will be heavily simplified and use placeholders.
// It assumes certain line items can be found in the current year's mapped trial balance.

export const calculateStatementOfCashFlows = (mappedTb: MappedTrialBalance | null): StatementOfCashFlowsData => {
  const emptySection = { id: '', label: '', items: [], total: 0 };
  if (!mappedTb) {
    return {
      operating: emptySection,
      investing: emptySection,
      financing: emptySection,
      netIncrease: 0,
      cashAtBeginning: 0,
      cashAtEnd: 0,
    };
  }

  const netIncome = getSumForLineItem(mappedTb, 'netIncome');
  
  // Placeholder values for non-cash charges and changes in working capital
  const depreciation = getSumForLineItem(mappedTb, 'depreciation') || 25000; // Mock
  const changeInWorkingCapital = -15000; // Mock

  const operatingItems: CashFlowItem[] = [
    { id: 'pbt', label: 'Profit before tax', value: netIncome + getSumForLineItem(mappedTb, 'taxExpense') },
    { id: 'depreciation', label: 'Depreciation', value: depreciation },
    { id: 'interestPaid', label: 'Interest paid', value: -getSumForLineItem(mappedTb, 'interestExpense') },
    { id: 'taxPaid', label: 'Income tax paid', value: -getSumForLineItem(mappedTb, 'taxExpense') },
    { id: 'workingCapital', label: 'Change in working capital', value: changeInWorkingCapital },
  ];

  const operatingTotal = operatingItems.reduce((sum, item) => sum + item.value, 0);

  // Mock data for investing and financing activities
  const investingItems: CashFlowItem[] = [
    { id: 'ppePurchase', label: 'Purchase of property, plant and equipment', value: -50000 },
    { id: 'ppeSale', label: 'Proceeds from sale of PPE', value: 10000 },
  ];
  const investingTotal = investingItems.reduce((sum, item) => sum + item.value, 0);

  const financingItems: CashFlowItem[] = [
    { id: 'shareIssue', label: 'Proceeds from issue of shares', value: 20000 },
    { id: 'dividendsPaid', label: 'Dividends paid', value: -10000 },
  ];
  const financingTotal = financingItems.reduce((sum, item) => sum + item.value, 0);

  const netIncrease = operatingTotal + investingTotal + financingTotal;
  const cashAtBeginning = 50000; // Mock
  const cashAtEnd = cashAtBeginning + netIncrease;

  return {
    operating: { id: 'operating', label: 'Cash flows from operating activities', items: operatingItems, total: operatingTotal },
    investing: { id: 'investing', label: 'Cash flows from investing activities', items: investingItems, total: investingTotal },
    financing: { id: 'financing', label: 'Cash flows from financing activities', items: financingItems, total: financingTotal },
    netIncrease,
    cashAtBeginning,
    cashAtEnd,
  };
};
