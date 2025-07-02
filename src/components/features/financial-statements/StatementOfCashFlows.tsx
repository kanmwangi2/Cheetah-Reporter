import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Commentable } from '../comments/Commentable';
import { calculateStatementOfCashFlows } from '@/lib/statementOfCashFlowsCalculations';
import { formatCurrency } from './financialStatementUtils';
import type { CashFlowSection, PeriodData } from '@/types/project';

const renderSection = (section: CashFlowSection, currency: string) => (
  <React.Fragment key={section.id}>
    <TableRow className="font-bold">
      <TableCell colSpan={2}>{section.label}</TableCell>
    </TableRow>
    {section.items.map(item => (
      <Commentable key={item.id} elementId={`scf-${section.id}-${item.id}`}>
        <TableRow>
          <TableCell className="pl-8">{item.label}</TableCell>
          <TableCell className="text-right">{formatCurrency(item.value, currency)}</TableCell>
        </TableRow>
      </Commentable>
    ))}
    <TableRow className="font-semibold">
      <TableCell>Net cash from {section.id} activities</TableCell>
      <TableCell className="text-right">{formatCurrency(section.total, currency)}</TableCell>
    </TableRow>
  </React.Fragment>
);

export const StatementOfCashFlows: React.FC = () => {
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
  const cashFlowData = calculateStatementOfCashFlows(mappedTrialBalance || null);

  if (!cashFlowData) {
    return (
        <div className="p-6 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Could not calculate Statement of Cash Flows.</p>
            <p className="text-sm text-muted-foreground/80">Ensure the trial balance is mapped correctly for this period.</p>
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statement of Cash Flows</CardTitle>
        <p className="text-sm text-muted-foreground">For the year ended {new Date(reportingDate).toLocaleDateString()}</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70%]"></TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderSection(cashFlowData.operating, currency)}
            {renderSection(cashFlowData.investing, currency)}
            {renderSection(cashFlowData.financing, currency)}
            
            <TableRow className="font-bold pt-4">
              <TableCell>Net increase in cash and cash equivalents</TableCell>
              <TableCell className="text-right">{formatCurrency(cashFlowData.netIncrease, currency)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Cash and cash equivalents at beginning of year</TableCell>
              <TableCell className="text-right">{formatCurrency(cashFlowData.cashAtBeginning, currency)}</TableCell>
            </TableRow>
            <TableRow className="font-bold">
              <TableCell>Cash and cash equivalents at end of year</TableCell>
              <TableCell className="text-right">{formatCurrency(cashFlowData.cashAtEnd, currency)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
