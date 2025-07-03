import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { exportProjectToPDF } from '../../lib/pdfExporter';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { AuditTrailViewer } from '../features/review/AuditTrailViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ArrowLeft, Download, RotateCcw, History, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { calculateTotals } from '@/lib/financialCalculations';

export const Preview: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();
  const { setCurrentView } = useUIStore();
  const [isExporting, setIsExporting] = useState(false);

  const activePeriod = useMemo(() => {
    return currentProject?.periods.find(p => p.id === activePeriodId) || null;
  }, [currentProject, activePeriodId]);

  const handleBack = () => {
    setCurrentView('report-editor');
  };

  const handleExportPDF = async () => {
    if (!currentProject) return;

    setIsExporting(true);
    try {
      await exportProjectToPDF(currentProject, activePeriodId || undefined, {
        includeNotes: true,
        includeAuditTrail: false,
        pageSize: 'A4',
        orientation: 'portrait',
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRollForward = () => {
    // TODO: Implement roll forward functionality
    console.log('Roll forward functionality will be implemented in the next phase!');
  };

  // Financial calculations using useMemo for performance
  const financialData = useMemo(() => {
    if (!activePeriod?.mappedTrialBalance) return null;

    const totals = calculateTotals(activePeriod.mappedTrialBalance);

    const { 
      totalAssets, totalLiabilities, totalEquity, 
      revenue, costOfGoodsSold, netIncome,
      totalCurrentAssets, 
      totalCurrentLiabilities
    } = totals;

    const totalNonCurrentAssets = totalAssets - totalCurrentAssets;
    const totalNonCurrentLiabilities = totalLiabilities - totalCurrentLiabilities;

    const grossProfit = revenue + costOfGoodsSold; // COGS is negative
    const operatingExpenses = totals.operatingExpenses;

    return {
      // SFP
      currentAssets: totalCurrentAssets,
      nonCurrentAssets: totalNonCurrentAssets,
      totalAssets,
      currentLiabilities: totalCurrentLiabilities,
      nonCurrentLiabilities: totalNonCurrentLiabilities,
      totalLiabilities,
      totalEquity,
      
      // P&L
      revenue,
      costOfSales: costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      netProfit: netIncome,
    };
  }, [activePeriod]);

  if (!currentProject || !activePeriod) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No project or active period selected</p>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No trial balance data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Preview & Export</h1>
              <p className="text-sm text-muted-foreground">
                {currentProject.companyName} - Period ending {new Date(activePeriod.reportingDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Project History</DialogTitle>
                </DialogHeader>
                <AuditTrailViewer />
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleRollForward}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Roll Forward
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? 'Exporting...' : 'Export to PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-6 overflow-auto bg-muted/20">
        <div className="max-w-4xl mx-auto space-y-8 bg-white shadow-lg rounded-lg p-8 print:shadow-none print:p-0">
          {/* Report Header */}
          <div className="text-center border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-900">{currentProject.companyName}</h1>
            <h2 className="text-xl text-gray-700 mt-2">Financial Statements</h2>
            <p className="text-gray-600 mt-1">
              For the period ended {new Date(activePeriod.reportingDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Prepared in accordance with {currentProject.ifrsStandard === 'full' ? 'International Financial Reporting Standards' : 'IFRS for Small and Medium-sized Entities'}
            </p>
          </div>

          {/* Statement of Financial Position */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 border-b border-gray-300 pb-2">
              Statement of Financial Position
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Assets */}
              <div>
                <h4 className="font-semibold text-lg mb-4 text-gray-800">Assets</h4>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Current Assets</span>
                    <span className="font-mono">
                      {formatCurrency(financialData.currentAssets, currentProject.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Non-Current Assets</span>
                    <span className="font-mono">
                      {formatCurrency(financialData.nonCurrentAssets, currentProject.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-400">
                    <span>Total Assets</span>
                    <span className="font-mono">
                      {formatCurrency(financialData.totalAssets, currentProject.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div>
                <h4 className="font-semibold text-lg mb-4 text-gray-800">Liabilities & Equity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Current Liabilities</span>
                    <span className="font-mono">
                      {formatCurrency(financialData.currentLiabilities, currentProject.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Non-Current Liabilities</span>
                    <span className="font-mono">
                      {formatCurrency(financialData.nonCurrentLiabilities, currentProject.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Equity</span>
                    <span className="font-mono">
                      {formatCurrency(financialData.totalEquity, currentProject.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-400">
                    <span>Total Liabilities & Equity</span>
                    <span className="font-mono">
                      {formatCurrency(financialData.totalLiabilities + financialData.totalEquity, currentProject.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Check */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">Balance Check:</span>
                <span className={`font-mono text-sm ${
                  Math.abs(financialData.totalAssets - (financialData.totalLiabilities + financialData.totalEquity)) < 1 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  Difference: {formatCurrency(
                    financialData.totalAssets - (financialData.totalLiabilities + financialData.totalEquity),
                    currentProject.currency
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Statement of Profit or Loss */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 border-b border-gray-300 pb-2">
              Statement of Profit or Loss and Other Comprehensive Income
            </h3>
            
            <div className="space-y-2 max-w-md">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-medium">Revenue</span>
                <span className="font-mono">
                  {formatCurrency(financialData.revenue, currentProject.currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-medium">Cost of Sales</span>
                <span className="font-mono">
                  ({formatCurrency(Math.abs(financialData.costOfSales), currentProject.currency)})
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-medium">Gross Profit</span>
                <span className="font-mono">
                  {formatCurrency(financialData.grossProfit, currentProject.currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-medium">Operating Expenses</span>
                <span className="font-mono">
                  ({formatCurrency(Math.abs(financialData.operatingExpenses), currentProject.currency)})
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-400">
                <span>Net Profit/(Loss)</span>
                <span className="font-mono">
                  {formatCurrency(financialData.netProfit, currentProject.currency)}
                </span>
              </div>
            </div>

            {/* Key Ratios */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600">Gross Margin</div>
                <div className="text-lg font-semibold">
                  {financialData.revenue > 0 ? ((financialData.grossProfit / financialData.revenue) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600">Operating Margin</div>
                <div className="text-lg font-semibold">
                  {financialData.revenue > 0 ? (((financialData.grossProfit - financialData.operatingExpenses) / financialData.revenue) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600">Net Margin</div>
                <div className="text-lg font-semibold">
                  {financialData.revenue > 0 ? ((financialData.netProfit / financialData.revenue) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-300">
            <p>Generated by Cheetah Reporter</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
