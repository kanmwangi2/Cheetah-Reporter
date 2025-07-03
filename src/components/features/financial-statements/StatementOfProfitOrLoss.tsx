import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { renderLine } from './financialStatementUtils';
import type { FinancialStatementLine, PeriodData, TrialBalanceAccount } from '@/types/project';

const createFinancialStatementLine = (
  id: string,
  label: string,
  lineItems: { [lineItem: string]: TrialBalanceAccount[] }
): FinancialStatementLine => {
  const subLines: FinancialStatementLine[] = Object.entries(lineItems).map(([key, accounts]) => ({
    id: key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    accounts,
    total: accounts.reduce((sum, acc) => sum + acc.debit + acc.credit, 0),
    subLines: []
  }));

  const total = subLines.reduce((sum, line) => sum + line.total, 0);

  return {
    id,
    label,
    accounts: [],
    total,
    subLines
  };
};

export const StatementOfProfitOrLoss: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();

  const activePeriod = currentProject?.periods.find((p: PeriodData) => p.id === activePeriodId);

  if (!currentProject) {
    return <div className="p-4 animate-pulse">Loading project data...</div>;
  }

  if (!activePeriod) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No reporting period selected.</p>
        <p className="text-sm text-muted-foreground/80">Please select a period to view the financial statements.</p>
      </div>
    );
  }

  if (!activePeriod.mappedTrialBalance) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Trial balance for this period has not been mapped yet.</p>
        <p className="text-sm text-muted-foreground/80">Please complete the mapping process to see the financial statement.</p>
      </div>
    );
  }

  const { mappedTrialBalance } = activePeriod;
  const { currency } = currentProject;
  const { revenue, expenses } = mappedTrialBalance;

  if (!revenue || !expenses) {
      return (
        <div className="p-6 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Revenue or Expenses data is missing in the mapped trial balance for this period.</p>
        </div>
      )
  }

  // Convert the mapped trial balance data to FinancialStatementLine objects
  const revenueLines = createFinancialStatementLine('revenue', 'Revenue', revenue);
  const expenseLines = createFinancialStatementLine('expenses', 'Expenses', expenses);

  // Helper function to find expense line item total by name
  const getExpenseTotal = (lineItemName: string): number => {
    const lineItem = expenseLines.subLines?.find(line => line.id === lineItemName);
    return lineItem?.total || 0;
  };

  // --- Calculated Totals ---
  const grossProfit: FinancialStatementLine = {
    id: 'gross-profit',
    label: 'Gross Profit',
    total: revenueLines.total - getExpenseTotal('cogs'),
    accounts: [],
    isBold: true,
  };

  const operatingProfit: FinancialStatementLine = {
    id: 'operating-profit',
    label: 'Profit from Operations',
    total: grossProfit.total - getExpenseTotal('opex'),
    accounts: [],
    isBold: true,
  };

  const profitBeforeTax: FinancialStatementLine = {
    id: 'profit-before-tax',
    label: 'Profit Before Tax',
    total: operatingProfit.total - getExpenseTotal('finance-costs'),
    accounts: [],
    isBold: true,
  };
  
  const profitForTheYear: FinancialStatementLine = {
    id: 'profit-for-the-year',
    label: 'Profit for the year',
    total: profitBeforeTax.total - getExpenseTotal('tax-expense'),
    accounts: [],
    isBold: true,
  };


  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-foreground">Statement of Profit or Loss</h2>
      <div className="space-y-2">
        {/* Revenue */}
        {renderLine(revenueLines, currency)}
        
        {/* Expenses */}
        {renderLine(expenseLines, currency)}

        {/* Gross Profit */}
        {renderLine(grossProfit, currency, false, true)}

        {/* TODO: Add other income/expense categories here if they exist */}

        {/* Operating Profit - Assuming for now opex is a direct child of expenses */}
        {renderLine(operatingProfit, currency, false, true)}

        {/* TODO: Render other specific expense lines like finance costs */}

        {/* Profit Before Tax */}
        {renderLine(profitBeforeTax, currency, false, true)}
        
        {/* TODO: Render tax expense line */}

        {/* Profit for the year */}
        {renderLine(profitForTheYear, currency, false, true)}
      </div>
    </div>
  );
};
