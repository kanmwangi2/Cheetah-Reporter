import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useDateFormat } from '@/lib/dateUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Calendar, TrendingUp, BarChart3, Plus, X } from 'lucide-react';
import { getComparablePeriods, getComparativePeriod } from '@/lib/multiPeriodAnalysis';
import type { PeriodData } from '@/types/project';

interface PeriodSelectorProps {
  multiSelect?: boolean;
  onPeriodsChange?: (periods: PeriodData[]) => void;
  maxPeriods?: number;
  showComparativeOptions?: boolean;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ 
  multiSelect = false,
  onPeriodsChange,
  maxPeriods = 5,
  showComparativeOptions = false
}) => {
  const {
    currentProject,
    activePeriodId,
    setActivePeriod,
  } = useProjectStore();
  
  const { formatDate } = useDateFormat();

  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'year-over-year' | 'quarter-over-quarter' | 'period-over-period'>('year-over-year');

  const handlePeriodChange = (periodId: string) => {
    setActivePeriod(periodId);
    
    if (multiSelect) {
      const newSelection = selectedPeriods.includes(periodId) 
        ? selectedPeriods.filter(id => id !== periodId)
        : [...selectedPeriods, periodId].slice(0, maxPeriods);
      
      setSelectedPeriods(newSelection);
      
      if (onPeriodsChange && currentProject) {
        const periods = newSelection
          .map(id => currentProject.periods.find(p => p.id === id))
          .filter((p): p is PeriodData => p !== undefined);
        onPeriodsChange(periods);
      }
    }
  };

  const addComparativePeriod = () => {
    if (!currentProject || !activePeriodId) return;
    
    const activePeriod = currentProject.periods.find(p => p.id === activePeriodId);
    if (!activePeriod) return;

    const comparativePeriod = getComparativePeriod(currentProject, activePeriod, comparisonMode);
    if (comparativePeriod && !selectedPeriods.includes(comparativePeriod.id)) {
      const newSelection = [...selectedPeriods, comparativePeriod.id].slice(0, maxPeriods);
      setSelectedPeriods(newSelection);
      
      if (onPeriodsChange) {
        const periods = newSelection
          .map(id => currentProject.periods.find(p => p.id === id))
          .filter((p): p is PeriodData => p !== undefined);
        onPeriodsChange(periods);
      }
    }
  };

  const removePeriod = (periodId: string) => {
    const newSelection = selectedPeriods.filter(id => id !== periodId);
    setSelectedPeriods(newSelection);
    
    if (onPeriodsChange && currentProject) {
      const periods = newSelection
        .map(id => currentProject.periods.find(p => p.id === id))
        .filter((p): p is PeriodData => p !== undefined);
      onPeriodsChange(periods);
    }
  };

  const getComparablePeriodsList = () => {
    if (!currentProject) return [];
    return getComparablePeriods(currentProject, {
      includeDrafts: false,
      maxPeriods: 10,
      sortOrder: 'descending'
    });
  };

  const formatPeriodLabel = (period: PeriodData) => {
    const date = formatDate(period.reportingDate);
    const statusBadge = period.status !== 'approved' ? ` (${period.status})` : '';
    const periodType = period.periodType !== 'annual' ? ` [${period.periodType}]` : '';
    return `${date}${periodType}${statusBadge}`;
  };

  if (!currentProject || !currentProject.periods || currentProject.periods.length === 0) {
    return null;
  }

  const comparablePeriods = getComparablePeriodsList();

  return (
    <div className="space-y-4">
      {/* Primary Period Selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor="period-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Primary Reporting Period
          </label>
          <Select onValueChange={handlePeriodChange} value={activePeriodId || ''}>
            <SelectTrigger id="period-selector">
              <SelectValue placeholder="Select a period" />
            </SelectTrigger>
            <SelectContent>
              {comparablePeriods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatPeriodLabel(period)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showComparativeOptions && (
          <div className="flex items-center gap-2">
            <Select value={comparisonMode} onValueChange={(value: 'year-over-year' | 'quarter-over-quarter' | 'period-over-period') => setComparisonMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year-over-year">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Year over Year
                  </div>
                </SelectItem>
                <SelectItem value="quarter-over-quarter">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Quarter over Quarter
                  </div>
                </SelectItem>
                <SelectItem value="period-over-period">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Period over Period
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={addComparativePeriod}
              variant="outline"
              size="sm"
              disabled={!activePeriodId}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Comparative
            </Button>
          </div>
        )}
      </div>

      {/* Multi-Select Period Display */}
      {multiSelect && selectedPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Selected Periods for Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedPeriods.map(periodId => {
                const period = currentProject.periods.find(p => p.id === periodId);
                if (!period) return null;
                
                return (
                  <div
                    key={periodId}
                    className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                  >
                    <Calendar className="h-3 w-3" />
                    {formatPeriodLabel(period)}
                    <button
                      onClick={() => removePeriod(periodId)}
                      className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            {selectedPeriods.length >= maxPeriods && (
              <p className="text-xs text-muted-foreground mt-2">
                Maximum of {maxPeriods} periods can be selected for comparison.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Period Status Summary */}
      {activePeriodId && (
        <div className="text-xs text-muted-foreground">
          {(() => {
            const activePeriod = currentProject.periods.find(p => p.id === activePeriodId);
            if (!activePeriod) return null;
            
            return (
              <div className="flex items-center gap-4">
                <span>Status: {activePeriod.status}</span>
                <span>Type: {activePeriod.periodType}</span>
                {activePeriod.fiscalYear && <span>FY: {activePeriod.fiscalYear}</span>}
                {activePeriod.mappedTrialBalance && <span className="text-green-600">✓ Mapped</span>}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
