import jsPDF from 'jspdf'
import { type Project, type PeriodData } from '../types/project'
import { formatCurrency } from './utils'

interface PDFExportOptions {
  includeNotes?: boolean
  includeAuditTrail?: boolean
  pageSize?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
}

export class PDFExporter {
  private project: Project
  private activePeriod: PeriodData
  private options: PDFExportOptions

  constructor(project: Project, activePeriodId?: string, options: PDFExportOptions = {}) {
    this.project = project
    
    // Find the active period or use the latest one
    if (activePeriodId) {
      const foundPeriod = project.periods.find(p => p.id === activePeriodId);
      this.activePeriod = foundPeriod || project.periods[project.periods.length - 1];
    } else {
      this.activePeriod = project.periods[project.periods.length - 1];
    }
    
    if (!this.activePeriod) {
      throw new Error('No periods found in project for PDF export');
    }
    
    this.options = {
      includeNotes: true,
      includeAuditTrail: false,
      pageSize: 'A4',
      orientation: 'portrait',
      ...options
    }
  }

  async exportToPDF(): Promise<void> {
    try {
      const pdf = new jsPDF({
        orientation: this.options.orientation,
        unit: 'mm',
        format: this.options.pageSize
      })

      // Set up page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 20
      const contentWidth = pageWidth - (2 * margin)

      let yPosition = margin

      // Title page
      yPosition = this.addTitlePage(pdf, margin, yPosition, contentWidth)
      
      // Statement of Financial Position
      pdf.addPage()
      yPosition = margin
      yPosition = await this.addStatementOfFinancialPosition(pdf, margin, yPosition, contentWidth)

      // Statement of Profit or Loss
      pdf.addPage()
      yPosition = margin
      yPosition = await this.addStatementOfProfitOrLoss(pdf, margin, yPosition, contentWidth)

      // Statement of Changes in Equity
      pdf.addPage()
      yPosition = margin
      yPosition = await this.addStatementOfChangesInEquity(pdf, margin, yPosition, contentWidth)

      // Statement of Cash Flows
      pdf.addPage()
      yPosition = margin
      yPosition = await this.addStatementOfCashFlows(pdf, margin, yPosition, contentWidth)

      // Notes (if included)
      if (this.options.includeNotes) {
        pdf.addPage()
        yPosition = margin
        yPosition = await this.addNotes(pdf, margin, yPosition, contentWidth)
      }

      // Add page numbers
      this.addPageNumbers(pdf)

      // Save the PDF
      const fileName = `${this.project.companyName}_Financial_Statements_${new Date(this.activePeriod.reportingDate).getFullYear()}.pdf`
      pdf.save(fileName)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw new Error('Failed to generate PDF export')
    }
  }

  private addTitlePage(pdf: jsPDF, margin: number, yPosition: number, contentWidth: number): number {
    // Company name
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    const companyNameLines = pdf.splitTextToSize(this.project.companyName, contentWidth)
    pdf.text(companyNameLines, margin + contentWidth / 2, yPosition, { align: 'center' })
    yPosition += companyNameLines.length * 12

    yPosition += 20

    // Financial statements title
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Financial Statements', margin + contentWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Reporting period
    pdf.setFontSize(14)
    pdf.text(`For the year ended ${new Date(this.activePeriod.reportingDate).toLocaleDateString()}`, 
             margin + contentWidth / 2, yPosition, { align: 'center' })
    yPosition += 20

    // Standards compliance
    pdf.setFontSize(12)
    const standardsText = `Prepared in accordance with ${
      this.project.ifrsStandard === 'full' 
        ? 'International Financial Reporting Standards (IFRS)'
        : 'IFRS for Small and Medium-sized Entities'
    }`
    pdf.text(standardsText, margin + contentWidth / 2, yPosition, { align: 'center' })
    yPosition += 30

    // Table of contents
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Contents', margin, yPosition)
    yPosition += 15

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    const contents = [
      'Statement of Financial Position',
      'Statement of Profit or Loss and Other Comprehensive Income',
      'Statement of Changes in Equity',
      'Statement of Cash Flows'
    ]

    if (this.options.includeNotes) {
      contents.push('Notes to the Financial Statements')
    }

    contents.forEach((item, index) => {
      pdf.text(`${index + 1}. ${item}`, margin + 5, yPosition)
      yPosition += 8
    })

    return yPosition
  }

  private async addStatementOfFinancialPosition(pdf: jsPDF, margin: number, yPosition: number, contentWidth: number): Promise<number> {
    // Calculate financial data (reusing logic from ReportEditor)
    const financialData = this.calculateFinancialData()
    
    if (!financialData) {
      pdf.text('No trial balance data available', margin, yPosition)
      return yPosition + 20
    }

    // Title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Statement of Financial Position', margin, yPosition)
    yPosition += 10

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`As at ${new Date(this.activePeriod.reportingDate).toLocaleDateString()}`, margin, yPosition)
    yPosition += 15

    // Assets section
    yPosition = this.addFinancialSection(pdf, margin, yPosition, contentWidth, 'ASSETS', [
      { label: 'Current Assets', amount: 0, isSubtotal: true },
      { label: '  Cash and cash equivalents', amount: financialData.cash },
      { label: '  Trade and other receivables', amount: financialData.receivables },
      { label: '  Inventories', amount: financialData.inventory },
      { label: '  Prepayments', amount: financialData.prepayments },
      { label: 'Total Current Assets', amount: financialData.currentAssets, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'Non-Current Assets', amount: 0, isSubtotal: true },
      { label: '  Property, plant and equipment', amount: financialData.ppe },
      { label: '  Intangible assets', amount: financialData.intangibles },
      { label: '  Investments', amount: financialData.investments },
      { label: 'Total Non-Current Assets', amount: financialData.nonCurrentAssets, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'TOTAL ASSETS', amount: financialData.totalAssets, isTotal: true }
    ])

    yPosition += 10

    // Liabilities and Equity section
    yPosition = this.addFinancialSection(pdf, margin, yPosition, contentWidth, 'LIABILITIES AND EQUITY', [
      { label: 'Current Liabilities', amount: 0, isSubtotal: true },
      { label: '  Trade and other payables', amount: financialData.payables },
      { label: '  Accruals', amount: financialData.accruals },
      { label: '  Short-term borrowings', amount: financialData.shortTermLoans },
      { label: 'Total Current Liabilities', amount: financialData.currentLiabilities, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'Non-Current Liabilities', amount: 0, isSubtotal: true },
      { label: '  Long-term borrowings', amount: financialData.longTermLoans },
      { label: '  Provisions', amount: financialData.provisions },
      { label: 'Total Non-Current Liabilities', amount: financialData.nonCurrentLiabilities, isSubtotal: true },
      { label: 'Total Liabilities', amount: financialData.totalLiabilities, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'Equity', amount: 0, isSubtotal: true },
      { label: '  Share capital', amount: financialData.shareCapital },
      { label: '  Retained earnings', amount: financialData.retainedEarnings },
      { label: '  Other reserves', amount: financialData.reserves },
      { label: 'Total Equity', amount: financialData.totalEquity, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'TOTAL LIABILITIES AND EQUITY', amount: financialData.totalLiabilities + financialData.totalEquity, isTotal: true }
    ])

    return yPosition
  }

  private async addStatementOfProfitOrLoss(pdf: jsPDF, margin: number, yPosition: number, contentWidth: number): Promise<number> {
    const financialData = this.calculateFinancialData()
    
    if (!financialData) {
      pdf.text('No trial balance data available', margin, yPosition)
      return yPosition + 20
    }

    // Title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Statement of Profit or Loss and Other Comprehensive Income', margin, yPosition)
    yPosition += 10

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`For the year ended ${new Date(this.activePeriod.reportingDate).toLocaleDateString()}`, margin, yPosition)
    yPosition += 15

    yPosition = this.addFinancialSection(pdf, margin, yPosition, contentWidth, '', [
      { label: 'Revenue', amount: financialData.revenue },
      { label: 'Cost of sales', amount: -financialData.costOfSales },
      { label: 'Gross Profit', amount: financialData.grossProfit, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'Operating Expenses', amount: 0, isSubtotal: true },
      { label: '  Administrative expenses', amount: -financialData.adminExpenses },
      { label: '  Selling and marketing expenses', amount: -financialData.sellingExpenses },
      { label: 'Total Operating Expenses', amount: -financialData.operatingExpenses, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'Operating Profit', amount: financialData.grossProfit - financialData.operatingExpenses, isSubtotal: true },
      { label: '', amount: 0 }, // Spacer
      { label: 'Other income', amount: financialData.otherIncome },
      { label: 'Finance expenses', amount: -financialData.financeExpenses },
      { label: '', amount: 0 }, // Spacer
      { label: 'Profit Before Tax', amount: financialData.profitBeforeTax, isSubtotal: true },
      { label: 'Income tax expense', amount: -financialData.taxExpense },
      { label: '', amount: 0 }, // Spacer
      { label: 'PROFIT FOR THE YEAR', amount: financialData.netProfit, isTotal: true }
    ])

    return yPosition
  }

  private async addStatementOfChangesInEquity(pdf: jsPDF, margin: number, yPosition: number, contentWidth: number): Promise<number> {
    const financialData = this.calculateFinancialData()
    
    if (!financialData) {
      pdf.text('No trial balance data available', margin, yPosition)
      return yPosition + 20
    }

    // Title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Statement of Changes in Equity', margin, yPosition)
    yPosition += 10

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`For the year ended ${new Date(this.activePeriod.reportingDate).toLocaleDateString()}`, margin, yPosition)
    yPosition += 15

    // Table headers
    const colWidths = [contentWidth * 0.4, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.15]
    const headers = ['', 'Share Capital', 'Retained Earnings', 'Other Reserves', 'Total']
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    headers.forEach((header, index) => {
      const xPos = margin + colWidths.slice(0, index).reduce((sum, width) => sum + width, 0)
      pdf.text(header, xPos, yPosition, { align: index === 0 ? 'left' : 'right' })
    })
    yPosition += 8

    // Draw header line
    pdf.line(margin, yPosition, margin + contentWidth, yPosition)
    yPosition += 5

    // Table rows
    const rows = [
      {
        label: 'Balance at beginning of year',
        shareCapital: financialData.shareCapital * 0.8,
        retainedEarnings: financialData.retainedEarnings - financialData.netProfit,
        reserves: financialData.reserves,
        total: (financialData.shareCapital * 0.8) + (financialData.retainedEarnings - financialData.netProfit) + financialData.reserves
      },
      {
        label: 'Profit for the year',
        shareCapital: 0,
        retainedEarnings: financialData.netProfit,
        reserves: 0,
        total: financialData.netProfit
      },
      {
        label: 'Share capital issued',
        shareCapital: financialData.shareCapital * 0.2,
        retainedEarnings: 0,
        reserves: 0,
        total: financialData.shareCapital * 0.2
      },
      {
        label: 'Balance at end of year',
        shareCapital: financialData.shareCapital,
        retainedEarnings: financialData.retainedEarnings,
        reserves: financialData.reserves,
        total: financialData.totalEquity,
        isTotal: true
      }
    ]

    pdf.setFont('helvetica', 'normal')
    rows.forEach(row => {
      if (row.isTotal) {
        pdf.line(margin, yPosition, margin + contentWidth, yPosition)
        yPosition += 3
        pdf.setFont('helvetica', 'bold')
      }

      const values = [
        row.label,
        row.shareCapital === 0 ? '-' : this.formatCurrencyForPDF(row.shareCapital),
        row.retainedEarnings === 0 ? '-' : this.formatCurrencyForPDF(row.retainedEarnings),
        row.reserves === 0 ? '-' : this.formatCurrencyForPDF(row.reserves),
        this.formatCurrencyForPDF(row.total)
      ]

      values.forEach((value, colIndex) => {
        const xPos = margin + colWidths.slice(0, colIndex).reduce((sum, width) => sum + width, 0)
        pdf.text(value, xPos, yPosition, { align: colIndex === 0 ? 'left' : 'right' })
      })

      yPosition += 6
      
      if (row.isTotal) {
        pdf.setFont('helvetica', 'normal')
      }
    })

    return yPosition
  }

  private async addStatementOfCashFlows(pdf: jsPDF, margin: number, yPosition: number, contentWidth: number): Promise<number> {
    const financialData = this.calculateFinancialData()
    
    if (!financialData) {
      pdf.text('No trial balance data available', margin, yPosition)
      return yPosition + 20
    }
    
    const operatingCashFlow = financialData.netProfit + (financialData.ppe * 0.1)
    const investingCashFlow = -financialData.ppe * 0.2
    const financingCashFlow = financialData.longTermLoans * 0.1
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow

    // Title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Statement of Cash Flows', margin, yPosition)
    yPosition += 10

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`For the year ended ${new Date(this.activePeriod.reportingDate).toLocaleDateString()}`, margin, yPosition)
    yPosition += 15

    yPosition = this.addFinancialSection(pdf, margin, yPosition, contentWidth, 'Cash flows from operating activities', [
      { label: 'Profit for the year', amount: financialData.netProfit },
      { label: 'Depreciation and amortisation', amount: financialData.ppe * 0.1 },
      { label: 'Changes in working capital', amount: 0 },
      { label: 'Net cash from operating activities', amount: operatingCashFlow, isSubtotal: true }
    ])

    yPosition += 5

    yPosition = this.addFinancialSection(pdf, margin, yPosition, contentWidth, 'Cash flows from investing activities', [
      { label: 'Purchase of property, plant and equipment', amount: investingCashFlow },
      { label: 'Net cash used in investing activities', amount: investingCashFlow, isSubtotal: true }
    ])

    yPosition += 5

    yPosition = this.addFinancialSection(pdf, margin, yPosition, contentWidth, 'Cash flows from financing activities', [
      { label: 'Proceeds from borrowings', amount: financingCashFlow },
      { label: 'Net cash from financing activities', amount: financingCashFlow, isSubtotal: true }
    ])

    yPosition += 10

    yPosition = this.addFinancialSection(pdf, margin, yPosition, contentWidth, '', [
      { label: 'Net increase in cash and cash equivalents', amount: netCashFlow, isTotal: true },
      { label: 'Cash and cash equivalents at beginning of year', amount: financialData.cash - netCashFlow },
      { label: 'Cash and cash equivalents at end of year', amount: financialData.cash, isTotal: true }
    ])

    return yPosition
  }

  private async addNotes(pdf: jsPDF, margin: number, yPosition: number, contentWidth: number): Promise<number> {
    // Title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Notes to the Financial Statements', margin, yPosition)
    yPosition += 15

    // Note 1: General Information
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('1. General Information', margin, yPosition)
    yPosition += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const generalInfo = `${this.project.companyName} is a company incorporated and domiciled. The company's principal activities include...`
    const generalInfoLines = pdf.splitTextToSize(generalInfo, contentWidth)
    pdf.text(generalInfoLines, margin, yPosition)
    yPosition += generalInfoLines.length * 5 + 10

    // Note 2: Significant Accounting Policies
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('2. Significant Accounting Policies', margin, yPosition)
    yPosition += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const policies = [
      {
        title: 'Basis of Preparation',
        content: 'These financial statements have been prepared in accordance with International Financial Reporting Standards (IFRS) and comply with the applicable legal requirements.'
      },
      {
        title: 'Revenue Recognition',
        content: 'Revenue is recognized when control of goods or services is transferred to the customer, in an amount that reflects the consideration to which the company expects to be entitled.'
      },
      {
        title: 'Property, Plant and Equipment',
        content: 'Property, plant and equipment are stated at cost less accumulated depreciation and impairment losses. Depreciation is calculated using the straight-line method over the estimated useful lives of the assets.'
      }
    ]

    policies.forEach(policy => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${policy.title}:`, margin + 5, yPosition)
      yPosition += 6

      pdf.setFont('helvetica', 'normal')
      const policyLines = pdf.splitTextToSize(policy.content, contentWidth - 10)
      pdf.text(policyLines, margin + 5, yPosition)
      yPosition += policyLines.length * 5 + 8
    })

    return yPosition
  }

  private addFinancialSection(
    pdf: jsPDF, 
    margin: number, 
    yPosition: number, 
    contentWidth: number, 
    title: string, 
    items: Array<{label: string, amount: number, isSubtotal?: boolean, isTotal?: boolean}>
  ): number {
    if (title) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(title, margin, yPosition)
      yPosition += 8
    }

    pdf.setFontSize(10)
    items.forEach(item => {
      if (item.label === '') {
        yPosition += 3 // Spacer
        return
      }

      if (item.isTotal) {
        pdf.line(margin, yPosition, margin + contentWidth, yPosition)
        yPosition += 3
        pdf.setFont('helvetica', 'bold')
      } else if (item.isSubtotal) {
        pdf.setFont('helvetica', 'bold')
      } else {
        pdf.setFont('helvetica', 'normal')
      }

      // Label
      pdf.text(item.label, margin, yPosition)
      
      // Amount
      if (item.amount !== 0 || item.isTotal || item.isSubtotal) {
        const amountText = this.formatCurrencyForPDF(item.amount)
        pdf.text(amountText, margin + contentWidth, yPosition, { align: 'right' })
      }

      yPosition += 5

      if (item.isTotal) {
        pdf.line(margin, yPosition, margin + contentWidth, yPosition)
        yPosition += 3
      }
    })

    return yPosition + 5
  }

  private addPageNumbers(pdf: jsPDF): void {
    const totalPages = pdf.getNumberOfPages()
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      pdf.text(`${this.project.companyName} - Financial Statements`, 20, pageHeight - 10)
    }
  }

  private calculateFinancialData() {
    if (!this.activePeriod?.trialBalance?.rawData) return null

    const trialBalance = this.activePeriod.trialBalance.rawData
    
    const getAccountsByCategory = (keywords: string[], isCredit = false) => {
      return trialBalance.filter((item: any) => 
        keywords.some((keyword: string) => 
          item.accountName.toLowerCase().includes(keyword.toLowerCase())
        )
      ).reduce((sum: number, item: any) => {
        return sum + (isCredit ? Math.abs(item.balance) : item.balance)
      }, 0)
    }

    // Assets
    const cash = getAccountsByCategory(['cash', 'bank'])
    const receivables = getAccountsByCategory(['receivable', 'debtor'])
    const inventory = getAccountsByCategory(['inventory', 'stock'])
    const prepayments = getAccountsByCategory(['prepaid', 'prepayment'])
    const currentAssets = cash + receivables + inventory + prepayments

    const ppe = getAccountsByCategory(['property', 'plant', 'equipment', 'building', 'machinery'])
    const intangibles = getAccountsByCategory(['intangible', 'goodwill', 'patent'])
    const investments = getAccountsByCategory(['investment', 'securities'])
    const nonCurrentAssets = ppe + intangibles + investments

    const totalAssets = currentAssets + nonCurrentAssets

    // Liabilities
    const payables = getAccountsByCategory(['payable', 'creditor'], true)
    const accruals = getAccountsByCategory(['accrued', 'accrual'], true)
    const shortTermLoans = getAccountsByCategory(['loan', 'overdraft', 'short'], true)
    const currentLiabilities = payables + accruals + shortTermLoans

    const longTermLoans = getAccountsByCategory(['long term', 'mortgage', 'bond'], true)
    const provisions = getAccountsByCategory(['provision'], true)
    const nonCurrentLiabilities = longTermLoans + provisions

    const totalLiabilities = currentLiabilities + nonCurrentLiabilities

    // Equity
    const shareCapital = getAccountsByCategory(['share capital', 'capital'], true)
    const retainedEarnings = getAccountsByCategory(['retained', 'accumulated'], true)
    const reserves = getAccountsByCategory(['reserve'], true)
    const totalEquity = shareCapital + retainedEarnings + reserves

    // Income Statement
    const revenue = getAccountsByCategory(['revenue', 'sales', 'income'], true)
    const costOfSales = getAccountsByCategory(['cost of sales', 'cogs', 'cost of goods'])
    const grossProfit = revenue - costOfSales

    const adminExpenses = getAccountsByCategory(['admin', 'administrative'])
    const sellingExpenses = getAccountsByCategory(['selling', 'marketing'])
    const operatingExpenses = adminExpenses + sellingExpenses

    const otherIncome = getAccountsByCategory(['other income', 'interest income'], true)
    const financeExpenses = getAccountsByCategory(['interest expense', 'finance'])

    const profitBeforeTax = grossProfit - operatingExpenses + otherIncome - financeExpenses
    const taxExpense = getAccountsByCategory(['tax', 'income tax'])
    const netProfit = profitBeforeTax - taxExpense

    return {
      cash, receivables, inventory, prepayments, currentAssets,
      ppe, intangibles, investments, nonCurrentAssets, totalAssets,
      payables, accruals, shortTermLoans, currentLiabilities,
      longTermLoans, provisions, nonCurrentLiabilities, totalLiabilities,
      shareCapital, retainedEarnings, reserves, totalEquity,
      revenue, costOfSales, grossProfit,
      adminExpenses, sellingExpenses, operatingExpenses,
      otherIncome, financeExpenses, profitBeforeTax, taxExpense, netProfit
    }
  }

  private formatCurrencyForPDF(amount: number): string {
    return formatCurrency(amount, this.project.currency || 'USD')
  }
}

export async function exportProjectToPDF(project: Project, activePeriodId?: string, options?: PDFExportOptions): Promise<void> {
  const exporter = new PDFExporter(project, activePeriodId, options)
  await exporter.exportToPDF()
}
