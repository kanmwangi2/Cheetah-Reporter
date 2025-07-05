import React, { useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { 
  performVarianceAnalysis, 
  DEFAULT_VARIANCE_THRESHOLDS
} from '@/lib/multiPeriodAnalysis';

const VarianceAnalysis: React.FC = () => {
    const { currentProject } = useProjectStore();
    const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
    const [comparativePeriodId, setComparativePeriodId] = useState<string | null>(null);

    // Get analysis results
    const analysisResults = useMemo(() => {
        if (!currentProject || !currentPeriodId || !comparativePeriodId) {
            return null;
        }

        const currentPeriod = currentProject.periods.find(p => p.id === currentPeriodId);
        const comparativePeriod = currentProject.periods.find(p => p.id === comparativePeriodId);
        
        if (!currentPeriod?.trialBalance.mappedTrialBalance || !comparativePeriod?.trialBalance.mappedTrialBalance) {
            return null;
        }

        // Perform variance analysis
        const varianceResults = performVarianceAnalysis(
            currentPeriod,
            comparativePeriod,
            DEFAULT_VARIANCE_THRESHOLDS
        );

        return {
            variance: varianceResults,
            currentPeriod,
            comparativePeriod
        };
    }, [currentProject, currentPeriodId, comparativePeriodId]);

    const periods = currentProject?.periods || [];
    const currency = currentProject?.currency || 'USD';

    if (!currentProject) {
        return (
            <div className="p-6 text-center bg-muted rounded-lg">
                <p className="text-muted-foreground">No project data available.</p>
            </div>
        );
    }

    const renderVarianceIcon = (variance: number) => {
        if (variance > 0) {
            return <ArrowUpRight className="h-4 w-4 text-green-600" />;
        } else if (variance < 0) {
            return <ArrowDownRight className="h-4 w-4 text-red-600" />;
        }
        return null;
    };

    const renderVarianceTable = () => {
        if (!analysisResults?.variance) return null;

        const variances = analysisResults.variance;

        return (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Line Item</TableHead>
                            <TableHead className="text-right">Current Period</TableHead>
                            <TableHead className="text-right">Previous Period</TableHead>
                            <TableHead className="text-right">Variance</TableHead>
                            <TableHead className="text-right">% Change</TableHead>
                            <TableHead>Materiality</TableHead>
                            <TableHead>Type</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variances.map((variance, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{variance.lineItemLabel}</TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatCurrency(variance.currentValue, currency)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatCurrency(variance.previousValue, currency)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    <div className="flex items-center justify-end gap-1">
                                        {renderVarianceIcon(variance.variance)}
                                        <span className={variance.variance > 0 ? 'text-green-600' : 'text-red-600'}>
                                            {formatCurrency(Math.abs(variance.variance), currency)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    <span className={variance.variancePercentage > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {variance.variancePercentage.toFixed(1)}%
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        variance.materialityLevel === 'highly-material' 
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            : variance.materialityLevel === 'material'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                        {variance.materialityLevel}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        variance.varianceType === 'favorable' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : variance.varianceType === 'unfavorable'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                    }`}>
                                        {variance.varianceType}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Variance Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Current Period</label>
                            <Select value={currentPeriodId || ''} onValueChange={setCurrentPeriodId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select current period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map((period) => (
                                        <SelectItem key={period.id} value={period.id}>
                                            {new Date(period.reportingDate).toLocaleDateString()} ({period.periodType})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Comparative Period</label>
                            <Select value={comparativePeriodId || ''} onValueChange={setComparativePeriodId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select comparative period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map((period) => (
                                        <SelectItem key={period.id} value={period.id} disabled={period.id === currentPeriodId}>
                                            {new Date(period.reportingDate).toLocaleDateString()} ({period.periodType})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {periods.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <Info className="h-8 w-8 mx-auto mb-2" />
                            <p>No periods available for analysis.</p>
                            <p className="text-sm">Please add multiple periods to enable variance analysis.</p>
                        </div>
                    )}

                    {periods.length === 1 && (
                        <div className="text-center text-muted-foreground py-8">
                            <Info className="h-8 w-8 mx-auto mb-2" />
                            <p>Only one period available.</p>
                            <p className="text-sm">Please add another period to enable variance analysis.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {analysisResults && analysisResults.variance.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Variance Details</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Comparing {new Date(analysisResults.currentPeriod.reportingDate).toLocaleDateString()} vs {new Date(analysisResults.comparativePeriod.reportingDate).toLocaleDateString()}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {renderVarianceTable()}
                    </CardContent>
                </Card>
            )}

            {analysisResults && analysisResults.variance.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            <p>No material variances found between the selected periods.</p>
                            <p className="text-sm mt-1">This could indicate stable performance or require deeper analysis.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!analysisResults && currentPeriodId && comparativePeriodId && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            <p>Selected periods do not have sufficient trial balance data for analysis.</p>
                            <p className="text-sm mt-1">Please ensure both periods have mapped trial balance data.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!analysisResults && (!currentPeriodId || !comparativePeriodId) && periods.length > 1 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            <p>Please select both current and comparative periods to perform variance analysis.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default VarianceAnalysis;
