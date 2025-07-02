import React, { useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PeriodData, TrialBalanceAccount } from '@/types/project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const VarianceAnalysis: React.FC = () => {
    const { currentProject } = useProjectStore();
    const [period1Id, setPeriod1Id] = useState<string | null>(null);
    const [period2Id, setPeriod2Id] = useState<string | null>(null);

    // Helper function to calculate total for a statement section
    const calculateSectionTotal = (section: { [lineItem: string]: TrialBalanceAccount[] }) => {
        return Object.values(section).reduce((total, accounts) => {
            return total + accounts.reduce((lineTotal, account) => {
                return lineTotal + account.debit - account.credit;
            }, 0);
        }, 0);
    };

    const { period1, period2, mappedTb1, mappedTb2 } = useMemo(() => {
        if (!currentProject || !period1Id || !period2Id) {
            return { period1: null, period2: null, mappedTb1: null, mappedTb2: null };
        }
        const p1 = currentProject.periods.find(p => p.id === period1Id);
        const p2 = currentProject.periods.find(p => p.id === period2Id);
        return {
            period1: p1,
            period2: p2,
            mappedTb1: p1?.mappedTrialBalance,
            mappedTb2: p2?.mappedTrialBalance,
        };
    }, [currentProject, period1Id, period2Id]);

    const allVariances = useMemo(() => {
        if (!mappedTb1 || !mappedTb2) return [];

        const variances: {
            label: string;
            variance: number;
            variancePercentage: number;
            currentValue: number;
            previousValue: number;
        }[] = [];

        // Helper function to calculate total for a statement section
        const calculateSectionTotal = (section: { [lineItem: string]: TrialBalanceAccount[] }) => {
            return Object.values(section).reduce((total, accounts) => {
                return total + accounts.reduce((lineTotal, account) => {
                    return lineTotal + account.debit - account.credit;
                }, 0);
            }, 0);
        };

        // Calculate totals for each section
        const assets1 = calculateSectionTotal(mappedTb1.assets);
        const assets2 = calculateSectionTotal(mappedTb2.assets);
        const liabilities1 = calculateSectionTotal(mappedTb1.liabilities);
        const liabilities2 = calculateSectionTotal(mappedTb2.liabilities);
        const equity1 = calculateSectionTotal(mappedTb1.equity);
        const equity2 = calculateSectionTotal(mappedTb2.equity);
        const revenue1 = calculateSectionTotal(mappedTb1.revenue);
        const revenue2 = calculateSectionTotal(mappedTb2.revenue);
        const expenses1 = calculateSectionTotal(mappedTb1.expenses);
        const expenses2 = calculateSectionTotal(mappedTb2.expenses);

        // Create variance entries for major sections
        const sectionVariances = [
            { label: 'Total Assets', current: assets1, previous: assets2 },
            { label: 'Total Liabilities', current: liabilities1, previous: liabilities2 },
            { label: 'Total Equity', current: equity1, previous: equity2 },
            { label: 'Total Revenue', current: revenue1, previous: revenue2 },
            { label: 'Total Expenses', current: expenses1, previous: expenses2 },
            { label: 'Net Profit/Loss', current: revenue1 - expenses1, previous: revenue2 - expenses2 },
        ];

        sectionVariances.forEach(({ label, current, previous }) => {
            const variance = current - previous;
            const variancePercentage = previous !== 0 ? (variance / Math.abs(previous)) * 100 : 0;
            
            if (Math.abs(variance) > 0) {
                variances.push({
                    label,
                    variance,
                    variancePercentage,
                    currentValue: current,
                    previousValue: previous,
                });
            }
        });

        return variances;
    }, [mappedTb1, mappedTb2]);

    const keyVariances = useMemo(() => {
        return allVariances
            .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
            .slice(0, 5);
    }, [allVariances]);

    if (!currentProject) {
        return null;
    }

    const renderComparisonRow = (label: string, val1: number, val2: number, currency: string, isBold: boolean = false) => {
        const variance = val1 - val2;
        const variancePercentage = val2 !== 0 ? (variance / Math.abs(val2)) * 100 : 0;

        const rowClass = isBold ? "font-bold bg-muted/50" : "";

        return (
          <TableRow key={label} className={rowClass}>
            <TableCell className="font-medium">{label}</TableCell>
            <TableCell>{formatCurrency(val1, currency)}</TableCell>
            <TableCell>{formatCurrency(val2, currency)}</TableCell>
            <TableCell>{formatCurrency(variance, currency)}</TableCell>
            <TableCell className={variance >= 0 ? 'text-green-500' : 'text-red-500'}>
              {variancePercentage.toFixed(2)}%
            </TableCell>
          </TableRow>
        );
      };

  const renderLineItemRows = (section1: { [lineItem: string]: TrialBalanceAccount[] } | undefined, section2: { [lineItem: string]: TrialBalanceAccount[] } | undefined, currency: string) => {
    if (!section1 || !section2) return null;

    const allLineItems = new Set([...Object.keys(section1), ...Object.keys(section2)]);

    return Array.from(allLineItems).map(lineItem => {
        const accounts1 = section1[lineItem] || [];
        const accounts2 = section2[lineItem] || [];
        
        const total1 = accounts1.reduce((sum, acc) => sum + acc.debit - acc.credit, 0);
        const total2 = accounts2.reduce((sum, acc) => sum + acc.debit - acc.credit, 0);
        
        return renderComparisonRow(lineItem, total1, total2, currency);
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Variance Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="period1-selector" className="block text-sm font-medium text-gray-400 mb-1">Compare Period</label>
          <Select onValueChange={setPeriod1Id} value={period1Id || ''}>
            <SelectTrigger id="period1-selector"><SelectValue placeholder="Select a period" /></SelectTrigger>
            <SelectContent>
              {currentProject.periods.map((p: PeriodData) => (
                <SelectItem key={p.id} value={p.id} disabled={p.id === period2Id}>
                  {new Date(p.reportingDate).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="period2-selector" className="block text-sm font-medium text-gray-400 mb-1">With Period</label>
          <Select onValueChange={setPeriod2Id} value={period2Id || ''}>
            <SelectTrigger id="period2-selector"><SelectValue placeholder="Select a period" /></SelectTrigger>
            <SelectContent>
              {currentProject.periods.map((p: PeriodData) => (
                <SelectItem key={p.id} value={p.id} disabled={p.id === period1Id}>
                  {new Date(p.reportingDate).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {period1 && period2 && currentProject ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Key Variances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keyVariances.length > 0 ? keyVariances.map(v => (
                  <div key={v.label} className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium">{v.label}</p>
                      <span className={`flex items-center text-sm font-bold ${v.variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {v.variance >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                        {v.variancePercentage.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(v.variance, currentProject.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(v.previousValue, currentProject.currency)} to {formatCurrency(v.currentValue, currentProject.currency)}
                    </p>
                  </div>
                )) : <p className="text-muted-foreground col-span-full">No significant variances to display.</p>}
              </div>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Item</TableHead>
                <TableHead>{new Date(period1.reportingDate).toLocaleDateString()}</TableHead>
                <TableHead>{new Date(period2.reportingDate).toLocaleDateString()}</TableHead>
                <TableHead>Variance ($)</TableHead>
                <TableHead>Variance (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-bold bg-muted/80"><TableCell colSpan={5}>Statement of Financial Position</TableCell></TableRow>
              
              <TableRow className="font-semibold bg-muted/50"><TableCell colSpan={5}>Assets</TableCell></TableRow>
              {renderLineItemRows(mappedTb1?.assets, mappedTb2?.assets, currentProject.currency)}
              {renderComparisonRow('Total Assets', calculateSectionTotal(mappedTb1!.assets), calculateSectionTotal(mappedTb2!.assets), currentProject.currency, true)}
              
              <TableRow className="font-semibold bg-muted/50"><TableCell colSpan={5}>Liabilities</TableCell></TableRow>
              {renderLineItemRows(mappedTb1?.liabilities, mappedTb2?.liabilities, currentProject.currency)}
              {renderComparisonRow('Total Liabilities', calculateSectionTotal(mappedTb1!.liabilities), calculateSectionTotal(mappedTb2!.liabilities), currentProject.currency, true)}

              <TableRow className="font-semibold bg-muted/50"><TableCell colSpan={5}>Equity</TableCell></TableRow>
              {renderLineItemRows(mappedTb1?.equity, mappedTb2?.equity, currentProject.currency)}
              {renderComparisonRow('Total Equity', calculateSectionTotal(mappedTb1!.equity), calculateSectionTotal(mappedTb2!.equity), currentProject.currency, true)}

              <TableRow className="font-bold bg-muted/80"><TableCell colSpan={5}>Statement of Profit or Loss</TableCell></TableRow>

              <TableRow className="font-semibold bg-muted/50"><TableCell colSpan={5}>Revenue</TableCell></TableRow>
              {renderLineItemRows(mappedTb1?.revenue, mappedTb2?.revenue, currentProject.currency)}
              {renderComparisonRow('Total Revenue', calculateSectionTotal(mappedTb1!.revenue), calculateSectionTotal(mappedTb2!.revenue), currentProject.currency, true)}

              <TableRow className="font-semibold bg-muted/50"><TableCell colSpan={5}>Expenses</TableCell></TableRow>
              {renderLineItemRows(mappedTb1?.expenses, mappedTb2?.expenses, currentProject.currency)}
              {renderComparisonRow('Total Expenses', calculateSectionTotal(mappedTb1!.expenses), calculateSectionTotal(mappedTb2!.expenses), currentProject.currency, true)}

              {renderComparisonRow(
                'Net Profit/Loss',
                calculateSectionTotal(mappedTb1!.revenue) - calculateSectionTotal(mappedTb1!.expenses),
                calculateSectionTotal(mappedTb2!.revenue) - calculateSectionTotal(mappedTb2!.expenses),
                currentProject.currency,
                true
              )}

            </TableBody>
          </Table>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Please select two different periods to compare.</p>
        </div>
      )}
    </div>
  );
};

export default VarianceAnalysis;
