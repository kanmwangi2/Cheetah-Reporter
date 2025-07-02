import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import type { FinancialStatementLine, PeriodData } from '@/types/project';
import { Commentable } from '../comments/Commentable';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, currency: string) => {
  // Fallback to USD if currency is not provided
  const displayCurrency = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const renderLine = (line: FinancialStatementLine, currency: string, isSubLine = false, isBold = false) => {
  if (!line || typeof line.total === 'undefined') return null;

  const hasSubLines = line.subLines && line.subLines.length > 0;

  return (
    <div key={line.id} className={cn(isSubLine ? 'ml-4' : 'mt-4')}>
      <Commentable elementId={line.id}>
        <div className="p-2 rounded-md hover:bg-muted/50 flex justify-between items-center cursor-pointer">
          <span className={cn(isBold ? 'font-bold' : !hasSubLines && 'font-medium')}>
            {line.label}
          </span>
          <span className={cn('font-mono', isBold ? 'font-bold' : 'text-muted-foreground')}>
            {formatCurrency(line.total, currency)}
          </span>
        </div>
      </Commentable>
      {hasSubLines && (
        <div className="mt-1 border-l-2 border-muted/50 pl-2">
          {line.subLines?.map(subLine => renderLine(subLine, currency, true))}
        </div>
      )}
    </div>
  );
};

export const StatementOfFinancialPosition: React.FC = () => {
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

  const mappedTb = activePeriod.mappedTrialBalance;
  const currency = currentProject.currency;

  if (!mappedTb || !mappedTb.assets || !mappedTb.liabilities || !mappedTb.equity) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Trial balance for this period has not been mapped yet.</p>
        <p className="text-sm text-muted-foreground/80">Please complete the mapping process to see the financial statement.</p>
      </div>
    );
  }

  // Calculate Total Equity and Liabilities
  const totalEquityAndLiabilities = (mappedTb.equity?.total || 0) + (mappedTb.liabilities?.total || 0);

  return (
    <div className="p-4 bg-background rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Statement of Financial Position</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
                <h3 className="text-xl font-bold mb-4 text-accent-foreground border-b-2 pb-2">Assets</h3>
                {renderLine(mappedTb.assets, currency, false, true)}
            </div>
            <div>
                <h3 className="text-xl font-bold mb-4 text-accent-foreground border-b-2 pb-2">Equity and Liabilities</h3>
                {renderLine(mappedTb.equity, currency, false, true)}
                <div className="mt-6">
                  {renderLine(mappedTb.liabilities, currency, false, true)}
                </div>
                <div className="mt-6 pt-4 border-t-2 font-bold flex justify-between items-center">
                    <span>Total Equity and Liabilities</span>
                    <span>{formatCurrency(totalEquityAndLiabilities, currency)}</span>
                </div>
            </div>
        </div>
    </div>
  );
};
