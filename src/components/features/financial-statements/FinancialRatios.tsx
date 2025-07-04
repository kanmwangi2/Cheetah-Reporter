import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProjectStore } from '@/store/projectStore';
import { calculateFinancialRatios, generateRatioAlerts, RatioCategory, type FinancialRatioSuite, type RatioResult } from '@/lib/ratioCalculations';
import type { PeriodData } from '@/types/project';

interface RatioCardProps {
  ratio: RatioResult;
  showFormula?: boolean;
}

const RatioCard: React.FC<RatioCardProps> = ({ ratio, showFormula = false }) => {
  const formatValue = (value: number, category: string) => {
    if (isNaN(value) || value === 0) return 'N/A';
    
    if (category === RatioCategory.PROFITABILITY && ratio.label.includes('Margin')) {
      return `${value.toFixed(1)}%`;
    }
    if (category === RatioCategory.GROWTH) {
      return `${value.toFixed(1)}%`;
    }
    if (category === RatioCategory.TURNOVER && ratio.label.includes('Days')) {
      return `${Math.round(value)} days`;
    }
    
    return value.toFixed(2);
  };

  const getInterpretationColor = (interpretation: string) => {
    if (interpretation.includes('excellent') || interpretation.includes('strong')) return 'text-green-600';
    if (interpretation.includes('good') || interpretation.includes('adequate')) return 'text-blue-600';
    if (interpretation.includes('concerns') || interpretation.includes('low') || interpretation.includes('risk')) return 'text-red-600';
    if (interpretation.includes('high leverage') || interpretation.includes('tight')) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <h4 className="text-sm font-medium text-muted-foreground">{ratio.label}</h4>
      <p className="text-2xl font-bold mb-1">{formatValue(ratio.value, ratio.category)}</p>
      <p className={`text-xs ${getInterpretationColor(ratio.interpretation)}`}>
        {ratio.interpretation}
      </p>
      {showFormula && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="font-medium">Formula:</p>
          <p className="italic">{ratio.formula}</p>
        </div>
      )}
    </div>
  );
};

const FinancialRatios: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();
  const [showFormulas, setShowFormulas] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RatioCategory>(RatioCategory.PROFITABILITY);

  const activePeriod = currentProject?.periods.find((p: PeriodData) => p.id === activePeriodId);

  if (!currentProject) {
    return <div>Loading project data...</div>;
  }

  if (!activePeriod) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No reporting period selected.</p>
        <p className="text-sm text-muted-foreground/80">Please select a period to view financial ratios.</p>
      </div>
    );
  }

  const { trialBalance } = activePeriod;

  if (!trialBalance) {
    return (
      <div className="p-6 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">No trial balance data available.</p>
        <p className="text-sm text-muted-foreground/80">Please import trial balance data to calculate ratios.</p>
      </div>
    );
  }

  // Get previous periods for growth calculations
  const previousPeriods = currentProject.periods
    .filter((p: PeriodData) => new Date(p.reportingDate) < new Date(activePeriod.reportingDate) && p.trialBalance)
    .sort((a: PeriodData, b: PeriodData) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime())
    .slice(0, 3)
    .map((p: PeriodData) => p.trialBalance!)
    .reverse();

  const ratioSuite: FinancialRatioSuite = calculateFinancialRatios(trialBalance, previousPeriods);
  const alerts = generateRatioAlerts(ratioSuite);

  const categoryRatios: Record<RatioCategory, RatioResult[]> = {
    [RatioCategory.LIQUIDITY]: Object.values(ratioSuite.liquidity),
    [RatioCategory.PROFITABILITY]: Object.values(ratioSuite.profitability),
    [RatioCategory.LEVERAGE]: Object.values(ratioSuite.leverage),
    [RatioCategory.EFFICIENCY]: Object.values(ratioSuite.efficiency),
    [RatioCategory.TURNOVER]: Object.values(ratioSuite.turnover),
    [RatioCategory.COVERAGE]: Object.values(ratioSuite.coverage),
    [RatioCategory.MARKET]: Object.values(ratioSuite.market).filter(Boolean) as RatioResult[],
    [RatioCategory.GROWTH]: Object.values(ratioSuite.growth).filter(Boolean) as RatioResult[]
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Financial Ratio Analysis
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showFormulas}
                  onChange={(e) => setShowFormulas(e.target.checked)}
                  className="rounded"
                />
                <span>Show Formulas</span>
              </label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="text-sm font-medium text-muted-foreground">Overall Score</h4>
              <p className="text-2xl font-bold text-blue-600">{ratioSuite.summary.overallScore}/100</p>
              <p className="text-xs text-muted-foreground">Financial Health</p>
            </div>
            <div className="p-4 border rounded-lg bg-green-50">
              <h4 className="text-sm font-medium text-muted-foreground">Strengths</h4>
              <p className="text-sm font-medium text-green-600">
                {ratioSuite.summary.strengthAreas.join(', ') || 'None identified'}
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-orange-50">
              <h4 className="text-sm font-medium text-muted-foreground">Weaknesses</h4>
              <p className="text-sm font-medium text-orange-600">
                {ratioSuite.summary.weaknessAreas.join(', ') || 'None identified'}
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="text-sm font-medium text-muted-foreground">Ratios Calculated</h4>
              <p className="text-2xl font-bold text-gray-600">
                {Object.values(categoryRatios).flat().length}
              </p>
              <p className="text-xs text-muted-foreground">Total Ratios</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ratio Categories */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as RatioCategory)}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value={RatioCategory.PROFITABILITY}>Profitability</TabsTrigger>
          <TabsTrigger value={RatioCategory.LIQUIDITY}>Liquidity</TabsTrigger>
          <TabsTrigger value={RatioCategory.LEVERAGE}>Leverage</TabsTrigger>
          <TabsTrigger value={RatioCategory.EFFICIENCY}>Efficiency</TabsTrigger>
          <TabsTrigger value={RatioCategory.TURNOVER}>Turnover</TabsTrigger>
          <TabsTrigger value={RatioCategory.COVERAGE}>Coverage</TabsTrigger>
          <TabsTrigger value={RatioCategory.MARKET}>Market</TabsTrigger>
          <TabsTrigger value={RatioCategory.GROWTH}>Growth</TabsTrigger>
        </TabsList>

        {Object.entries(categoryRatios).map(([category, ratios]) => (
          <TabsContent key={category} value={category} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{category} Ratios</CardTitle>
              </CardHeader>
              <CardContent>
                {ratios.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ratios.map((ratio, index) => (
                      <RatioCard key={index} ratio={ratio} showFormula={showFormulas} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {category === RatioCategory.MARKET
                      ? 'Market ratios require share price and share count data'
                      : category === RatioCategory.GROWTH
                      ? 'Growth ratios require previous period data'
                      : 'No ratios available for this category'}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ratioSuite.summary.keyInsights.map((insight, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ratioSuite.summary.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialRatios;
