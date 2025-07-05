import React from 'react';
import type { DashboardWidget, WidgetData } from '../../../types/dashboard';
import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart, Calculator } from 'lucide-react';

interface WidgetRendererProps {
  widget: DashboardWidget;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget }) => {
  // Mock data for demonstration - in real implementation, this would fetch from data sources
  const getMockData = (): WidgetData => {
    switch (widget.type) {
      case 'kpi-card':
        return {
          value: 1250000,
          previousValue: 1100000,
          trend: 'up',
          change: 150000,
          changePercent: 13.6,
          timestamp: new Date(),
        };
      case 'financial-ratios':
        return {
          value: {
            currentRatio: 2.45,
            quickRatio: 1.82,
            debtToEquity: 0.67,
            returnOnEquity: 0.156,
            grossMargin: 0.42,
            netMargin: 0.18,
          },
          timestamp: new Date(),
        };
      case 'cash-flow-chart':
        return {
          value: {
            periods: ['Q1', 'Q2', 'Q3', 'Q4'],
            operatingCashFlow: [120000, 135000, 142000, 158000],
            investingCashFlow: [-45000, -32000, -28000, -35000],
            financingCashFlow: [-25000, -18000, -22000, -30000],
          },
          timestamp: new Date(),
        };
      default:
        return {
          value: 'No data available',
          timestamp: new Date(),
        };
    }
  };

  const data = getMockData();
  const formatValue = (value: unknown): string => {
    if (typeof value === 'number') {
      switch (widget.config.format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value);
        case 'percentage':
          return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
          }).format(value);
        case 'number':
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: widget.config.precision || 2,
          }).format(value);
        default:
          return value.toString();
      }
    }
    return String(value);
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  switch (widget.type) {
    case 'kpi-card':
      return (
        <div className="flex flex-col justify-center h-full">
          <div className="text-2xl font-bold mb-1">
            {formatValue(data.value)}
          </div>
          {data.previousValue && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getTrendIcon(data.trend)}
              <span>
                {data.changePercent ? `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(1)}%` : ''}
                {data.change ? ` (${formatValue(data.change)})` : ''}
              </span>
            </div>
          )}
        </div>
      );

    case 'financial-ratios':
      if (typeof data.value === 'object' && data.value !== null) {
        const ratios = data.value as Record<string, number>;
        return (
          <div className="space-y-3 h-full overflow-auto">
            {Object.entries(ratios).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
                <span className="font-medium">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      break;

    case 'cash-flow-chart':
      if (typeof data.value === 'object' && data.value !== null) {
        const chartData = data.value as {
          periods: string[];
          operatingCashFlow: number[];
          investingCashFlow: number[];
          financingCashFlow: number[];
        };
        return (
          <div className="space-y-2 h-full">
            <div className="text-sm text-muted-foreground mb-2">Cash Flow Trends</div>
            {chartData.periods.map((period, index) => (
              <div key={period} className="grid grid-cols-4 gap-2 text-xs">
                <div className="font-medium">{period}</div>
                <div className="text-green-600">
                  {formatValue(chartData.operatingCashFlow[index])}
                </div>
                <div className="text-blue-600">
                  {formatValue(chartData.investingCashFlow[index])}
                </div>
                <div className="text-purple-600">
                  {formatValue(chartData.financingCashFlow[index])}
                </div>
              </div>
            ))}
          </div>
        );
      }
      break;

    case 'line-chart':
    case 'bar-chart':
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">Chart Placeholder</div>
            <div className="text-xs text-muted-foreground">
              {widget.type.replace('-', ' ').toUpperCase()}
            </div>
          </div>
        </div>
      );

    case 'pie-chart':
    case 'donut-chart':
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">Chart Placeholder</div>
            <div className="text-xs text-muted-foreground">
              {widget.type.replace('-', ' ').toUpperCase()}
            </div>
          </div>
        </div>
      );

    case 'table':
      return (
        <div className="h-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Account</th>
                <th className="text-right py-1">Amount</th>
                <th className="text-right py-1">%</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1">Cash & Equivalents</td>
                <td className="text-right py-1">{formatValue(500000)}</td>
                <td className="text-right py-1">25%</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">Accounts Receivable</td>
                <td className="text-right py-1">{formatValue(350000)}</td>
                <td className="text-right py-1">17.5%</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">Inventory</td>
                <td className="text-right py-1">{formatValue(450000)}</td>
                <td className="text-right py-1">22.5%</td>
              </tr>
            </tbody>
          </table>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Calculator className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">Widget Type</div>
            <div className="text-xs text-muted-foreground">
              {widget.type.replace('-', ' ').toUpperCase()}
            </div>
          </div>
        </div>
      );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-sm text-muted-foreground">
          {formatValue(data.value)}
        </div>
      </div>
    </div>
  );
};
