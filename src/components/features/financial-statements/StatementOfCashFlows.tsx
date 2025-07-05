import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Commentable } from '../comments/Commentable';
import { calculateStatementOfCashFlows, validateCashFlowStatement, type CashFlowMethod } from '@/lib/statementOfCashFlowsCalculations';
import { formatCurrency } from './financialStatementUtils';
import type { CashFlowSection, PeriodData } from '@/types/project';
import { Upload } from 'lucide-react';

const renderSection = (section: CashFlowSection, currency: string) => (
  <React.Fragment key={section.id}>
    <TableRow className="font-bold bg-muted/50">
      <TableCell colSpan={2} className="text-lg">{section.label}</TableCell>
    </TableRow>
    {section.items.map(item => (
      <Commentable key={item.id} elementId={`scf-${section.id}-${item.id}`}>
        <TableRow className="hover:bg-muted/30">
          <TableCell className="pl-8">{item.label}</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(item.value, currency)}</TableCell>
        </TableRow>
      </Commentable>
    ))}
    <TableRow className="font-semibold border-t">
      <TableCell className="pl-4">Net cash from {section.id} activities</TableCell>
      <TableCell className="text-right font-mono font-bold">{formatCurrency(section.total, currency)}</TableCell>
    </TableRow>
    <TableRow><TableCell colSpan={2}></TableCell></TableRow>
  </React.Fragment>
);

export const StatementOfCashFlows: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();
  const { setCurrentView } = useUIStore();
  const [method, setMethod] = useState<CashFlowMethod>('indirect');
  const [showValidation, setShowValidation] = useState(false);

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
  
  // Get previous period for enhanced calculations
  const allPeriods = currentProject.periods.sort((a, b) => new Date(a.reportingDate).getTime() - new Date(b.reportingDate).getTime());
  const currentPeriodIndex = allPeriods.findIndex(p => p.id === activePeriodId);
  const previousPeriod = currentPeriodIndex > 0 ? allPeriods[currentPeriodIndex - 1] : null;
  
  const cashFlowData = calculateStatementOfCashFlows(trialBalance || null, {
    method,
    includeNonCashAdjustments: true,
    includeWorkingCapitalDetail: true,
    previousPeriodData: previousPeriod?.trialBalance || null
  });

  if (!cashFlowData) {
    return (
        <div className="p-6 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground mb-4">Could not calculate Statement of Cash Flows.</p>
            <p className="text-sm text-muted-foreground/80 mb-4">Ensure the trial balance is mapped correctly for this period.</p>
            <Button 
              onClick={() => {
                if (currentProject) {
                  setCurrentView('data-import');
                } else {
                  alert('No project selected. Please go to the Dashboard and select a project first.');
                }
              }}
              className="mt-2"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Trial Balance
            </Button>
        </div>
    );
  }

  const validation = validateCashFlowStatement(cashFlowData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Statement of Cash Flows</CardTitle>
            <p className="text-sm text-muted-foreground">For the year ended {new Date(reportingDate).toLocaleDateString()}</p>
            {cashFlowData.method && (
              <p className="text-xs text-muted-foreground capitalize">Using {cashFlowData.method} method</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Method:</label>
              <Select value={method} onValueChange={(value: CashFlowMethod) => setMethod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indirect">Indirect</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowValidation(!showValidation)}
            >
              Validate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showValidation && (!validation.isValid || validation.warnings.length > 0) && (
            <div className="mb-6 space-y-2">
              {validation.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
              {validation.warnings.map((warning, index) => (
                <Alert key={index}>
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70%]"></TableHead>
                <TableHead className="text-right">Amount ({currency})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderSection(cashFlowData.operating, currency)}
              {renderSection(cashFlowData.investing, currency)}
              {renderSection(cashFlowData.financing, currency)}
              
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell className="text-lg">Net increase in cash and cash equivalents</TableCell>
                <TableCell className="text-right text-lg font-mono font-bold">
                  {formatCurrency(cashFlowData.netIncrease, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8">Cash and cash equivalents at beginning of year</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(cashFlowData.cashAtBeginning, currency)}</TableCell>
              </TableRow>
              <TableRow className="font-bold border-t">
                <TableCell className="text-lg">Cash and cash equivalents at end of year</TableCell>
                <TableCell className="text-right text-lg font-mono font-bold">
                  {formatCurrency(cashFlowData.cashAtEnd, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Additional Information Cards */}
      {cashFlowData.operatingActivitiesDetail && method === 'indirect' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Operating Activities Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Net Income</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.operatingActivitiesDetail.netIncome, currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Non-cash Adjustments</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.operatingActivitiesDetail.adjustments, currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Working Capital Changes</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.operatingActivitiesDetail.workingCapitalChanges, currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {cashFlowData.workingCapitalComponents && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Working Capital Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Current Period</TableHead>
                  <TableHead className="text-right">Previous Period</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Accounts Receivable</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.current.accountsReceivable, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.previous.accountsReceivable, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.changes.accountsReceivable, currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Inventory</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.current.inventory, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.previous.inventory, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.changes.inventory, currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Prepaid Expenses</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.current.prepaidExpenses, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.previous.prepaidExpenses, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.changes.prepaidExpenses, currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Accounts Payable</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.current.accountsPayable, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.previous.accountsPayable, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.changes.accountsPayable, currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Accrued Liabilities</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.current.accruedLiabilities, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.previous.accruedLiabilities, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cashFlowData.workingCapitalComponents.changes.accruedLiabilities, currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
