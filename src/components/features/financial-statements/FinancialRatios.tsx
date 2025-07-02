import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useProjectStore } from '@/store/projectStore';
import { calculateTotals } from '@/lib/financialCalculations';

const FinancialRatios: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();

  const activePeriod = currentProject?.periods.find(p => p.id === activePeriodId);
  const mappedTb = activePeriod?.mappedTrialBalance || null;
  const totals = calculateTotals(mappedTb);

  const ratios = {
    currentRatio: totals.totalCurrentLiabilities !== 0 ? Math.abs(totals.totalCurrentAssets / totals.totalCurrentLiabilities).toFixed(2) : 'N/A',
    debtToEquity: totals.totalEquity !== 0 ? Math.abs(totals.totalLiabilities / totals.totalEquity).toFixed(2) : 'N/A',
    grossProfitMargin: totals.revenue !== 0 ? (Math.abs((totals.revenue + totals.costOfGoodsSold) / totals.revenue) * 100).toFixed(2) + '%' : 'N/A',
    netProfitMargin: totals.revenue !== 0 ? (Math.abs(totals.netIncome / totals.revenue) * 100).toFixed(2) + '%' : 'N/A',
  };

  if (!activePeriod) {
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Key Financial Ratios</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Please select a reporting period to view financial ratios.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Key Financial Ratios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground">Current Ratio</h4>
            <p className="text-2xl font-bold">{ratios.currentRatio}</p>
            <p className="text-xs text-muted-foreground">Liquidity</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground">Debt-to-Equity</h4>
            <p className="text-2xl font-bold">{ratios.debtToEquity}</p>
            <p className="text-xs text-muted-foreground">Leverage</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground">Gross Profit Margin</h4>
            <p className="text-2xl font-bold">{ratios.grossProfitMargin}</p>
            <p className="text-xs text-muted-foreground">Profitability</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground">Net Profit Margin</h4>
            <p className="text-2xl font-bold">{ratios.netProfitMargin}</p>
            <p className="text-xs text-muted-foreground">Profitability</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialRatios;
