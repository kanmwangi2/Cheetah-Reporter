import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Commentable } from '../comments/Commentable';
import { calculateStatementOfChangesInEquity } from '@/lib/statementOfChangesInEquityCalculations';
import { formatCurrency } from './financialStatementUtils';
import type { StatementOfChangesInEquityData, PeriodData } from '@/types/project';

const renderEquityRow = (title: string, elementId: string, data: number[], currency: string, isBold = false) => (
  <Commentable elementId={elementId}>
    <TableRow className={isBold ? 'font-bold' : ''}>
      <TableCell className="font-medium">{title}</TableCell>
      {data.map((value, index) => (
        <TableCell key={index}>{value ? formatCurrency(value, currency) : ''}</TableCell>
      ))}
    </TableRow>
  </Commentable>
);

export const StatementOfChangesInEquity: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();

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

  const { reportingDate, mappedTrialBalance } = activePeriod;
  const { currency } = currentProject;
  const equityData = calculateStatementOfChangesInEquity(mappedTrialBalance || null);

  if (!equityData) {
    return (
        <div className="p-6 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Could not calculate Statement of Changes in Equity.</p>
            <p className="text-sm text-muted-foreground/80">Ensure the trial balance is mapped correctly for this period.</p>
        </div>
    );
  }

  const renderEquityColumn = (key: keyof StatementOfChangesInEquityData) => equityData[key];

  const shareCapital = renderEquityColumn('shareCapital');
  const retainedEarnings = renderEquityColumn('retainedEarnings');
  const otherReserves = renderEquityColumn('otherReserves');
  const total = renderEquityColumn('total');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statement of Changes in Equity</CardTitle>
        <p className="text-sm text-muted-foreground">For the year ended {new Date(reportingDate).toLocaleDateString()}</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4"></TableHead>
              <TableHead>Share Capital</TableHead>
              <TableHead>Retained Earnings</TableHead>
              <TableHead>Other Reserves</TableHead>
              <TableHead>Total Equity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderEquityRow('Opening Balance', 'soce-opening-balance', [shareCapital.opening, retainedEarnings.opening, otherReserves.opening, total.opening], currency)}
            {renderEquityRow('Profit for the year', 'soce-profit-for-year', [0, retainedEarnings.profit, 0, total.profit], currency)}
            {renderEquityRow('Other Comprehensive Income', 'soce-oci', [0, 0, otherReserves.oci, total.oci], currency)}
            {renderEquityRow('Issue of Share Capital', 'soce-shares-issued', [shareCapital.issued, 0, 0, total.issued], currency)}
            {renderEquityRow('Dividends', 'soce-dividends', [0, retainedEarnings.dividends, 0, total.dividends], currency)}
            {renderEquityRow('Closing Balance', 'soce-closing-balance', [shareCapital.closing, retainedEarnings.closing, otherReserves.closing, total.closing], currency, true)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
