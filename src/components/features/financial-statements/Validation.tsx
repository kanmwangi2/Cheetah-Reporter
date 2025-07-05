import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import type { ValidationResult } from '@/types/project';
import {
  validateNegativeCash,
  validateSfpBalance,
  validateDebitCreditRules,
} from '@/lib/validation';
import {
  validateAccountingEquation,
  validateTrialBalanceBalance,
  validateChartOfAccountsStructure,
  validateRequiredIfrsLineItems,
  validateSuspenseAccounts,
  validateLargeAccountMovements,
  validateAccountMappingConsistency,
} from '@/lib/trialBalanceValidator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/components/features/financial-statements/financialStatementUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Validation: React.FC = () => {
  const { currentProject, activePeriodId } = useProjectStore();

  const activePeriod = currentProject?.periods.find((p: { id: string }) => p.id === activePeriodId) || null;
  const mappedTrialBalance = activePeriod?.trialBalance.mappedTrialBalance || null;

  if (!activePeriod) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>No Period Selected</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Please select a reporting period to view validation results.</p>
            </CardContent>
        </Card>
    );
  }

  // Get all other periods for comparison
  const otherPeriods = currentProject?.periods.filter(p => p.id !== activePeriodId) || [];

  // Group validations into two categories
  const trialBalanceIntegrityChecks = [
    validateTrialBalanceBalance(activePeriod),
    validateChartOfAccountsStructure(activePeriod),
    validateLargeAccountMovements(activePeriod, otherPeriods),
    validateSuspenseAccounts(mappedTrialBalance),
    validateDebitCreditRules(mappedTrialBalance),
  ].filter(Boolean) as ValidationResult[];

  const financialStatementConsistencyChecks = [
    validateAccountingEquation(mappedTrialBalance),
    validateSfpBalance(mappedTrialBalance),
    validateNegativeCash(mappedTrialBalance),
    validateRequiredIfrsLineItems(mappedTrialBalance),
    validateAccountMappingConsistency(mappedTrialBalance),
  ].filter(Boolean) as ValidationResult[];


  const renderValidationResult = (result: ValidationResult | null) => {
    if (!result) return null;

    let Icon = result.isValid ? CheckCircle : XCircle;
    let color = result.isValid ? 'text-green-500' : 'text-red-500';

    if (result.message.includes('skipped') || result.message.includes('has no sub-components') || result.message.includes('not found')) {
      Icon = AlertTriangle;
      color = 'text-yellow-500';
    }

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon className={`mr-2 ${color}`} />
            <span className={color}>{result.message}</span>
          </CardTitle>
        </CardHeader>
        {result.details && (
          <CardContent>
            {/* Existing renderer for Debit/Credit rule errors */}
            {result.details.errors && Array.isArray(result.details.errors) && result.details.errors[0]?.expected ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Expected Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.details.errors.map((error: { accountName: string; balance: number; expected: string }, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{error.accountName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(error.balance, currentProject?.currency || 'USD')}</TableCell>
                      <TableCell>{error.expected}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : /* Existing renderer for Suspense Account errors */
            result.details.flaggedAccounts && Array.isArray(result.details.flaggedAccounts) ? (
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Financial Statement Section</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.details.flaggedAccounts.map((acc: { accountName: string; lineLabel: string; balance: number }, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{acc.accountName}</TableCell>
                      <TableCell>{acc.lineLabel}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance, currentProject?.currency || 'USD')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : /* Renderer for Anomalies (Large Movements) */
            result.details.anomalies && Array.isArray(result.details.anomalies) ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.details.anomalies.map((acc: { accountId: string; accountName: string; balance: number }, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{acc.accountId}</TableCell>
                        <TableCell>{acc.accountName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(acc.balance, currentProject?.currency || 'USD')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="grid grid-cols-3 gap-2 text-sm mt-4 border-t pt-2">
                    <div><span className="font-semibold">Mean Balance:</span> {formatCurrency(Number(result.details['Mean Balance']) || 0, currentProject?.currency || 'USD')}</div>
                    <div><span className="font-semibold">Std. Deviation:</span> {formatCurrency(Number(result.details['Std. Deviation']) || 0, currentProject?.currency || 'USD')}</div>
                    <div><span className="font-semibold">Anomaly Threshold:</span> {formatCurrency(Number(result.details['Threshold']) || 0, currentProject?.currency || 'USD')}</div>
                </div>
              </>
            ) : /* Renderer for Orphaned Accounts */
            result.details.orphanedAccounts && Array.isArray(result.details.orphanedAccounts) ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.details.orphanedAccounts.map((acc: { accountId: string; accountName: string; balance: number }, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{acc.accountId}</TableCell>
                      <TableCell>{acc.accountName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance, currentProject?.currency || 'USD')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : /* Renderer for Unmapped Accounts */
            result.details.unmappedAccounts && Array.isArray(result.details.unmappedAccounts) ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.details.unmappedAccounts.map((acc: { accountId: string; accountName: string; balance: number }, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{acc.accountId}</TableCell>
                      <TableCell>{acc.accountName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance, currentProject?.currency || 'USD')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : /* Renderer for Duplicate Codes */
            result.details['Duplicate Codes'] ? (
                <div className="text-sm">
                    <p className="font-semibold">The following account codes appear more than once:</p>
                    <p className="p-2 bg-muted rounded-md mt-2">{String(result.details['Duplicate Codes'] || '')}</p>
                </div>
            ) : /* Renderer for Missing Details */
            result.details.accountsWithMissingDetails && Array.isArray(result.details.accountsWithMissingDetails) ? (
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.details.accountsWithMissingDetails.map((acc: { accountId: string; accountName: string; balance: number }, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{acc.accountId || <span className="text-red-500">Missing</span>}</TableCell>
                      <TableCell>{acc.accountName || <span className="text-red-500">Missing</span>}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance, currentProject?.currency || 'USD')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              /* Generic key-value renderer */
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(result.details).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <div className="font-semibold">{key}</div>
                    <div>{typeof value === 'number' ? formatCurrency(value, currentProject?.currency || 'USD') : String(value)}</div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Trial Balance Integrity</h3>
        {trialBalanceIntegrityChecks.length > 0 ? (
            trialBalanceIntegrityChecks.map((result, index) => (
                <React.Fragment key={`tb-${index}`}>
                    {renderValidationResult(result)}
                </React.Fragment>
            ))
        ) : (
            <p>No trial balance integrity checks to display.</p>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Financial Statement Consistency</h3>
        {financialStatementConsistencyChecks.length > 0 ? (
            financialStatementConsistencyChecks.map((result, index) => (
                <React.Fragment key={`fs-${index}`}>
                    {renderValidationResult(result)}
                </React.Fragment>
            ))
        ) : (
            <p>No financial statement consistency checks to display.</p>
        )}
      </div>
    </div>
  );
};

export default Validation;
