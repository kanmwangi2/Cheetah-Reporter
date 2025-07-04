import type { 
  PeriodData, 
  Project,
  VarianceAnalysisResult,
  ComparativeStatement,
  MultiPeriodAnalysis,
  TrendAnalysis,
  AnalysisInsight,
  MappedTrialBalance
} from '@/types/project';

/**
 * Multi-Period Data Management Service
 * Handles comparative financial statements, period comparisons, and variance analysis
 */

export interface PeriodSelectionOptions {
  includeDrafts: boolean;
  periodTypes: ('annual' | 'interim' | 'quarterly' | 'monthly')[];
  maxPeriods: number;
  sortOrder: 'ascending' | 'descending';
}

export interface VarianceThresholds {
  materialityPercentage: number; // e.g., 5%
  materialityAmount: number; // e.g., 10000
  highMaterialityPercentage: number; // e.g., 25%
  immaterialAmount: number; // e.g., 1000
}

export const DEFAULT_VARIANCE_THRESHOLDS: VarianceThresholds = {
  materialityPercentage: 5,
  materialityAmount: 10000,
  highMaterialityPercentage: 25,
  immaterialAmount: 1000,
};

/**
 * Get periods suitable for comparison based on criteria
 */
export const getComparablePeriods = (
  project: Project,
  options: Partial<PeriodSelectionOptions> = {}
): PeriodData[] => {
  const {
    includeDrafts = false,
    periodTypes = ['annual', 'interim', 'quarterly', 'monthly'],
    maxPeriods = 5,
    sortOrder = 'descending'
  } = options;

  if (!project?.periods) return [];

  const filteredPeriods = project.periods.filter(period => {
    // Filter by status
    if (!includeDrafts && period.status === 'draft') return false;
    
    // Filter by period type
    if (!periodTypes.includes(period.periodType)) return false;
    
    // Must have mapped trial balance for comparison
    if (!period.mappedTrialBalance) return false;
    
    return true;
  });

  // Sort by reporting date
  filteredPeriods.sort((a, b) => {
    const dateA = new Date(a.reportingDate).getTime();
    const dateB = new Date(b.reportingDate).getTime();
    return sortOrder === 'ascending' ? dateA - dateB : dateB - dateA;
  });

  return filteredPeriods.slice(0, maxPeriods);
};

/**
 * Get the most appropriate comparative period for a given period
 */
export const getComparativePeriod = (
  project: Project,
  currentPeriod: PeriodData,
  comparisonType: 'year-over-year' | 'quarter-over-quarter' | 'period-over-period' = 'year-over-year'
): PeriodData | null => {
  if (!project?.periods) return null;

  const currentDate = new Date(currentPeriod.reportingDate);
  let targetDate: Date;

  switch (comparisonType) {
    case 'year-over-year':
      targetDate = new Date(currentDate);
      targetDate.setFullYear(currentDate.getFullYear() - 1);
      break;
    case 'quarter-over-quarter':
      targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() - 3);
      break;
    case 'period-over-period':
    default: {
      // Find the previous period chronologically
      const sortedPeriods = project.periods
        .filter(p => p.id !== currentPeriod.id && p.mappedTrialBalance)
        .sort((a, b) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime());
      
      const currentIndex = sortedPeriods.findIndex(p => new Date(p.reportingDate) < currentDate);
      return currentIndex >= 0 ? sortedPeriods[currentIndex] : null;
    }
  }

  // Find the closest period to the target date
  const comparativePeriods = project.periods
    .filter(p => p.id !== currentPeriod.id && p.mappedTrialBalance)
    .map(period => ({
      period,
      dateDiff: Math.abs(new Date(period.reportingDate).getTime() - targetDate.getTime())
    }))
    .sort((a, b) => a.dateDiff - b.dateDiff);

  return comparativePeriods.length > 0 ? comparativePeriods[0].period : null;
};

/**
 * Calculate variance between two periods for a specific line item
 */
export const calculateVariance = (
  currentValue: number,
  previousValue: number,
  thresholds: VarianceThresholds = DEFAULT_VARIANCE_THRESHOLDS
): Omit<VarianceAnalysisResult, 'lineItem' | 'lineItemLabel' | 'category'> => {
  const variance = currentValue - previousValue;
  const variancePercentage = previousValue !== 0 ? (variance / Math.abs(previousValue)) * 100 : 0;
  
  // Determine variance type
  let varianceType: 'favorable' | 'unfavorable' | 'neutral' = 'neutral';
  if (Math.abs(variance) > thresholds.immaterialAmount) {
    // For most financial items, an increase is favorable for assets/revenue and unfavorable for liabilities/expenses
    // This is a simplified logic - in practice, context matters more
    varianceType = variance > 0 ? 'favorable' : 'unfavorable';
  }

  // Determine materiality level
  let materialityLevel: 'immaterial' | 'material' | 'highly-material' = 'immaterial';
  const absVariancePercentage = Math.abs(variancePercentage);
  const absVariance = Math.abs(variance);

  if (absVariance >= thresholds.materialityAmount || absVariancePercentage >= thresholds.materialityPercentage) {
    materialityLevel = 'material';
  }
  if (absVariancePercentage >= thresholds.highMaterialityPercentage) {
    materialityLevel = 'highly-material';
  }

  return {
    currentValue,
    previousValue,
    variance,
    variancePercentage,
    varianceType,
    materialityLevel
  };
};

/**
 * Perform comprehensive variance analysis between two periods
 */
export const performVarianceAnalysis = (
  currentPeriod: PeriodData,
  previousPeriod: PeriodData,
  thresholds: VarianceThresholds = DEFAULT_VARIANCE_THRESHOLDS
): VarianceAnalysisResult[] => {
  if (!currentPeriod.mappedTrialBalance || !previousPeriod.mappedTrialBalance) {
    return [];
  }

  const results: VarianceAnalysisResult[] = [];
  const currentTB = currentPeriod.mappedTrialBalance;
  const previousTB = previousPeriod.mappedTrialBalance;

  // Analyze each section
  const sections: Array<{ key: keyof MappedTrialBalance, category: VarianceAnalysisResult['category'] }> = [
    { key: 'assets', category: 'assets' },
    { key: 'liabilities', category: 'liabilities' },
    { key: 'equity', category: 'equity' },
    { key: 'revenue', category: 'revenue' },
    { key: 'expenses', category: 'expenses' }
  ];

  sections.forEach(({ key, category }) => {
    const currentSection = currentTB[key];
    const previousSection = previousTB[key];

    if (!currentSection || !previousSection) return;

    // Get all unique line items from both periods
    const allLineItems = new Set([
      ...Object.keys(currentSection),
      ...Object.keys(previousSection)
    ]);

    allLineItems.forEach(lineItem => {
      const currentAccounts = currentSection[lineItem] || [];
      const previousAccounts = previousSection[lineItem] || [];

      const currentValue = currentAccounts.reduce((sum, acc) => sum + acc.debit - acc.credit, 0);
      const previousValue = previousAccounts.reduce((sum, acc) => sum + acc.debit - acc.credit, 0);

      const variance = calculateVariance(currentValue, previousValue, thresholds);

      results.push({
        lineItem,
        lineItemLabel: lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        category,
        ...variance
      });
    });
  });

  return results.filter(result => result.materialityLevel !== 'immaterial');
};

/**
 * Generate comparative statements for multiple periods
 */
export const generateComparativeStatements = (
  periods: PeriodData[],
  statementType: ComparativeStatement['statement']
): ComparativeStatement | null => {
  if (periods.length < 2) return null;

  const validPeriods = periods.filter(p => p.mappedTrialBalance);
  if (validPeriods.length < 2) return null;

  // Determine which sections to include based on statement type
  let sectionsToInclude: Array<keyof MappedTrialBalance>;
  switch (statementType) {
    case 'balance_sheet':
      sectionsToInclude = ['assets', 'liabilities', 'equity'];
      break;
    case 'income_statement':
      sectionsToInclude = ['revenue', 'expenses'];
      break;
    default:
      return null; // Cash flow and equity changes statements need special handling
  }

  // Get all unique line items across all periods
  const allLineItems = new Set<string>();
  validPeriods.forEach(period => {
    sectionsToInclude.forEach(section => {
      const sectionData = period.mappedTrialBalance?.[section];
      if (sectionData) {
        Object.keys(sectionData).forEach(lineItem => allLineItems.add(lineItem));
      }
    });
  });

  // Build comparative line items
  const lineItems = Array.from(allLineItems).map(lineItem => {
    const values: { [periodId: string]: number } = {};
    const variances: { [periodPair: string]: VarianceAnalysisResult } = {};

    // Calculate values for each period
    validPeriods.forEach(period => {
      let totalValue = 0;
      sectionsToInclude.forEach(section => {
        const sectionData = period.mappedTrialBalance?.[section];
        const accounts = sectionData?.[lineItem] || [];
        totalValue += accounts.reduce((sum, acc) => sum + acc.debit - acc.credit, 0);
      });
      values[period.id] = totalValue;
    });

    // Calculate variances between consecutive periods
    for (let i = 1; i < validPeriods.length; i++) {
      const currentPeriod = validPeriods[i];
      const previousPeriod = validPeriods[i - 1];
      const currentValue = values[currentPeriod.id];
      const previousValue = values[previousPeriod.id];

      const variance = calculateVariance(currentValue, previousValue);
      const pairKey = `${currentPeriod.id}_vs_${previousPeriod.id}`;

      variances[pairKey] = {
        lineItem,
        lineItemLabel: lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        category: sectionsToInclude.includes('assets') ? 'assets' : 
                  sectionsToInclude.includes('revenue') ? 'revenue' : 'expenses',
        ...variance
      };
    }

    return {
      id: lineItem,
      label: lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      values,
      variances,
      level: 1,
      isSubtotal: false,
      isBold: false
    };
  });

  // Calculate totals for each period
  const totals: { [periodId: string]: number } = {};
  validPeriods.forEach(period => {
    totals[period.id] = Object.values(lineItems.reduce((acc, item) => {
      acc[period.id] = (acc[period.id] || 0) + (item.values[period.id] || 0);
      return acc;
    }, {} as { [periodId: string]: number }))[0] || 0;
  });

  // Compile all variances
  const allVariances: VarianceAnalysisResult[] = [];
  lineItems.forEach(item => {
    Object.values(item.variances).forEach(variance => {
      if (variance.materialityLevel !== 'immaterial') {
        allVariances.push(variance);
      }
    });
  });

  return {
    statement: statementType,
    periods: validPeriods,
    lineItems,
    totals,
    variances: allVariances
  };
};

/**
 * Perform trend analysis on a specific metric across multiple periods
 */
export const performTrendAnalysis = (
  periods: PeriodData[],
  metricExtractor: (period: PeriodData) => number,
  metricName: string
): TrendAnalysis => {
  const sortedPeriods = periods
    .filter(p => p.mappedTrialBalance)
    .sort((a, b) => new Date(a.reportingDate).getTime() - new Date(b.reportingDate).getTime());

  const values = sortedPeriods.map(metricExtractor);
  const periodIds = sortedPeriods.map(p => p.id);

  // Calculate trend direction and strength
  let trend: TrendAnalysis['trend'] = 'stable';
  let trendStrength = 0;
  
  if (values.length >= 2) {
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changePercentage = firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : 0;
    
    if (Math.abs(changePercentage) < 5) {
      trend = 'stable';
      trendStrength = 0.2;
    } else if (changePercentage > 0) {
      trend = 'increasing';
      trendStrength = Math.min(Math.abs(changePercentage) / 50, 1);
    } else {
      trend = 'decreasing';
      trendStrength = Math.min(Math.abs(changePercentage) / 50, 1);
    }

    // Check for volatility
    const volatility = calculateVolatility(values);
    if (volatility > 0.3) {
      trend = 'volatile';
      trendStrength = volatility;
    }
  }

  // Calculate growth rate (CAGR for multiple periods)
  let growthRate = 0;
  if (values.length >= 2 && values[0] !== 0) {
    const periods_count = values.length - 1;
    growthRate = (Math.pow(Math.abs(values[values.length - 1]) / Math.abs(values[0]), 1 / periods_count) - 1) * 100;
  }

  return {
    metric: metricName,
    periods: periodIds,
    values,
    trend,
    trendStrength,
    growthRate
  };
};

/**
 * Calculate volatility (coefficient of variation)
 */
const calculateVolatility = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return mean !== 0 ? stdDev / Math.abs(mean) : 0;
};

/**
 * Generate insights from multi-period analysis
 */
export const generateAnalysisInsights = (
  multiPeriodAnalysis: MultiPeriodAnalysis
): AnalysisInsight[] => {
  const insights: AnalysisInsight[] = [];

  // Trend-based insights
  multiPeriodAnalysis.trends.forEach(trend => {
    if (trend.trendStrength > 0.7) {
      insights.push({
        type: 'trend',
        severity: trend.trendStrength > 0.9 ? 'high' : 'medium',
        title: `Strong ${trend.trend} trend in ${trend.metric}`,
        description: `${trend.metric} shows a strong ${trend.trend} trend with ${trend.growthRate.toFixed(1)}% growth rate.`,
        recommendation: trend.trend === 'decreasing' ? 
          'Investigate the causes of the decline and consider corrective actions.' :
          'Monitor this positive trend and identify factors that can sustain it.',
        relatedMetrics: [trend.metric],
        periodIds: trend.periods
      });
    }
  });

  // Variance-based insights
  multiPeriodAnalysis.statements.forEach(statement => {
    const highVariances = statement.variances.filter(v => v.materialityLevel === 'highly-material');
    if (highVariances.length > 0) {
      insights.push({
        type: 'variance',
        severity: 'high',
        title: `Significant variances detected in ${statement.statement.replace('_', ' ')}`,
        description: `Found ${highVariances.length} highly material variances that require attention.`,
        recommendation: 'Review the underlying transactions and consider providing explanatory notes.',
        relatedMetrics: highVariances.map(v => v.lineItem),
        periodIds: statement.periods.map(p => p.id)
      });
    }
  });

  return insights;
};

/**
 * Generate a comprehensive multi-period analysis
 */
export const generateMultiPeriodAnalysis = (
  project: Project,
  options: Partial<PeriodSelectionOptions> = {}
): MultiPeriodAnalysis | null => {
  const periods = getComparablePeriods(project, options);
  if (periods.length < 2) return null;

  // Generate comparative statements
  const statements: ComparativeStatement[] = [];
  const balanceSheet = generateComparativeStatements(periods, 'balance_sheet');
  const incomeStatement = generateComparativeStatements(periods, 'income_statement');
  
  if (balanceSheet) statements.push(balanceSheet);
  if (incomeStatement) statements.push(incomeStatement);

  // Generate trend analyses for key metrics
  const trends: TrendAnalysis[] = [
    performTrendAnalysis(periods, (p) => {
      const revenue = p.mappedTrialBalance?.revenue;
      if (!revenue) return 0;
      return Object.values(revenue).reduce((sum, accounts) => 
        sum + accounts.reduce((accSum, acc) => accSum + acc.debit - acc.credit, 0), 0);
    }, 'Total Revenue'),
    
    performTrendAnalysis(periods, (p) => {
      const assets = p.mappedTrialBalance?.assets;
      if (!assets) return 0;
      return Object.values(assets).reduce((sum, accounts) => 
        sum + accounts.reduce((accSum, acc) => accSum + acc.debit - acc.credit, 0), 0);
    }, 'Total Assets'),
    
    performTrendAnalysis(periods, (p) => {
      const expenses = p.mappedTrialBalance?.expenses;
      if (!expenses) return 0;
      return Object.values(expenses).reduce((sum, accounts) => 
        sum + accounts.reduce((accSum, acc) => accSum + acc.debit - acc.credit, 0), 0);
    }, 'Total Expenses')
  ];

  // Calculate key metrics for each period
  const keyMetrics: { [metric: string]: { [periodId: string]: number } } = {};
  const metricCalculators = {
    'Total Revenue': (p: PeriodData) => {
      const revenue = p.mappedTrialBalance?.revenue;
      if (!revenue) return 0;
      return Object.values(revenue).reduce((sum, accounts) => 
        sum + accounts.reduce((accSum, acc) => accSum + acc.debit - acc.credit, 0), 0);
    },
    'Total Assets': (p: PeriodData) => {
      const assets = p.mappedTrialBalance?.assets;
      if (!assets) return 0;
      return Object.values(assets).reduce((sum, accounts) => 
        sum + accounts.reduce((accSum, acc) => accSum + acc.debit - acc.credit, 0), 0);
    },
    'Net Income': (p: PeriodData) => {
      const revenue = p.mappedTrialBalance?.revenue;
      const expenses = p.mappedTrialBalance?.expenses;
      if (!revenue || !expenses) return 0;
      
      const totalRevenue = Object.values(revenue).reduce((sum, accounts) => 
        sum + accounts.reduce((accSum, acc) => accSum + acc.debit - acc.credit, 0), 0);
      const totalExpenses = Object.values(expenses).reduce((sum, accounts) => 
        sum + accounts.reduce((accSum, acc) => accSum + acc.debit - acc.credit, 0), 0);
        
      return totalRevenue - totalExpenses;
    }
  };

  Object.entries(metricCalculators).forEach(([metric, calculator]) => {
    keyMetrics[metric] = {};
    periods.forEach(period => {
      keyMetrics[metric][period.id] = calculator(period);
    });
  });

  const analysis: MultiPeriodAnalysis = {
    periods,
    statements,
    trends,
    keyMetrics,
    insights: []
  };

  // Generate insights
  analysis.insights = generateAnalysisInsights(analysis);

  return analysis;
};
