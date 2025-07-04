import React, { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import type { PeriodData } from '@/types/project';
import { Commentable } from '../comments/Commentable';
import { cn } from '@/lib/utils';
import { populateFinancialStatements, validatePopulatedStatements, type StatementLineItem } from '@/lib/statementPopulator';

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

const renderLine = (line: StatementLineItem, currency: string, isSubLine = false, isBold = false) => {
  if (!line || typeof line.value === 'undefined') return null;

  const hasSubLines = line.subItems && line.subItems.length > 0;

  return (
    <div key={line.id} className={cn(isSubLine ? 'ml-4' : 'mt-4')}>
      <Commentable elementId={line.id}>
        <div className="p-2 rounded-md hover:bg-muted/50 flex justify-between items-center cursor-pointer">
          <span className={cn(isBold ? 'font-bold' : !hasSubLines && 'font-medium')}>
            {line.name}
          </span>
          <span className={cn('font-mono', isBold ? 'font-bold' : 'text-muted-foreground')}>
            {formatCurrency(line.value, currency)}
          </span>
        </div>
      </Commentable>
      {hasSubLines && (
        <div className="mt-1 border-l-2 border-muted/50 pl-2">
          {line.subItems?.map(subLine => renderLine(subLine, currency, true))}
        </div>
      )}
    </div>
  );
};

export const StatementOfFinancialPosition: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();

  const activePeriod = currentProject?.periods.find((p: PeriodData) => p.id === activePeriodId);

  const { statements, validation } = useMemo(() => {
    if (!currentProject || !activePeriod?.mappedTrialBalance) {
      return { statements: null, validation: null };
    }

    const populated = populateFinancialStatements(activePeriod.mappedTrialBalance, {
      ifrsStandard: currentProject.ifrsStandard,
      currency: currentProject.currency,
      roundingPrecision: 1,
      includeZeroBalances: false,
      aggregateSmallBalances: true,
      smallBalanceThreshold: 10000
    });

    const validation = validatePopulatedStatements(populated);

    return { statements: populated, validation };
  }, [currentProject, activePeriod]);

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

  if (!statements) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Trial balance for this period has not been mapped yet.</p>
        <p className="text-sm text-muted-foreground/80">Please complete the mapping process to see the financial statement.</p>
      </div>
    );
  }

  const { balanceSheet } = statements;
  const currency = currentProject.currency;

  return (
    <div className="p-4 bg-background rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-center">Statement of Financial Position</h2>
      
      {/* Validation Warnings */}
      {validation && !validation.isValid && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h4 className="font-semibold text-destructive mb-2">Statement Validation Issues:</h4>
          <ul className="text-sm text-destructive space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {validation && validation.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Validation Warnings:</h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-xl font-bold mb-4 text-accent-foreground border-b-2 pb-2">Assets</h3>
          {balanceSheet.assets.map(asset => renderLine(asset, currency, false, asset.level === 0))}
          <div className="mt-6 pt-4 border-t-2 font-bold flex justify-between items-center">
            <span>Total Assets</span>
            <span>{formatCurrency(balanceSheet.totals.totalAssets, currency)}</span>
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-bold mb-4 text-accent-foreground border-b-2 pb-2">Equity and Liabilities</h3>
          
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-2">Equity</h4>
            {balanceSheet.equity.map(equity => renderLine(equity, currency, false, equity.level === 0))}
            <div className="mt-2 pt-2 border-t font-semibold flex justify-between items-center">
              <span>Total Equity</span>
              <span>{formatCurrency(balanceSheet.totals.totalEquity, currency)}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-2">Liabilities</h4>
            {balanceSheet.liabilities.map(liability => renderLine(liability, currency, false, liability.level === 0))}
            <div className="mt-2 pt-2 border-t font-semibold flex justify-between items-center">
              <span>Total Liabilities</span>
              <span>{formatCurrency(balanceSheet.totals.totalLiabilities, currency)}</span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t-2 font-bold flex justify-between items-center">
            <span>Total Equity and Liabilities</span>
            <span>{formatCurrency(balanceSheet.totals.totalEquity + balanceSheet.totals.totalLiabilities, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
