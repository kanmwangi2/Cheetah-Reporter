import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import type { PeriodData } from '@/types/project';
import { Commentable } from '../comments/Commentable';
import { AdjustedFinancialCalculations } from '@/lib/trialBalanceUtils';
import { AlertTriangle, FileText } from 'lucide-react';

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

export const StatementOfFinancialPosition: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();
  const [adjustedData, setAdjustedData] = useState<{
    currentAssets: number;
    nonCurrentAssets: number;
    totalAssets: number;
    currentLiabilities: number;
    nonCurrentLiabilities: number;
    totalLiabilities: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    adjustmentSummary: {
      totalAdjustments: number;
      [key: string]: unknown;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activePeriod = currentProject?.periods.find((p: PeriodData) => p.id === activePeriodId);
  const currency = currentProject?.currency || 'USD';

  useEffect(() => {
    const loadAdjustedData = async () => {
      if (!activePeriod || !currentProject || !activePeriod.mappedTrialBalance) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get adjusted trial balance calculations
        const adjustedFinancialPosition = await AdjustedFinancialCalculations.getStatementOfFinancialPosition(
          currentProject.id,
          activePeriod.id,
          activePeriod.mappedTrialBalance,
          activePeriod
        );
        
        setAdjustedData(adjustedFinancialPosition);
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
        <p className="text-red-600">Error loading adjusted data: {error}</p>
      </div>
    );
  }

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

  // Use adjusted data if available
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
            <h2 className="text-lg font-semibold">Statement of Financial Position</h2>
            <p className="text-sm text-muted-foreground">As at {activePeriod.reportingDate.toLocaleDateString()}</p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* ASSETS */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">ASSETS</h3>
              
              {/* Current Assets */}
              <Commentable elementId="sfp-current-assets">
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Current Assets</span>
                    <span>{formatCurrency(adjustedData.currentAssets, currency)}</span>
                  </div>
                </div>
              </Commentable>

              {/* Non-Current Assets */}
              <Commentable elementId="sfp-non-current-assets">
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Non-Current Assets</span>
                    <span>{formatCurrency(adjustedData.nonCurrentAssets, currency)}</span>
                  </div>
                </div>
              </Commentable>

              {/* Total Assets */}
              <Commentable elementId="sfp-total-assets">
                <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                  <span>TOTAL ASSETS</span>
                  <span>{formatCurrency(adjustedData.totalAssets, currency)}</span>
                </div>
              </Commentable>
            </div>

            {/* LIABILITIES AND EQUITY */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">LIABILITIES AND EQUITY</h3>
              
              {/* Current Liabilities */}
              <Commentable elementId="sfp-current-liabilities">
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Current Liabilities</span>
                    <span>{formatCurrency(adjustedData.currentLiabilities, currency)}</span>
                  </div>
                </div>
              </Commentable>

              {/* Non-Current Liabilities */}
              <Commentable elementId="sfp-non-current-liabilities">
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Non-Current Liabilities</span>
                    <span>{formatCurrency(adjustedData.nonCurrentLiabilities, currency)}</span>
                  </div>
                </div>
              </Commentable>

              {/* Total Liabilities */}
              <Commentable elementId="sfp-total-liabilities">
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Liabilities</span>
                  <span>{formatCurrency(adjustedData.totalLiabilities, currency)}</span>
                </div>
              </Commentable>

              {/* Total Equity */}
              <Commentable elementId="sfp-total-equity">
                <div className="flex justify-between font-semibold">
                  <span>Total Equity</span>
                  <span>{formatCurrency(adjustedData.totalEquity, currency)}</span>
                </div>
              </Commentable>

              {/* Total Liabilities and Equity */}
              <Commentable elementId="sfp-total-liabilities-equity">
                <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                  <span>TOTAL LIABILITIES AND EQUITY</span>
                  <span>{formatCurrency(adjustedData.totalLiabilitiesAndEquity, currency)}</span>
                </div>
              </Commentable>

              {/* Balance Check */}
              {Math.abs(adjustedData.totalAssets - adjustedData.totalLiabilitiesAndEquity) > 0.01 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-red-600" size={16} />
                    <span className="font-medium text-red-800">Balance Sheet Imbalance</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Assets and liabilities+equity do not balance. 
                    Difference: {formatCurrency(adjustedData.totalAssets - adjustedData.totalLiabilitiesAndEquity, currency)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to original logic if no adjusted data available
  return (
    <div className="p-6 text-center bg-muted rounded-lg">
      <p className="text-muted-foreground">Unable to load adjusted financial position data.</p>
      <p className="text-sm text-muted-foreground/80">Please check the trial balance mapping and try again.</p>
    </div>
  );
};
