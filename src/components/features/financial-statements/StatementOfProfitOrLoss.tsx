import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import type { PeriodData } from '@/types/project';
import { Commentable } from '../comments/Commentable';
import { cn } from '@/lib/utils';
import { AlertTriangle, FileText, Upload } from 'lucide-react';
import { populateFinancialStatements, validatePopulatedStatements, type StatementLineItem } from '@/lib/statementPopulator';
import { AdjustedFinancialCalculations } from '@/lib/trialBalanceUtils';
import { Button } from '@/components/ui/Button';

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
  const { setCurrentView } = useUIStore();
  const [adjustedData, setAdjustedData] = useState<{
    totalRevenue: number;
    costOfSales: number;
    grossProfit: number;
    operatingExpenses: number;
    depreciation: number;
    operatingProfit: number;
    financeCosts: number;
    profitBeforeTax: number;
    netProfit: number;
    adjustmentSummary: {
      totalAdjustments: number;
      [key: string]: unknown;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine which period to use
  const activePeriod = period || 
    currentProject?.periods.find((p: { id: string }) => p.id === activePeriodId);

  const currency = currentProject?.currency || 'USD';

  useEffect(() => {
    const loadAdjustedData = async () => {
      if (!activePeriod || !currentProject) {
        setLoading(false);
        return;
      }

      if (!activePeriod.mappedTrialBalance) {
        setLoading(false);
        setError('No trial balance data found. Please import trial balance data first.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get adjusted trial balance calculations
        const adjustedProfitLoss = await AdjustedFinancialCalculations.getStatementOfProfitOrLoss(
          currentProject.id,
          activePeriod.id,
          activePeriod.mappedTrialBalance,
          activePeriod
        );
        
        setAdjustedData(adjustedProfitLoss);
      } catch (err) {
        console.error('Error loading adjusted data:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadAdjustedData();
  }, [activePeriod, currentProject]);

  if (loading) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading adjusted trial balance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg border border-red-200">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 mb-4">Error loading adjusted data: {error}</p>
        {error.includes('No trial balance data') && (
          <Button 
            onClick={() => setCurrentView('data-import')}
            className="mt-2"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Trial Balance
          </Button>
        )}
      </div>
    );
  }

  if (!activePeriod) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No period data available. Please select a reporting period.</p>
      </div>
    );
  }

  // Use adjusted data if available, otherwise fall back to original logic
  if (adjustedData) {
    return (
      <div className="space-y-6">
        {/* Show adjustment summary if adjustments exist */}
        {adjustedData.adjustmentSummary && adjustedData.adjustmentSummary.totalAdjustments > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="text-blue-600" size={16} />
              <span className="font-medium text-blue-800">Adjusted Trial Balance Applied</span>
            </div>
            <p className="text-sm text-blue-700">
              {adjustedData.adjustmentSummary.totalAdjustments} adjustment(s) applied to this statement.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Statement of Profit or Loss</h2>
            <p className="text-sm text-muted-foreground">For the period ended {activePeriod.reportingDate.toLocaleDateString()}</p>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Revenue Section */}
            <Commentable elementId="pol-revenue">
              <div className="space-y-2">
                <div className="flex justify-between font-semibold border-b pb-2">
                  <span>Revenue</span>
                  <span className="text-green-600">{formatCurrency(adjustedData.totalRevenue, currency)}</span>
                </div>
              </div>
            </Commentable>

            {/* Cost of Sales */}
            <Commentable elementId="pol-cost-of-sales">
              <div className="flex justify-between">
                <span>Cost of Sales</span>
                <span className="text-red-600">({formatCurrency(adjustedData.costOfSales, currency)})</span>
              </div>
            </Commentable>

            {/* Gross Profit */}
            <Commentable elementId="pol-gross-profit">
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Gross Profit</span>
                <span className={adjustedData.grossProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(adjustedData.grossProfit, currency)}
                </span>
              </div>
            </Commentable>

            {/* Operating Expenses */}
            <Commentable elementId="pol-operating-expenses">
              <div className="flex justify-between">
                <span>Operating Expenses</span>
                <span className="text-red-600">({formatCurrency(adjustedData.operatingExpenses, currency)})</span>
              </div>
            </Commentable>

            {/* Depreciation */}
            <Commentable elementId="pol-depreciation">
              <div className="flex justify-between">
                <span>Depreciation & Amortization</span>
                <span className="text-red-600">({formatCurrency(adjustedData.depreciation, currency)})</span>
              </div>
            </Commentable>

            {/* Operating Profit */}
            <Commentable elementId="pol-operating-profit">
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Operating Profit</span>
                <span className={adjustedData.operatingProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(adjustedData.operatingProfit, currency)}
                </span>
              </div>
            </Commentable>

            {/* Finance Costs */}
            <Commentable elementId="pol-finance-costs">
              <div className="flex justify-between">
                <span>Finance Costs</span>
                <span className="text-red-600">({formatCurrency(adjustedData.financeCosts, currency)})</span>
              </div>
            </Commentable>

            {/* Profit Before Tax */}
            <Commentable elementId="pol-profit-before-tax">
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Profit Before Tax</span>
                <span className={adjustedData.profitBeforeTax >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(adjustedData.profitBeforeTax, currency)}
                </span>
              </div>
            </Commentable>

            {/* Net Profit */}
            <Commentable elementId="pol-net-profit">
              <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-4">
                <span>Net Profit</span>
                <span className={adjustedData.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(adjustedData.netProfit, currency)}
                </span>
              </div>
            </Commentable>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to original logic if no adjusted data
  const { mappedTrialBalance } = activePeriod;

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
