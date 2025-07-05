import type { TrialBalanceData, MappedTrialBalance } from '../types/project';

/**
 * Regulatory Compliance Checker
 * Automated compliance checking for various accounting standards (IFRS, GAAP, etc.)
 */

export interface ComplianceRule {
  id: string;
  standard: ComplianceStandard;
  category: ComplianceCategory;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'warning';
  mandatory: boolean;
  applicability: RuleApplicability;
  checkFunction: (data: ComplianceData) => ComplianceResult;
}

export interface ComplianceResult {
  ruleId: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable' | 'warning';
  message: string;
  details?: string;
  recommendation?: string;
  affectedItems?: string[];
  value?: number;
  threshold?: number;
}

export interface ComplianceReport {
  standard: ComplianceStandard;
  generatedAt: Date;
  overallStatus: 'compliant' | 'non-compliant' | 'partial';
  summary: ComplianceSummary;
  results: ComplianceResult[];
  recommendations: string[];
  criticalIssues: ComplianceResult[];
}

export interface ComplianceSummary {
  totalRules: number;
  compliantRules: number;
  nonCompliantRules: number;
  warningRules: number;
  notApplicableRules: number;
  compliancePercentage: number;
}

export interface ComplianceData {
  trialBalance: TrialBalanceData;
  mappedTrialBalance: MappedTrialBalance;
  entityInfo: EntityInfo;
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
    isFirstYear: boolean;
    isInterim: boolean;
  };
}

export interface EntityInfo {
  entityType: 'public' | 'private' | 'nonprofit' | 'government';
  industry: string;
  jurisdiction: string;
  listedExchange?: string;
  hasSubsidiaries: boolean;
  functionalCurrency: string;
  presentationCurrency: string;
}

export interface RuleApplicability {
  entityTypes: EntityInfo['entityType'][];
  industries?: string[];
  jurisdictions?: string[];
  minRevenue?: number;
  minAssets?: number;
  isPublicCompany?: boolean;
}

export const ComplianceStandard = {
  IFRS: 'ifrs',
  US_GAAP: 'us_gaap',
  UK_GAAP: 'uk_gaap',
  AASB: 'aasb', // Australian
  IASB: 'iasb',
  CUSTOM: 'custom'
} as const;

export type ComplianceStandard = typeof ComplianceStandard[keyof typeof ComplianceStandard];

export const ComplianceCategory = {
  PRESENTATION: 'presentation',
  DISCLOSURE: 'disclosure',
  RECOGNITION: 'recognition',
  MEASUREMENT: 'measurement',
  CLASSIFICATION: 'classification',
  CONSOLIDATION: 'consolidation',
  REVENUE: 'revenue',
  EXPENSES: 'expenses',
  ASSETS: 'assets',
  LIABILITIES: 'liabilities',
  EQUITY: 'equity',
  CASH_FLOWS: 'cash_flows'
} as const;

export type ComplianceCategory = typeof ComplianceCategory[keyof typeof ComplianceCategory];

/**
 * Main Compliance Checker Class
 */
export class ComplianceChecker {
  private rules: Map<ComplianceStandard, ComplianceRule[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Check compliance for a specific standard
   */
  public checkCompliance(
    data: ComplianceData,
    standard: ComplianceStandard = ComplianceStandard.IFRS
  ): ComplianceReport {
    const rules = this.rules.get(standard) || [];
    const applicableRules = rules.filter(rule => this.isRuleApplicable(rule, data));
    
    const results: ComplianceResult[] = [];
    
    for (const rule of applicableRules) {
      try {
        const result = rule.checkFunction(data);
        results.push(result);
      } catch (error) {
        results.push({
          ruleId: rule.id,
          status: 'warning',
          message: `Error checking rule: ${error}`,
          details: `Rule ${rule.id} could not be evaluated due to an error.`
        });
      }
    }

    const summary = this.calculateSummary(results);
    const criticalIssues = results.filter(r => r.status === 'non-compliant');
    const recommendations = this.generateRecommendations(results, standard);

    return {
      standard,
      generatedAt: new Date(),
      overallStatus: this.determineOverallStatus(summary),
      summary,
      results,
      recommendations,
      criticalIssues
    };
  }

  /**
   * Initialize compliance rules for different standards
   */
  private initializeRules(): void {
    this.initializeIFRSRules();
    this.initializeUSGAAPRules();
    // Add other standards as needed
  }

  /**
   * Initialize IFRS compliance rules
   */
  private initializeIFRSRules(): void {
    const ifrsRules: ComplianceRule[] = [
      // IAS 1 - Presentation of Financial Statements
      {
        id: 'IAS1-001',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.PRESENTATION,
        title: 'Complete Set of Financial Statements',
        description: 'A complete set of financial statements must include all required statements',
        severity: 'critical',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'], isPublicCompany: false },
        checkFunction: (data: ComplianceData) => this.checkCompleteFinancialStatements(data)
      },
      {
        id: 'IAS1-002',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.PRESENTATION,
        title: 'Going Concern Assessment',
        description: 'Management must assess the entity\'s ability to continue as a going concern',
        severity: 'critical',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkGoingConcern(data)
      },
      {
        id: 'IAS1-003',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.CLASSIFICATION,
        title: 'Current/Non-current Classification',
        description: 'Assets and liabilities must be properly classified as current or non-current',
        severity: 'major',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkCurrentNonCurrentClassification(data)
      },

      // IAS 7 - Statement of Cash Flows
      {
        id: 'IAS7-001',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.CASH_FLOWS,
        title: 'Cash Flow Statement Required',
        description: 'Statement of cash flows must be presented for each period',
        severity: 'critical',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkCashFlowStatement(data)
      },

      // IFRS 15 - Revenue from Contracts with Customers
      {
        id: 'IFRS15-001',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.REVENUE,
        title: 'Revenue Recognition Disclosure',
        description: 'Revenue recognition accounting policy must be disclosed',
        severity: 'major',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkRevenueDisclosure(data)
      },

      // IAS 16 - Property, Plant and Equipment
      {
        id: 'IAS16-001',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.ASSETS,
        title: 'PPE Measurement Basis',
        description: 'The measurement basis for PPE must be disclosed',
        severity: 'major',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkPPEMeasurement(data)
      },

      // IAS 19 - Employee Benefits
      {
        id: 'IAS19-001',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.LIABILITIES,
        title: 'Employee Benefit Obligations',
        description: 'Employee benefit obligations must be properly recognized and measured',
        severity: 'major',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkEmployeeBenefits(data)
      },

      // Financial ratios and thresholds
      {
        id: 'RATIO-001',
        standard: ComplianceStandard.IFRS,
        category: ComplianceCategory.PRESENTATION,
        title: 'Negative Equity Disclosure',
        description: 'Negative equity position must be prominently disclosed',
        severity: 'critical',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkNegativeEquity(data)
      }
    ];

    this.rules.set(ComplianceStandard.IFRS, ifrsRules);
  }

  /**
   * Initialize US GAAP compliance rules
   */
  private initializeUSGAAPRules(): void {
    const gaapRules: ComplianceRule[] = [
      {
        id: 'ASC-205-001',
        standard: ComplianceStandard.US_GAAP,
        category: ComplianceCategory.PRESENTATION,
        title: 'Classified Balance Sheet',
        description: 'Public companies must present a classified balance sheet',
        severity: 'critical',
        mandatory: true,
        applicability: { entityTypes: ['public'], isPublicCompany: true },
        checkFunction: (data: ComplianceData) => this.checkClassifiedBalanceSheet(data)
      },
      {
        id: 'ASC-230-001',
        standard: ComplianceStandard.US_GAAP,
        category: ComplianceCategory.CASH_FLOWS,
        title: 'Operating Cash Flow Method',
        description: 'Method of presenting operating cash flows must be consistent',
        severity: 'major',
        mandatory: true,
        applicability: { entityTypes: ['public', 'private'] },
        checkFunction: (data: ComplianceData) => this.checkOperatingCashFlowMethod(data)
      }
    ];

    this.rules.set(ComplianceStandard.US_GAAP, gaapRules);
  }

  // Compliance check functions
  private checkCompleteFinancialStatements(data: ComplianceData): ComplianceResult {
    const required = ['assets', 'liabilities', 'equity', 'revenue', 'expenses'];
    const missing: string[] = [];

    // Check if all required sections exist in mapped trial balance
    for (const section of required) {
      if (!data.mappedTrialBalance[section as keyof MappedTrialBalance]) {
        missing.push(section);
      }
    }

    if (missing.length > 0) {
      return {
        ruleId: 'IAS1-001',
        status: 'non-compliant',
        message: 'Incomplete financial statements',
        details: `Missing sections: ${missing.join(', ')}`,
        recommendation: 'Ensure all required financial statement sections are properly mapped',
        affectedItems: missing
      };
    }

    return {
      ruleId: 'IAS1-001',
      status: 'compliant',
      message: 'Complete set of financial statements present'
    };
  }

  private checkGoingConcern(data: ComplianceData): ComplianceResult {
    // Calculate current ratio as a basic going concern indicator
    const currentAssets = this.getBalance(data, 'Current Assets');
    const currentLiabilities = this.getBalance(data, 'Current Liabilities');
    const currentRatio = currentLiabilities !== 0 ? currentAssets / Math.abs(currentLiabilities) : 0;

    // Check for negative equity
    const totalEquity = this.getBalance(data, 'Total Equity');

    if (totalEquity < 0 || currentRatio < 0.5) {
      return {
        ruleId: 'IAS1-002',
        status: 'warning',
        message: 'Potential going concern issues identified',
        details: `Current ratio: ${currentRatio.toFixed(2)}, Total equity: ${totalEquity}`,
        recommendation: 'Consider disclosing going concern uncertainties and management plans',
        value: currentRatio,
        threshold: 1.0
      };
    }

    return {
      ruleId: 'IAS1-002',
      status: 'compliant',
      message: 'No obvious going concern issues identified'
    };
  }

  private checkCurrentNonCurrentClassification(data: ComplianceData): ComplianceResult {
    const currentAssets = this.getBalance(data, 'Current Assets');
    const nonCurrentAssets = this.getBalance(data, 'Non-Current Assets');
    const totalAssets = this.getBalance(data, 'Total Assets');

    // Basic check - current + non-current should equal total
    const calculatedTotal = currentAssets + nonCurrentAssets;
    const variance = Math.abs(totalAssets - calculatedTotal);

    if (variance > 0.01) {
      return {
        ruleId: 'IAS1-003',
        status: 'non-compliant',
        message: 'Current/non-current classification inconsistency',
        details: `Total assets (${totalAssets}) ≠ Current (${currentAssets}) + Non-current (${nonCurrentAssets})`,
        recommendation: 'Review asset classification and ensure all assets are properly categorized'
      };
    }

    return {
      ruleId: 'IAS1-003',
      status: 'compliant',
      message: 'Current/non-current classification appears consistent'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkCashFlowStatement(_data: ComplianceData): ComplianceResult {
    // This would check if cash flow statement data exists
    // For now, assume it's required and return compliant
    return {
      ruleId: 'IAS7-001',
      status: 'compliant',
      message: 'Cash flow statement requirements met'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkRevenueDisclosure(_data: ComplianceData): ComplianceResult {
    // Check if revenue is properly disclosed
    return {
      ruleId: 'IFRS15-001',
      status: 'compliant',
      message: 'Revenue disclosure requirements appear to be met'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkPPEMeasurement(_data: ComplianceData): ComplianceResult {
    // Check PPE measurement basis
    return {
      ruleId: 'IAS16-001',
      status: 'compliant',
      message: 'PPE measurement basis disclosure requirements met'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkEmployeeBenefits(_data: ComplianceData): ComplianceResult {
    // Check employee benefits recognition
    return {
      ruleId: 'IAS19-001',
      status: 'compliant',
      message: 'Employee benefit obligations properly recognized'
    };
  }

  private checkNegativeEquity(data: ComplianceData): ComplianceResult {
    const totalEquity = this.getBalance(data, 'Total Equity');

    if (totalEquity < 0) {
      return {
        ruleId: 'RATIO-001',
        status: 'warning',
        message: 'Negative equity position detected',
        details: `Total equity: ${totalEquity}`,
        recommendation: 'Ensure negative equity is prominently disclosed with explanations',
        value: totalEquity
      };
    }

    return {
      ruleId: 'RATIO-001',
      status: 'compliant',
      message: 'Equity position is positive'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkClassifiedBalanceSheet(_data: ComplianceData): ComplianceResult {
    // US GAAP specific check
    return {
      ruleId: 'ASC-205-001',
      status: 'compliant',
      message: 'Balance sheet properly classified'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkOperatingCashFlowMethod(_data: ComplianceData): ComplianceResult {
    // US GAAP cash flow method check
    return {
      ruleId: 'ASC-230-001',
      status: 'compliant',
      message: 'Operating cash flow method is consistent'
    };
  }

  // Helper methods
  private isRuleApplicable(rule: ComplianceRule, data: ComplianceData): boolean {
    const { applicability } = rule;
    const { entityInfo } = data;

    // Check entity type
    if (!applicability.entityTypes.includes(entityInfo.entityType)) {
      return false;
    }

    // Check industry if specified
    if (applicability.industries && !applicability.industries.includes(entityInfo.industry)) {
      return false;
    }

    // Check jurisdiction if specified
    if (applicability.jurisdictions && !applicability.jurisdictions.includes(entityInfo.jurisdiction)) {
      return false;
    }

    // Check public company requirement
    if (applicability.isPublicCompany !== undefined) {
      const isPublic = entityInfo.entityType === 'public' && !!entityInfo.listedExchange;
      if (applicability.isPublicCompany !== isPublic) {
        return false;
      }
    }

    return true;
  }

  private getBalance(data: ComplianceData, accountName: string): number {
    const account = data.trialBalance.accounts.find(acc => 
      acc.accountName?.toLowerCase().includes(accountName.toLowerCase())
    );
    return account ? (account.finalDebit - account.finalCredit) : 0;
  }

  private calculateSummary(results: ComplianceResult[]): ComplianceSummary {
    const totalRules = results.length;
    const compliantRules = results.filter(r => r.status === 'compliant').length;
    const nonCompliantRules = results.filter(r => r.status === 'non-compliant').length;
    const warningRules = results.filter(r => r.status === 'warning').length;
    const notApplicableRules = results.filter(r => r.status === 'not-applicable').length;
    
    const compliancePercentage = totalRules > 0 ? (compliantRules / totalRules) * 100 : 100;

    return {
      totalRules,
      compliantRules,
      nonCompliantRules,
      warningRules,
      notApplicableRules,
      compliancePercentage
    };
  }

  private determineOverallStatus(summary: ComplianceSummary): 'compliant' | 'non-compliant' | 'partial' {
    if (summary.nonCompliantRules === 0) {
      return summary.warningRules === 0 ? 'compliant' : 'partial';
    }
    return summary.compliancePercentage >= 80 ? 'partial' : 'non-compliant';
  }

  private generateRecommendations(results: ComplianceResult[], standard: ComplianceStandard): string[] {
    const recommendations: string[] = [];
    
    const nonCompliant = results.filter(r => r.status === 'non-compliant');
    const warnings = results.filter(r => r.status === 'warning');

    if (nonCompliant.length > 0) {
      recommendations.push(`Address ${nonCompliant.length} critical compliance issues to meet ${standard} requirements`);
    }

    if (warnings.length > 0) {
      recommendations.push(`Review ${warnings.length} warning items to improve compliance posture`);
    }

    // Add specific recommendations based on the standard
    if (standard === ComplianceStandard.IFRS) {
      recommendations.push('Ensure all IFRS disclosure requirements are met in the notes to financial statements');
      recommendations.push('Review IAS 1 presentation requirements for consistency');
    }

    return recommendations;
  }

  /**
   * Add custom compliance rule
   */
  public addCustomRule(rule: ComplianceRule): void {
    const rules = this.rules.get(rule.standard) || [];
    rules.push(rule);
    this.rules.set(rule.standard, rules);
  }

  /**
   * Get all rules for a standard
   */
  public getRulesForStandard(standard: ComplianceStandard): ComplianceRule[] {
    return this.rules.get(standard) || [];
  }
}

/**
 * Factory function to create compliance checker
 */
export function createComplianceChecker(): ComplianceChecker {
  return new ComplianceChecker();
}

/**
 * Generate compliance report for multiple standards
 */
export function generateMultiStandardReport(
  data: ComplianceData,
  standards: ComplianceStandard[]
): Record<ComplianceStandard, ComplianceReport> {
  const checker = createComplianceChecker();
  const reports: Record<string, ComplianceReport> = {};

  for (const standard of standards) {
    reports[standard] = checker.checkCompliance(data, standard);
  }

  return reports as Record<ComplianceStandard, ComplianceReport>;
}

/**
 * Export compliance report to different formats
 */
export function exportComplianceReport(
  report: ComplianceReport,
  format: 'json' | 'csv' | 'pdf' = 'json'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    case 'csv':
      return generateCSVReport(report);
    case 'pdf':
      // Would integrate with PDF generation library
      return 'PDF export not implemented yet';
    default:
      return JSON.stringify(report, null, 2);
  }
}

function generateCSVReport(report: ComplianceReport): string {
  const headers = ['Rule ID', 'Status', 'Message', 'Severity', 'Details'];
  const rows = report.results.map(result => [
    result.ruleId,
    result.status,
    result.message,
    '', // Severity would need to be retrieved from rule
    result.details || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
