import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PeriodSelector: React.FC = () => {
  const {
    currentProject,
    activePeriodId,
    setActivePeriod,
  } = useProjectStore();

  const handlePeriodChange = (periodId: string) => {
    setActivePeriod(periodId);
  };

  if (!currentProject || !currentProject.periods || currentProject.periods.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 w-full md:w-1/3 lg:w-1/4">
        <label htmlFor="period-selector" className="block text-sm font-medium text-gray-400 mb-1">Reporting Period</label>
        <Select onValueChange={handlePeriodChange} value={activePeriodId || ''}>
        <SelectTrigger id="period-selector">
            <SelectValue placeholder="Select a period" />
        </SelectTrigger>
        <SelectContent>
            {currentProject.periods
            .sort((a, b) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime())
            .map((period) => (
                <SelectItem key={period.id} value={period.id}>
                {new Date(period.reportingDate).toLocaleDateString()}
                </SelectItem>
            ))}
        </SelectContent>
        </Select>
    </div>
  );
};

export default PeriodSelector;
