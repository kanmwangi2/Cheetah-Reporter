/**
 * Data Export Service
 * Handles exporting financial data in various formats
 */

import type { Project, PeriodData, TrialBalanceAccount } from '@/types/project';
import * as XLSX from 'xlsx';

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf' | 'json';
  includeMetadata: boolean;
  includeFormulas: boolean;
  dateFormat: 'iso' | 'local' | 'fiscal';
  currencyFormat: 'symbol' | 'code' | 'none';
  stakeholder: 'management' | 'auditor' | 'investor' | 'regulator' | 'custom';
  templateId?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  stakeholder: ExportOptions['stakeholder'];
  defaultOptions: Partial<ExportOptions>;
  customFields: string[];
  formatting: {
    headerStyle?: Record<string, unknown>;
    dataStyle?: Record<string, unknown>;
    summaryStyle?: Record<string, unknown>;
  };
}

export const DEFAULT_EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'management-summary',
    name: 'Management Summary',
    description: 'Executive summary for management review',
    stakeholder: 'management',
    defaultOptions: {
      format: 'excel',
      includeMetadata: true,
      includeFormulas: true,
      dateFormat: 'local',
      currencyFormat: 'symbol'
    },
    customFields: ['variance-analysis', 'key-ratios', 'trends'],
    formatting: {
      headerStyle: { font: { bold: true, size: 12 }, fill: { fgColor: { rgb: '4472C4' } } },
      dataStyle: { font: { size: 10 } },
      summaryStyle: { font: { bold: true, size: 11 }, fill: { fgColor: { rgb: 'E7E6E6' } } }
    }
  },
  {
    id: 'auditor-package',
    name: 'Auditor Package',
    description: 'Comprehensive package for external auditors',
    stakeholder: 'auditor',
    defaultOptions: {
      format: 'excel',
      includeMetadata: true,
      includeFormulas: false,
      dateFormat: 'iso',
      currencyFormat: 'code'
    },
    customFields: ['trial-balance', 'adjustments', 'supporting-schedules', 'audit-trail'],
    formatting: {
      headerStyle: { font: { bold: true, size: 11 }, fill: { fgColor: { rgb: '70AD47' } } },
      dataStyle: { font: { size: 9 } }
    }
  },
  {
    id: 'regulatory-filing',
    name: 'Regulatory Filing',
    description: 'Standardized format for regulatory submissions',
    stakeholder: 'regulator',
    defaultOptions: {
      format: 'excel',
      includeMetadata: false,
      includeFormulas: false,
      dateFormat: 'iso',
      currencyFormat: 'none'
    },
    customFields: ['statutory-format', 'compliance-notes'],
    formatting: {
      headerStyle: { font: { bold: true, size: 10 }, fill: { fgColor: { rgb: 'FFC000' } } },
      dataStyle: { font: { size: 9 } }
    }
  },
  {
    id: 'investor-presentation',
    name: 'Investor Presentation',
    description: 'Clean format for investor communications',
    stakeholder: 'investor',
    defaultOptions: {
      format: 'pdf',
      includeMetadata: false,
      includeFormulas: false,
      dateFormat: 'local',
      currencyFormat: 'symbol'
    },
    customFields: ['highlights', 'charts', 'commentary'],
    formatting: {
      headerStyle: { font: { bold: true, size: 14 } },
      dataStyle: { font: { size: 11 } }
    }
  }
];

/**
 * Export project data to Excel format
 */
export const exportToExcel = async (
  project: Project,
  periods: PeriodData[],
  options: ExportOptions
): Promise<ArrayBuffer> => {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = generateSummarySheet(project, periods, options);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Trial Balance sheets for each period
  periods.forEach((period) => {
    if (period.mappedTrialBalance) {
      const tbData = generateTrialBalanceSheet(period, options);
      const tbSheet = XLSX.utils.aoa_to_sheet(tbData);
      const sheetName = `TB_${period.reportingDate.getFullYear()}_${String(period.reportingDate.getMonth() + 1).padStart(2, '0')}`;
      XLSX.utils.book_append_sheet(workbook, tbSheet, sheetName);
    }
  });

  // Financial Statements sheets
  if (periods.length > 0 && periods[0].mappedTrialBalance) {
    const fsData = generateFinancialStatementsSheet(periods[0], options);
    const fsSheet = XLSX.utils.aoa_to_sheet(fsData);
    XLSX.utils.book_append_sheet(workbook, fsSheet, 'Financial_Statements');
  }

  // Comparative Analysis (if multiple periods)
  if (periods.length > 1) {
    const compData = generateComparativeSheet(periods, options);
    const compSheet = XLSX.utils.aoa_to_sheet(compData);
    XLSX.utils.book_append_sheet(workbook, compSheet, 'Comparative_Analysis');
  }

  // Metadata sheet (if requested)
  if (options.includeMetadata) {
    const metaData = generateMetadataSheet(project, periods, options);
    const metaSheet = XLSX.utils.aoa_to_sheet(metaData);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');
  }

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
};

/**
 * Export project data to CSV format
 */
export const exportToCSV = async (
  project: Project,
  periods: PeriodData[],
  options: ExportOptions
): Promise<string> => {
  const csvData: string[] = [];
  
  // Header
  csvData.push(`"${project.companyName} - Financial Data Export"`);
  csvData.push(`"Generated on: ${new Date().toISOString()}"`);
  csvData.push('');

  // Trial Balance data
  periods.forEach(period => {
    if (period.mappedTrialBalance) {
      csvData.push(`"Period: ${formatDate(period.reportingDate, options.dateFormat)}"`);
      csvData.push('"Account ID","Account Name","Debit","Credit","Statement","Line Item"');
      
      // Flatten all accounts
      const allAccounts: (TrialBalanceAccount & { statement: string; lineItem: string })[] = [];
      
      Object.entries(period.mappedTrialBalance).forEach(([statement, lineItems]) => {
        if (lineItems && typeof lineItems === 'object') {
          Object.entries(lineItems).forEach(([lineItem, accounts]) => {
            if (Array.isArray(accounts)) {
              accounts.forEach((account: TrialBalanceAccount) => {
                allAccounts.push({ ...account, statement, lineItem });
              });
            }
          });
        }
      });

      allAccounts.forEach(account => {
        const debit = formatCurrency(account.debit, project.currency || 'USD', options.currencyFormat);
        const credit = formatCurrency(account.credit, project.currency || 'USD', options.currencyFormat);
        csvData.push(`"${account.accountId}","${account.accountName}","${debit}","${credit}","${account.statement}","${account.lineItem}"`);
      });
      
      csvData.push('');
    }
  });

  return csvData.join('\n');
};

/**
 * Export project data to JSON format
 */
export const exportToJSON = async (
  project: Project,
  periods: PeriodData[],
  options: ExportOptions
): Promise<string> => {
  const exportData = {
    metadata: {
      projectName: project.companyName,
      currency: project.currency,
      exportDate: new Date().toISOString(),
      exportOptions: options,
      periodsIncluded: periods.length
    },
    project: {
      id: project.id,
      companyName: project.companyName,
      ifrsStandard: project.ifrsStandard,
      currency: project.currency,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    periods: periods.map(period => ({
      id: period.id,
      reportingDate: period.reportingDate,
      periodType: period.periodType,
      fiscalYear: period.fiscalYear,
      fiscalPeriod: period.fiscalPeriod,
      status: period.status,
      trialBalance: period.trialBalance,
      mappedTrialBalance: period.mappedTrialBalance
    }))
  };

  return JSON.stringify(exportData, null, 2);
};

// Helper functions
const generateSummarySheet = (project: Project, periods: PeriodData[], options: ExportOptions): (string | number | Date | boolean)[][] => {
  const data: (string | number | Date | boolean)[][] = [];
  
  data.push([`${project.companyName} - Summary`]);
  data.push([]);
  data.push(['Report Period:', periods.length > 0 ? formatDate(periods[0].reportingDate, options.dateFormat) : 'N/A']);
  data.push(['Currency:', project.currency || 'USD']);
  data.push(['Generated:', formatDate(new Date(), options.dateFormat)]);
  data.push([]);
  
  if (periods.length > 1) {
    data.push(['Comparative Periods:']);
    periods.forEach((period, index) => {
      data.push([`Period ${index + 1}:`, formatDate(period.reportingDate, options.dateFormat), period.status]);
    });
    data.push([]);
  }
  
  return data;
};

const generateTrialBalanceSheet = (period: PeriodData, options: ExportOptions): (string | number | Date | boolean)[][] => {
  const data: (string | number | Date | boolean)[][] = [];
  
  data.push([`Trial Balance - ${formatDate(period.reportingDate, options.dateFormat)}`]);
  data.push([]);
  data.push(['Account ID', 'Account Name', 'Debit', 'Credit', 'Statement', 'Line Item']);
  
  if (period.mappedTrialBalance) {
    Object.entries(period.mappedTrialBalance).forEach(([statement, lineItems]) => {
      Object.entries(lineItems).forEach(([lineItem, accounts]) => {
        (accounts as TrialBalanceAccount[]).forEach((account: TrialBalanceAccount) => {
          data.push([
            account.accountId,
            account.accountName,
            account.debit,
            account.credit,
            statement,
            lineItem
          ]);
        });
      });
    });
  }
  
  return data;
};

const generateFinancialStatementsSheet = (period: PeriodData, options: ExportOptions): (string | number | Date | boolean)[][] => {
  const data: (string | number | Date | boolean)[][] = [];
  
  data.push([`Financial Statements - ${formatDate(period.reportingDate, options.dateFormat)}`]);
  data.push([]);
  
  if (period.mappedTrialBalance) {
    // Statement of Financial Position
    data.push(['STATEMENT OF FINANCIAL POSITION']);
    data.push([]);
    data.push(['ASSETS']);
    
    if (period.mappedTrialBalance.assets) {
      Object.entries(period.mappedTrialBalance.assets).forEach(([lineItem, accounts]) => {
        const total = accounts.reduce((sum, acc) => sum + acc.debit - acc.credit, 0);
        data.push([lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), total]);
      });
    }
    
    data.push([]);
    data.push(['LIABILITIES AND EQUITY']);
    
    if (period.mappedTrialBalance.liabilities) {
      Object.entries(period.mappedTrialBalance.liabilities).forEach(([lineItem, accounts]) => {
        const total = accounts.reduce((sum, acc) => sum + acc.credit - acc.debit, 0);
        data.push([lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), total]);
      });
    }
    
    if (period.mappedTrialBalance.equity) {
      Object.entries(period.mappedTrialBalance.equity).forEach(([lineItem, accounts]) => {
        const total = accounts.reduce((sum, acc) => sum + acc.credit - acc.debit, 0);
        data.push([lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), total]);
      });
    }
    
    data.push([]);
    data.push(['STATEMENT OF PROFIT OR LOSS']);
    data.push([]);
    
    if (period.mappedTrialBalance.revenue) {
      Object.entries(period.mappedTrialBalance.revenue).forEach(([lineItem, accounts]) => {
        const total = accounts.reduce((sum, acc) => sum + acc.credit - acc.debit, 0);
        data.push([lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), total]);
      });
    }
    
    if (period.mappedTrialBalance.expenses) {
      Object.entries(period.mappedTrialBalance.expenses).forEach(([lineItem, accounts]) => {
        const total = accounts.reduce((sum, acc) => sum + acc.debit - acc.credit, 0);
        data.push([lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), total]);
      });
    }
  }
  
  return data;
};

const generateComparativeSheet = (periods: PeriodData[], options: ExportOptions): (string | number | Date | boolean)[][] => {
  const data: (string | number | Date | boolean)[][] = [];
  
  data.push(['Comparative Analysis']);
  data.push([]);
  
  // Header row
  const headerRow = ['Line Item'];
  periods.forEach(period => {
    headerRow.push(formatDate(period.reportingDate, options.dateFormat));
    if (periods.length === 2) {
      headerRow.push('Variance', '% Change');
    }
  });
  data.push(headerRow);
  
  // Collect all unique line items
  const allLineItems = new Set<string>();
  periods.forEach(period => {
    if (period.mappedTrialBalance) {
      Object.values(period.mappedTrialBalance).forEach(section => {
        Object.keys(section).forEach(lineItem => allLineItems.add(lineItem));
      });
    }
  });
  
  // Generate comparative data
  Array.from(allLineItems).forEach(lineItem => {
    const row = [lineItem.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())];
    const values: number[] = [];
    
    periods.forEach(period => {
      let value = 0;
      if (period.mappedTrialBalance) {
        Object.values(period.mappedTrialBalance).forEach(section => {
          if (section[lineItem]) {
            value = (section[lineItem] as TrialBalanceAccount[]).reduce((sum: number, acc: TrialBalanceAccount) => {
              // Determine if this should be debit or credit based on statement type
              return sum + Math.abs(acc.debit - acc.credit);
            }, 0);
          }
        });
      }
      values.push(value);
      row.push(value.toString());
    });
    
    // Add variance calculations for two-period comparison
    if (periods.length === 2 && values.length === 2) {
      const variance = values[0] - values[1];
      const percentChange = values[1] !== 0 ? (variance / Math.abs(values[1])) * 100 : 0;
      row.push(variance.toString(), percentChange.toFixed(2));
    }
    
    data.push(row);
  });
  
  return data;
};

const generateMetadataSheet = (project: Project, periods: PeriodData[], options: ExportOptions): (string | number | Date | boolean)[][] => {
  const data: (string | number | Date | boolean)[][] = [];
  
  data.push(['Export Metadata']);
  data.push([]);
  data.push(['Project Information']);
  data.push(['Project ID:', project.id]);
  data.push(['Project Name:', project.companyName]);
  data.push(['IFRS Standard:', project.ifrsStandard]);
  data.push(['Currency:', project.currency]);
  data.push(['Created:', project.createdAt]);
  data.push(['Last Updated:', project.updatedAt]);
  data.push([]);
  
  data.push(['Export Information']);
  data.push(['Export Date:', new Date().toISOString()]);
  data.push(['Export Format:', options.format]);
  data.push(['Stakeholder:', options.stakeholder]);
  data.push(['Include Metadata:', options.includeMetadata]);
  data.push(['Include Formulas:', options.includeFormulas]);
  data.push(['Date Format:', options.dateFormat]);
  data.push(['Currency Format:', options.currencyFormat]);
  data.push([]);
  
  data.push(['Periods Included']);
  data.push(['Period ID', 'Reporting Date', 'Period Type', 'Status', 'Fiscal Year']);
  periods.forEach(period => {
    data.push([
      period.id,
      period.reportingDate,
      period.periodType,
      period.status,
      period.fiscalYear
    ]);
  });
  
  return data;
};

const formatDate = (date: Date, format: ExportOptions['dateFormat']): string => {
  switch (format) {
    case 'iso':
      return date.toISOString().split('T')[0];
    case 'fiscal':
      return `FY${date.getFullYear()}`;
    case 'local':
    default:
      return date.toLocaleDateString();
  }
};

const formatCurrency = (value: number, currency: string, format: ExportOptions['currencyFormat']): string => {
  switch (format) {
    case 'code':
      return `${value.toFixed(2)} ${currency}`;
    case 'symbol':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(value);
    case 'none':
    default:
      return value.toFixed(2);
  }
};

/**
 * Get available export templates
 */
export const getExportTemplates = (): ExportTemplate[] => {
  return DEFAULT_EXPORT_TEMPLATES;
};

/**
 * Get template by stakeholder type
 */
export const getTemplateByStakeholder = (stakeholder: ExportOptions['stakeholder']): ExportTemplate | null => {
  return DEFAULT_EXPORT_TEMPLATES.find(template => template.stakeholder === stakeholder) || null;
};
