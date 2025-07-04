import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Commentable } from '../comments/Commentable';
import { calculateStatementOfChangesInEquity, validateEquityStatement, type EquityCalculationOptions } from '@/lib/statementOfChangesInEquityCalculations';
import { formatCurrency } from './financialStatementUtils';
import type { PeriodData } from '@/types/project';

interface EquityRowProps {
  title: string;
  elementId: string;
  shareCapital: number;
  additionalPaidIn?: number;
  retainedEarnings: number;
  accumulatedOCI?: number;
  otherReserves: number;
  treasuryStock?: number;
  total: number;
  currency: string;
  isBold?: boolean;
  showTreasury?: boolean;
}

const EquityRow: React.FC<EquityRowProps> = ({ 
  title, elementId, shareCapital, additionalPaidIn, retainedEarnings, 
  accumulatedOCI, otherReserves, treasuryStock, total, currency, isBold = false, showTreasury = false 
}) => (
  <Commentable elementId={elementId}>
    <TableRow className={isBold ? 'font-bold border-t-2' : ''}>
      <TableCell className="font-medium">{title}</TableCell>
      <TableCell>{formatCurrency(shareCapital, currency)}</TableCell>
      {additionalPaidIn !== undefined && <TableCell>{formatCurrency(additionalPaidIn, currency)}</TableCell>}
      <TableCell>{formatCurrency(retainedEarnings, currency)}</TableCell>
      {accumulatedOCI !== undefined && <TableCell>{formatCurrency(accumulatedOCI, currency)}</TableCell>}
      <TableCell>{formatCurrency(otherReserves, currency)}</TableCell>
      {showTreasury && treasuryStock !== undefined && <TableCell>{formatCurrency(treasuryStock, currency)}</TableCell>}
      <TableCell className={isBold ? 'font-bold' : ''}>{formatCurrency(total, currency)}</TableCell>
    </TableRow>
  </Commentable>
);

export const StatementOfChangesInEquity: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();
  const [options, setOptions] = useState<EquityCalculationOptions>({
    includeTreasuryShares: true,
    includeShareBasedPayments: true,
    includeDividendDetails: true,
    includeMultiClassShares: false
  });

  const activePeriod = currentProject?.periods.find((p: PeriodData) => p.id === activePeriodId);

  if (!currentProject) {
    return <div>Loading project data...</div>;
  }

  if (!activePeriod) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No reporting period selected.</p>
        <p className="text-sm text-muted-foreground/80">Please select a period to view the financial statements.</p>
      </div>
    );
  }

  const { reportingDate, trialBalance } = activePeriod;
  const { currency } = currentProject;
  
  // Find previous period for enhanced calculations
  const previousPeriod = currentProject.periods.find(p => 
    new Date(p.reportingDate) < new Date(reportingDate)
  );
  
  const enhancedOptions: EquityCalculationOptions = {
    ...options,
    previousPeriodData: previousPeriod?.trialBalance || null
  };

  const equityData = calculateStatementOfChangesInEquity(trialBalance || null, enhancedOptions);
  const validation = validateEquityStatement(equityData);

  if (!equityData) {
    return (
        <div className="p-6 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Could not calculate Statement of Changes in Equity.</p>
            <p className="text-sm text-muted-foreground/80">Ensure the trial balance is mapped correctly for this period.</p>
        </div>
    );
  }

  const showTreasury = options.includeTreasuryShares && !!equityData.treasuryStock;
  const showAdditionalPaidIn = !!equityData.additionalPaidInCapital;
  const showAccumulatedOCI = !!equityData.accumulatedOCI;

  return (
    <div className="space-y-6">
      {/* Options Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Display Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.includeTreasuryShares}
                onChange={(e) => setOptions(prev => ({ ...prev, includeTreasuryShares: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include Treasury Shares</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.includeShareBasedPayments}
                onChange={(e) => setOptions(prev => ({ ...prev, includeShareBasedPayments: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include Share-Based Payments</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.includeDividendDetails}
                onChange={(e) => setOptions(prev => ({ ...prev, includeDividendDetails: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include Dividend Details</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Validation Errors:</p>
              {validation.errors.map((error, index) => (
                <p key={index} className="text-sm">• {error}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Warnings:</p>
              {validation.warnings.map((warning, index) => (
                <p key={index} className="text-sm">• {warning}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Statement of Changes in Equity</CardTitle>
          <p className="text-sm text-muted-foreground">For the year ended {new Date(reportingDate).toLocaleDateString()}</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6"></TableHead>
                <TableHead>Share Capital</TableHead>
                {showAdditionalPaidIn && <TableHead>Additional Paid-in Capital</TableHead>}
                <TableHead>Retained Earnings</TableHead>
                {showAccumulatedOCI && <TableHead>Accumulated OCI</TableHead>}
                <TableHead>Other Reserves</TableHead>
                {showTreasury && <TableHead>Treasury Stock</TableHead>}
                <TableHead>Total Equity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <EquityRow
                title="Opening Balance"
                elementId="soce-opening-balance"
                shareCapital={equityData.shareCapital.opening}
                additionalPaidIn={showAdditionalPaidIn ? equityData.additionalPaidInCapital?.opening : undefined}
                retainedEarnings={equityData.retainedEarnings.opening}
                accumulatedOCI={showAccumulatedOCI ? equityData.accumulatedOCI?.opening : undefined}
                otherReserves={equityData.otherReserves.opening}
                treasuryStock={showTreasury ? equityData.treasuryStock?.opening : undefined}
                total={equityData.total.opening}
                currency={currency}
                showTreasury={showTreasury}
              />
              
              <EquityRow
                title="Profit for the year"
                elementId="soce-profit-for-year"
                shareCapital={0}
                additionalPaidIn={showAdditionalPaidIn ? 0 : undefined}
                retainedEarnings={equityData.retainedEarnings.profit}
                accumulatedOCI={showAccumulatedOCI ? 0 : undefined}
                otherReserves={0}
                treasuryStock={showTreasury ? 0 : undefined}
                total={equityData.total.profit}
                currency={currency}
                showTreasury={showTreasury}
              />

              <EquityRow
                title="Other Comprehensive Income"
                elementId="soce-oci"
                shareCapital={0}
                additionalPaidIn={showAdditionalPaidIn ? 0 : undefined}
                retainedEarnings={0}
                accumulatedOCI={showAccumulatedOCI ? equityData.accumulatedOCI?.oci || 0 : undefined}
                otherReserves={equityData.otherReserves.oci}
                treasuryStock={showTreasury ? 0 : undefined}
                total={equityData.total.oci}
                currency={currency}
                showTreasury={showTreasury}
              />

              <EquityRow
                title="Issue of Share Capital"
                elementId="soce-shares-issued"
                shareCapital={equityData.shareCapital.issued}
                additionalPaidIn={showAdditionalPaidIn ? equityData.additionalPaidInCapital?.issued || 0 : undefined}
                retainedEarnings={0}
                accumulatedOCI={showAccumulatedOCI ? 0 : undefined}
                otherReserves={0}
                treasuryStock={showTreasury ? 0 : undefined}
                total={equityData.total.issued}
                currency={currency}
                showTreasury={showTreasury}
              />

              {options.includeShareBasedPayments && (
                <EquityRow
                  title="Share-based Payments"
                  elementId="soce-share-based-payments"
                  shareCapital={equityData.shareCapital.shareBasedPayments || 0}
                  additionalPaidIn={showAdditionalPaidIn ? 0 : undefined}
                  retainedEarnings={0}
                  accumulatedOCI={showAccumulatedOCI ? 0 : undefined}
                  otherReserves={0}
                  treasuryStock={showTreasury ? 0 : undefined}
                  total={equityData.shareCapital.shareBasedPayments || 0}
                  currency={currency}
                  showTreasury={showTreasury}
                />
              )}

              {showTreasury && (
                <EquityRow
                  title="Treasury Share Transactions"
                  elementId="soce-treasury-shares"
                  shareCapital={0}
                  additionalPaidIn={showAdditionalPaidIn ? 0 : undefined}
                  retainedEarnings={0}
                  accumulatedOCI={showAccumulatedOCI ? 0 : undefined}
                  otherReserves={0}
                  treasuryStock={equityData.treasuryStock?.treasuryShares || 0}
                  total={-(equityData.treasuryStock?.treasuryShares || 0)}
                  currency={currency}
                  showTreasury={showTreasury}
                />
              )}

              <EquityRow
                title="Dividends"
                elementId="soce-dividends"
                shareCapital={0}
                additionalPaidIn={showAdditionalPaidIn ? 0 : undefined}
                retainedEarnings={equityData.retainedEarnings.dividends}
                accumulatedOCI={showAccumulatedOCI ? 0 : undefined}
                otherReserves={0}
                treasuryStock={showTreasury ? 0 : undefined}
                total={equityData.total.dividends}
                currency={currency}
                showTreasury={showTreasury}
              />

              <EquityRow
                title="Closing Balance"
                elementId="soce-closing-balance"
                shareCapital={equityData.shareCapital.closing}
                additionalPaidIn={showAdditionalPaidIn ? equityData.additionalPaidInCapital?.closing : undefined}
                retainedEarnings={equityData.retainedEarnings.closing}
                accumulatedOCI={showAccumulatedOCI ? equityData.accumulatedOCI?.closing : undefined}
                otherReserves={equityData.otherReserves.closing}
                treasuryStock={showTreasury ? equityData.treasuryStock?.closing : undefined}
                total={equityData.total.closing}
                currency={currency}
                isBold={true}
                showTreasury={showTreasury}
              />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Tabs defaultValue="share-details" className="w-full">
        <TabsList>
          <TabsTrigger value="share-details">Share Details</TabsTrigger>
          {options.includeDividendDetails && equityData.dividendDetails && (
            <TabsTrigger value="dividend-details">Dividend Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="share-details">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share Information</CardTitle>
            </CardHeader>
            <CardContent>
              {equityData.shareDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Shares Outstanding - Opening</p>
                    <p className="font-medium">{equityData.shareDetails.sharesOutstandingOpening.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shares Issued</p>
                    <p className="font-medium">{equityData.shareDetails.sharesIssued.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shares Repurchased</p>
                    <p className="font-medium">{equityData.shareDetails.sharesPurchased.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shares Outstanding - Closing</p>
                    <p className="font-medium">{equityData.shareDetails.sharesOutstandingClosing.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Weighted Average Shares</p>
                    <p className="font-medium">{equityData.shareDetails.weightedAverageShares.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {options.includeDividendDetails && equityData.dividendDetails && (
          <TabsContent value="dividend-details">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dividend Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Interim Dividends</p>
                    <p className="font-medium">{formatCurrency(equityData.dividendDetails.interimDividends, currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Final Dividends</p>
                    <p className="font-medium">{formatCurrency(equityData.dividendDetails.finalDividends, currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dividends per Share</p>
                    <p className="font-medium">{equityData.dividendDetails.totalDividendsPerShare.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dividend Yield</p>
                    <p className="font-medium">{equityData.dividendDetails.dividendYield.toFixed(2)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
