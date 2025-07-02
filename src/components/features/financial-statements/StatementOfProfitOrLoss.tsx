import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { renderLine } from './financialStatementUtils';
import type { FinancialStatementLine, PeriodData } from '@/types/project';

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
  const { income, expenses } = mappedTrialBalance;

  if (!income || !expenses) {
      return (
        <div className="p-6 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Income or Expenses data is missing in the mapped trial balance for this period.</p>
        </div>
      )
  }

  // --- Calculated Totals ---
  const grossProfit: FinancialStatementLine = {
    id: 'gross-profit',
    label: 'Gross Profit',
    total: (income.total || 0) - (expenses.subLines?.find((l: FinancialStatementLine) => l.id === 'cogs')?.total || 0),
    accounts: [],
    isBold: true,
  };

  const operatingProfit: FinancialStatementLine = {
    id: 'operating-profit',
    label: 'Profit from Operations',
    total: grossProfit.total - (expenses.subLines?.find((l: FinancialStatementLine) => l.id === 'opex')?.total || 0),
    accounts: [],
    isBold: true,
  };

  const profitBeforeTax: FinancialStatementLine = {
    id: 'profit-before-tax',
    label: 'Profit Before Tax',
    total: operatingProfit.total - (expenses.subLines?.find((l: FinancialStatementLine) => l.id === 'finance-costs')?.total || 0),
    accounts: [],
    isBold: true,
  };
  
  const profitForTheYear: FinancialStatementLine = {
    id: 'profit-for-the-year',
    label: 'Profit for the year',
    total: profitBeforeTax.total - (expenses.subLines?.find((l: FinancialStatementLine) => l.id === 'tax-expense')?.total || 0),
    accounts: [],
    isBold: true,
  };


  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-foreground">Statement of Profit or Loss</h2>
      <div className="space-y-2">
        {/* Income */}
        {renderLine(income, currency)}
        
        {/* Expenses */}
        {renderLine(expenses, currency)}

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
