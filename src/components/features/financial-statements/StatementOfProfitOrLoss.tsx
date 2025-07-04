import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import type { PeriodData } from '@/types/project';
import { Commentable } from '../comments/Commentable';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { populateFinancialStatements, validatePopulatedStatements, type StatementLineItem } from '@/lib/statementPopulator';

const formatCurrency = (value: number, currency: string) => {
  const displayCurrency = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
  }).format(value);
};

interface StatementOfProfitOrLossProps {
  period?: PeriodData;
}

const StatementOfProfitOrLoss: React.FC<StatementOfProfitOrLossProps> = ({ period }) => {
  const { currentProject, activePeriodId } = useProjectStore();

  // Determine which period to use
  const activePeriod = period || 
    currentProject?.periods.find((p: { id: string }) => p.id === activePeriodId);

  if (!activePeriod) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No period data available. Please select a reporting period.</p>
      </div>
    );
  }

  const { mappedTrialBalance } = activePeriod;
  const currency = currentProject?.currency || 'USD';

  if (!mappedTrialBalance) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No mapped trial balance data available for this period.</p>
      </div>
    )
  }

  // Use the statement populator to generate the P&L structure
  const statements = populateFinancialStatements(mappedTrialBalance);
  const incomeStatement = statements.incomeStatement;

  // Validate the populated statement
  const validationResults = validatePopulatedStatements(statements);
  const hasWarnings = validationResults.warnings.length > 0;
  const hasErrors = validationResults.errors.length > 0;

  // Helper function to render line items
  const renderLineItem = (item: StatementLineItem, level: number = 0): React.ReactNode => {
    const indent = level * 20;
    const isBold = level === 0 || item.code.endsWith('.0'); // Top level or section headers

    return (
      <Commentable key={item.id} elementId={`pol-${item.id}`}>
        <div 
          className={cn(
            "flex justify-between items-center py-1 px-2 rounded hover:bg-muted/50",
            isBold && "font-semibold border-t mt-2 pt-2"
          )}
          style={{ marginLeft: `${indent}px` }}
        >
          <span>{item.name}</span>
          <span className={cn(
            item.value < 0 ? "text-red-600" : "text-green-600"
          )}>
            {formatCurrency(Math.abs(item.value), currency)}
          </span>
        </div>
        {item.subItems && item.subItems.map(child => renderLineItem(child, level + 1))}
      </Commentable>
    );
  };

  return (
    <div className="space-y-6">
      {/* Validation Warnings */}
      {(hasWarnings || hasErrors) && (
        <div className="space-y-2">
          {hasErrors && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="text-red-600" size={20} />
              <div>
                <p className="font-medium text-red-800">Validation Errors</p>
                <ul className="text-sm text-red-700 mt-1">
                  {validationResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {hasWarnings && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="text-yellow-600" size={20} />
              <div>
                <p className="font-medium text-yellow-800">Validation Warnings</p>
                <ul className="text-sm text-yellow-700 mt-1">
                  {validationResults.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statement */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">{currentProject?.companyName || 'Company Name'}</h2>
          <h3 className="text-lg font-semibold">Statement of Profit or Loss</h3>
          <p className="text-sm text-muted-foreground">
            For the year ended {activePeriod.reportingDate.toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-2">
          {/* Revenue Section */}
          <div className="space-y-1">
            {incomeStatement.revenue.map(item => renderLineItem(item))}
          </div>

          {/* Expenses Section */}
          <div className="space-y-1 mt-4">
            {incomeStatement.expenses.map(item => renderLineItem(item))}
          </div>

          {/* Totals Section */}
          <div className="border-t-2 border-black pt-4 mt-6">
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Net Income</span>
              <span className={cn(
                incomeStatement.totals.netIncome >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(Math.abs(incomeStatement.totals.netIncome), currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatementOfProfitOrLoss;
export { StatementOfProfitOrLoss };
