/**
 * Disclosure Engine
 * Generates context-aware disclosure templates based on company data
 */

import type { Project, PeriodData, TrialBalanceAccount, DisclosureItem } from '@/types/project';

// Re-export DisclosureItem for convenience
export type { DisclosureItem } from '@/types/project';

export interface DisclosureRule {
  id: string;
  name: string;
  description: string;
  category: 'mandatory' | 'conditional' | 'optional';
  ifrsStandard: 'full' | 'sme' | 'both';
  triggers: DisclosureTrigger[];
  template: DisclosureTemplate;
  priority: number;
}

export interface DisclosureTrigger {
  type: 'account_balance' | 'ratio' | 'industry' | 'transaction_type' | 'custom';
  condition: string; // e.g., "ppe > 1000000", "debt_ratio > 0.5"
  threshold?: number;
  accounts?: string[]; // Account IDs or patterns
  description: string;
}

export interface DisclosureTemplate {
  id: string;
  title: string;
  sections: DisclosureSection[];
  variables: DisclosureVariable[];
  formatting: {
    numbered: boolean;
    bulleted: boolean;
    tabular: boolean;
  };
}

export interface DisclosureSection {
  id: string;
  title: string;
  content: string; // Template with variables like {{variable_name}}
  conditional?: boolean;
  condition?: string;
  subsections?: DisclosureSection[];
}

export interface DisclosureVariable {
  name: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'percentage' | 'calculated';
  source: 'account' | 'calculation' | 'user_input' | 'metadata';
  calculation?: string;
  format?: string;
  defaultValue?: string | number;
  required: boolean;
}

export interface GeneratedDisclosure {
  id: string;
  ruleId: string;
  title: string;
  content: string;
  status: 'draft' | 'reviewed' | 'approved';
  generatedAt: Date;
  variables: Record<string, string | number | boolean>;
  metadata: {
    automaticallyGenerated: boolean;
    triggers: string[];
    lastModified: Date;
    modifiedBy?: string;
  };
}

export interface DisclosureContext {
  project: Project;
  period: PeriodData;
  accounts: TrialBalanceAccount[];
  financialRatios: Record<string, number>;
  industryType?: string;
  customVariables?: Record<string, string | number | boolean>;
}

/**
 * Predefined IFRS disclosure rules
 */
export const IFRS_DISCLOSURE_RULES: DisclosureRule[] = [
  {
    id: 'accounting-policies',
    name: 'Accounting Policies',
    description: 'Statement of compliance and basis of preparation',
    category: 'mandatory',
    ifrsStandard: 'both',
    priority: 1,
    triggers: [
      {
        type: 'custom',
        condition: 'always',
        description: 'Required for all financial statements'
      }
    ],
    template: {
      id: 'accounting-policies-template',
      title: 'Accounting Policies',
      formatting: { numbered: true, bulleted: false, tabular: false },
      variables: [
        { name: 'ifrs_standard', type: 'text', source: 'metadata', required: true },
        { name: 'functional_currency', type: 'text', source: 'metadata', required: true },
        { name: 'reporting_period', type: 'date', source: 'metadata', required: true }
      ],
      sections: [
        {
          id: 'compliance',
          title: 'Statement of Compliance',
          content: 'These financial statements have been prepared in accordance with {{ifrs_standard}} and comply with {{functional_currency}} as the functional currency.'
        },
        {
          id: 'basis-of-preparation',
          title: 'Basis of Preparation',
          content: 'The financial statements have been prepared on the historical cost basis except for certain financial instruments that are measured at fair value.'
        },
        {
          id: 'functional-currency',
          title: 'Functional and Presentation Currency',
          content: 'The functional and presentation currency is {{functional_currency}}. All amounts are presented in {{functional_currency}} unless otherwise stated.'
        }
      ]
    }
  },
  {
    id: 'property-plant-equipment',
    name: 'Property, Plant and Equipment',
    description: 'PPE disclosure when significant balances exist',
    category: 'conditional',
    ifrsStandard: 'both',
    priority: 2,
    triggers: [
      {
        type: 'account_balance',
        condition: 'ppe > 100000',
        threshold: 100000,
        accounts: ['ppe', 'property', 'plant', 'equipment'],
        description: 'When PPE exceeds material threshold'
      }
    ],
    template: {
      id: 'ppe-template',
      title: 'Property, Plant and Equipment',
      formatting: { numbered: true, bulleted: false, tabular: true },
      variables: [
        { name: 'ppe_cost', type: 'currency', source: 'calculation', calculation: 'sum(ppe_accounts.cost)', required: true },
        { name: 'ppe_depreciation', type: 'currency', source: 'calculation', calculation: 'sum(ppe_accounts.accumulated_depreciation)', required: true },
        { name: 'ppe_net', type: 'currency', source: 'calculation', calculation: 'ppe_cost - ppe_depreciation', required: true },
        { name: 'depreciation_method', type: 'text', source: 'user_input', defaultValue: 'Straight-line method', required: true },
        { name: 'useful_lives', type: 'text', source: 'user_input', defaultValue: 'Buildings: 25-50 years, Equipment: 3-15 years', required: true }
      ],
      sections: [
        {
          id: 'recognition',
          title: 'Recognition and Measurement',
          content: 'Property, plant and equipment are stated at cost less accumulated depreciation and any accumulated impairment losses. Cost includes expenditure directly attributable to the acquisition of the asset.'
        },
        {
          id: 'depreciation',
          title: 'Depreciation',
          content: 'Depreciation is calculated using the {{depreciation_method}} over the estimated useful lives: {{useful_lives}}.'
        },
        {
          id: 'carrying-amounts',
          title: 'Carrying Amounts',
          content: 'The carrying amount of property, plant and equipment is {{ppe_net}}, comprising cost of {{ppe_cost}} less accumulated depreciation of {{ppe_depreciation}}.'
        }
      ]
    }
  },
  {
    id: 'financial-instruments',
    name: 'Financial Instruments',
    description: 'Financial instruments disclosure for material balances',
    category: 'conditional',
    ifrsStandard: 'both',
    priority: 3,
    triggers: [
      {
        type: 'account_balance',
        condition: 'financial_assets + financial_liabilities > 50000',
        threshold: 50000,
        accounts: ['investments', 'loans', 'receivables', 'payables', 'debt'],
        description: 'When financial instruments are material'
      }
    ],
    template: {
      id: 'financial-instruments-template',
      title: 'Financial Instruments',
      formatting: { numbered: true, bulleted: false, tabular: true },
      variables: [
        { name: 'financial_assets', type: 'currency', source: 'calculation', required: true },
        { name: 'financial_liabilities', type: 'currency', source: 'calculation', required: true },
        { name: 'credit_risk_policy', type: 'text', source: 'user_input', required: false }
      ],
      sections: [
        {
          id: 'classification',
          title: 'Classification and Measurement',
          content: 'Financial instruments are classified and measured in accordance with IFRS 9. Financial assets total {{financial_assets}} and financial liabilities total {{financial_liabilities}}.'
        },
        {
          id: 'credit-risk',
          title: 'Credit Risk',
          content: 'The entity manages credit risk through {{credit_risk_policy}}. Maximum exposure to credit risk equals the carrying amount of financial assets.',
          conditional: true,
          condition: 'credit_risk_policy != null'
        }
      ]
    }
  },
  {
    id: 'revenue-recognition',
    name: 'Revenue Recognition',
    description: 'Revenue recognition policies and significant judgments',
    category: 'mandatory',
    ifrsStandard: 'both',
    priority: 2,
    triggers: [
      {
        type: 'account_balance',
        condition: 'revenue > 0',
        accounts: ['revenue', 'sales', 'income'],
        description: 'When entity has revenue'
      }
    ],
    template: {
      id: 'revenue-template',
      title: 'Revenue Recognition',
      formatting: { numbered: true, bulleted: false, tabular: false },
      variables: [
        { name: 'total_revenue', type: 'currency', source: 'calculation', calculation: 'sum(revenue_accounts)', required: true },
        { name: 'revenue_types', type: 'text', source: 'user_input', required: true },
        { name: 'performance_obligations', type: 'text', source: 'user_input', required: true }
      ],
      sections: [
        {
          id: 'policy',
          title: 'Revenue Recognition Policy',
          content: 'Revenue is recognized when control of goods or services is transferred to customers. The entity recognizes revenue from {{revenue_types}}.'
        },
        {
          id: 'performance-obligations',
          title: 'Performance Obligations',
          content: 'The entity has identified the following performance obligations: {{performance_obligations}}.'
        },
        {
          id: 'revenue-amount',
          title: 'Revenue Amount',
          content: 'Total revenue for the period is {{total_revenue}}.'
        }
      ]
    }
  },
  {
    id: 'going-concern',
    name: 'Going Concern',
    description: 'Going concern assessment and disclosures',
    category: 'conditional',
    ifrsStandard: 'both',
    priority: 1,
    triggers: [
      {
        type: 'ratio',
        condition: 'current_ratio < 1.0 OR debt_ratio > 0.8 OR net_profit < 0',
        description: 'When there are indicators of going concern issues'
      }
    ],
    template: {
      id: 'going-concern-template',
      title: 'Going Concern',
      formatting: { numbered: false, bulleted: false, tabular: false },
      variables: [
        { name: 'assessment_period', type: 'text', source: 'user_input', defaultValue: '12 months', required: true },
        { name: 'key_factors', type: 'text', source: 'user_input', required: true },
        { name: 'mitigating_actions', type: 'text', source: 'user_input', required: false }
      ],
      sections: [
        {
          id: 'assessment',
          title: 'Going Concern Assessment',
          content: 'The directors have assessed the entity\'s ability to continue as a going concern for a period of {{assessment_period}} from the date of approval of these financial statements. Key factors considered include: {{key_factors}}.'
        },
        {
          id: 'conclusion',
          title: 'Conclusion',
          content: 'Based on this assessment, the directors believe the entity will continue as a going concern.',
          conditional: true,
          condition: 'mitigating_actions == null'
        },
        {
          id: 'mitigating-actions',
          title: 'Mitigating Actions',
          content: 'The following mitigating actions have been or will be taken: {{mitigating_actions}}.',
          conditional: true,
          condition: 'mitigating_actions != null'
        }
      ]
    }
  }
];

/**
 * Industry-specific disclosure rules
 */
export const INDUSTRY_DISCLOSURE_RULES: Record<string, DisclosureRule[]> = {
  manufacturing: [
    {
      id: 'inventory-manufacturing',
      name: 'Inventory - Manufacturing',
      description: 'Manufacturing inventory disclosures',
      category: 'conditional',
      ifrsStandard: 'both',
      priority: 3,
      triggers: [
        {
          type: 'account_balance',
          condition: 'inventory > 50000',
          accounts: ['inventory', 'raw-materials', 'work-in-progress', 'finished-goods'],
          description: 'When inventory is material for manufacturing entity'
        }
      ],
      template: {
        id: 'manufacturing-inventory-template',
        title: 'Inventory',
        formatting: { numbered: true, bulleted: false, tabular: true },
        variables: [
          { name: 'raw_materials', type: 'currency', source: 'account', required: true },
          { name: 'work_in_progress', type: 'currency', source: 'account', required: true },
          { name: 'finished_goods', type: 'currency', source: 'account', required: true },
          { name: 'total_inventory', type: 'currency', source: 'calculation', calculation: 'raw_materials + work_in_progress + finished_goods', required: true }
        ],
        sections: [
          {
            id: 'composition',
            title: 'Inventory Composition',
            content: 'Inventory comprises: Raw materials {{raw_materials}}, Work in progress {{work_in_progress}}, Finished goods {{finished_goods}}, Total {{total_inventory}}.'
          },
          {
            id: 'valuation',
            title: 'Valuation Method',
            content: 'Inventories are valued at the lower of cost and net realizable value. Cost is determined using the weighted average method for raw materials and first-in-first-out (FIFO) method for finished goods.'
          }
        ]
      }
    }
  ],
  retail: [
    {
      id: 'inventory-retail',
      name: 'Inventory - Retail',
      description: 'Retail inventory disclosures',
      category: 'conditional',
      ifrsStandard: 'both',
      priority: 3,
      triggers: [
        {
          type: 'account_balance',
          condition: 'inventory > 25000',
          accounts: ['inventory', 'merchandise'],
          description: 'When inventory is material for retail entity'
        }
      ],
      template: {
        id: 'retail-inventory-template',
        title: 'Inventory',
        formatting: { numbered: true, bulleted: false, tabular: false },
        variables: [
          { name: 'inventory_value', type: 'currency', source: 'account', required: true },
          { name: 'inventory_turnover', type: 'number', source: 'calculation', calculation: 'cost_of_sales / average_inventory', required: false }
        ],
        sections: [
          {
            id: 'valuation',
            title: 'Inventory Valuation',
            content: 'Inventory is stated at the lower of cost and net realizable value. Cost is determined on a first-in-first-out (FIFO) basis. Total inventory is {{inventory_value}}.'
          }
        ]
      }
    }
  ],
  technology: [
    {
      id: 'intangible-assets-tech',
      name: 'Intangible Assets - Technology',
      description: 'Technology company intangible assets',
      category: 'conditional',
      ifrsStandard: 'both',
      priority: 2,
      triggers: [
        {
          type: 'account_balance',
          condition: 'intangible_assets > 25000',
          accounts: ['intangible', 'software', 'development-costs', 'patents'],
          description: 'When intangible assets are material for technology entity'
        }
      ],
      template: {
        id: 'tech-intangibles-template',
        title: 'Intangible Assets',
        formatting: { numbered: true, bulleted: false, tabular: true },
        variables: [
          { name: 'development_costs', type: 'currency', source: 'account', required: true },
          { name: 'software_licenses', type: 'currency', source: 'account', required: true },
          { name: 'patents_trademarks', type: 'currency', source: 'account', required: true }
        ],
        sections: [
          {
            id: 'recognition',
            title: 'Recognition and Measurement',
            content: 'Development costs are capitalized when technical feasibility is established and future economic benefits are probable. Software licenses and patents are recorded at cost and amortized over their useful lives.'
          },
          {
            id: 'carrying-amounts',
            title: 'Carrying Amounts',
            content: 'Intangible assets comprise: Development costs {{development_costs}}, Software licenses {{software_licenses}}, Patents and trademarks {{patents_trademarks}}.'
          }
        ]
      }
    }
  ]
};

/**
 * Main disclosure engine class
 */
export class DisclosureEngine {
  private rules: DisclosureRule[];
  private industryRules: Record<string, DisclosureRule[]>;

  constructor() {
    this.rules = [...IFRS_DISCLOSURE_RULES];
    this.industryRules = { ...INDUSTRY_DISCLOSURE_RULES };
  }

  /**
   * Generate all applicable disclosures for a given context
   */
  generateDisclosures(context: DisclosureContext): DisclosureItem[] {
    const applicableRules = this.findApplicableRules(context);
    const disclosures: DisclosureItem[] = [];

    for (const rule of applicableRules) {
      try {
        const disclosure = this.generateDisclosureItem(rule, context);
        if (disclosure) {
          disclosures.push(disclosure);
        }
      } catch (error) {
        console.error(`Error generating disclosure for rule ${rule.id}:`, error);
      }
    }

    return disclosures.sort((a, b) => {
      const ruleA = this.rules.find(r => r.id === a.metadata.ruleId);
      const ruleB = this.rules.find(r => r.id === b.metadata.ruleId);
      return (ruleA?.priority || 999) - (ruleB?.priority || 999);
    });
  }

  /**
   * Find all rules that apply to the given context
   */
  private findApplicableRules(context: DisclosureContext): DisclosureRule[] {
    const applicableRules: DisclosureRule[] = [];
    
    // Check standard IFRS rules
    for (const rule of this.rules) {
      if (this.isRuleApplicable(rule, context)) {
        applicableRules.push(rule);
      }
    }

    // Check industry-specific rules
    if (context.industryType && this.industryRules[context.industryType]) {
      for (const rule of this.industryRules[context.industryType]) {
        if (this.isRuleApplicable(rule, context)) {
          applicableRules.push(rule);
        }
      }
    }

    return applicableRules;
  }

  /**
   * Check if a specific rule applies to the context
   */
  private isRuleApplicable(rule: DisclosureRule, context: DisclosureContext): boolean {
    // Check IFRS standard compatibility
    if (rule.ifrsStandard !== 'both' && rule.ifrsStandard !== context.project.ifrsStandard) {
      return false;
    }

    // Check triggers
    return rule.triggers.some(trigger => this.evaluateTrigger(trigger, context));
  }

  /**
   * Evaluate if a trigger condition is met
   */
  private evaluateTrigger(trigger: DisclosureTrigger, context: DisclosureContext): boolean {
    switch (trigger.type) {
      case 'account_balance':
        return this.evaluateAccountBalanceTrigger(trigger, context);
      case 'ratio':
        return this.evaluateRatioTrigger(trigger, context);
      case 'industry':
        return context.industryType === trigger.condition;
      case 'custom':
        return trigger.condition === 'always' || this.evaluateCustomCondition(trigger.condition, context);
      default:
        return false;
    }
  }

  /**
   * Evaluate account balance trigger
   */
  private evaluateAccountBalanceTrigger(trigger: DisclosureTrigger, context: DisclosureContext): boolean {
    if (!trigger.accounts || !context.accounts) return false;

    const relevantAccounts = context.accounts.filter(account => 
      trigger.accounts!.some(pattern => 
        account.accountName.toLowerCase().includes(pattern.toLowerCase()) ||
        account.accountId.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const totalBalance = relevantAccounts.reduce((sum, account) => 
      sum + Math.abs(account.debit - account.credit), 0);

    return totalBalance > (trigger.threshold || 0);
  }

  /**
   * Evaluate ratio trigger
   */
  private evaluateRatioTrigger(trigger: DisclosureTrigger, context: DisclosureContext): boolean {
    // Simple ratio evaluation - would need more sophisticated parsing in production
    const condition = trigger.condition.toLowerCase();
    
    if (condition.includes('current_ratio < 1.0')) {
      const currentRatio = context.financialRatios?.current_ratio || 0;
      return currentRatio < 1.0;
    }
    
    if (condition.includes('debt_ratio > 0.8')) {
      const debtRatio = context.financialRatios?.debt_ratio || 0;
      return debtRatio > 0.8;
    }
    
    if (condition.includes('net_profit < 0')) {
      const netProfit = context.financialRatios?.net_profit || 0;
      return netProfit < 0;
    }

    return false;
  }

  /**
   * Evaluate custom condition
   */
  private evaluateCustomCondition(condition: string, context: DisclosureContext): boolean {
    // Simple custom condition evaluation - would need expression parser in production
    // In a real implementation, this would parse and evaluate complex conditions
    // For now, we check for some basic conditions
    if (condition === 'always') return true;
    if (condition === 'never') return false;
    
    // Check for simple conditions based on context
    if (condition.includes('total_assets') && context.accounts) {
      return context.accounts.some(account => (account.debit || 0) + (account.credit || 0) > 0);
    }
    
    return condition === 'always';
  }

  /**
   * Generate a single disclosure item from a rule and context
   */
  private generateDisclosureItem(rule: DisclosureRule, context: DisclosureContext): DisclosureItem | null {
    try {
      const variables = this.calculateVariables(rule.template.variables, context);
      const content = this.generateContent(rule.template, variables);
      
      return {
        id: `${rule.id}-${Date.now()}`,
        title: rule.template.title,
        content,
        type: 'generated',
        category: rule.category,
        isRequired: rule.category === 'mandatory',
        priority: rule.priority === 1 ? 'high' : rule.priority <= 3 ? 'medium' : 'low',
        status: 'draft',
        metadata: {
          lastModified: new Date(),
          createdBy: 'system',
          version: '1.0',
          ruleId: rule.id,
          triggers: rule.triggers.map(t => t.description),
        }
      };
    } catch (error) {
      console.error(`Error generating disclosure for rule ${rule.id}:`, error);
      return null;
    }
  }

  /**
   * Calculate variable values from context
   */
  private calculateVariables(variables: DisclosureVariable[], context: DisclosureContext): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};

    for (const variable of variables) {
      try {
        result[variable.name] = this.calculateVariable(variable, context);
      } catch (error) {
        console.error(`Error calculating variable ${variable.name}:`, error);
        result[variable.name] = variable.defaultValue || '';
      }
    }

    return result;
  }

  /**
   * Calculate a single variable value
   */
  private calculateVariable(variable: DisclosureVariable, context: DisclosureContext): string | number | boolean {
    switch (variable.source) {
      case 'metadata':
        return this.getMetadataValue(variable.name, context);
      case 'account':
        return this.getAccountValue(variable.name, context);
      case 'calculation':
        return this.performCalculation(variable.calculation || '', context);
      case 'user_input':
        return variable.defaultValue || '';
      default:
        return variable.defaultValue || '';
    }
  }

  /**
   * Get metadata value
   */
  private getMetadataValue(variableName: string, context: DisclosureContext): string {
    switch (variableName) {
      case 'ifrs_standard':
        return context.project.ifrsStandard === 'full' ? 'IFRS' : 'IFRS for SMEs';
      case 'functional_currency':
        return context.project.currency || 'USD';
      case 'reporting_period':
        return context.period.reportingDate.toLocaleDateString();
      default:
        return '';
    }
  }

  /**
   * Get account value
   */
  private getAccountValue(variableName: string, context: DisclosureContext): number {
    const relevantAccounts = context.accounts.filter(account => 
      account.accountName.toLowerCase().includes(variableName.toLowerCase()) ||
      account.accountId.toLowerCase().includes(variableName.toLowerCase())
    );

    return relevantAccounts.reduce((sum, account) => 
      sum + Math.abs(account.debit - account.credit), 0);
  }

  /**
   * Perform calculation
   */
  private performCalculation(calculation: string, context: DisclosureContext): number {
    // Simple calculation implementation - would need expression parser in production
    if (calculation.includes('sum(revenue_accounts)')) {
      return context.accounts
        .filter(account => account.accountName.toLowerCase().includes('revenue') || 
                          account.accountName.toLowerCase().includes('sales') ||
                          account.accountName.toLowerCase().includes('income'))
        .reduce((sum, account) => sum + Math.abs(account.credit - account.debit), 0);
    }

    if (calculation.includes('sum(ppe_accounts.cost)')) {
      return context.accounts
        .filter(account => account.accountName.toLowerCase().includes('ppe') || 
                          account.accountName.toLowerCase().includes('property') ||
                          account.accountName.toLowerCase().includes('plant') ||
                          account.accountName.toLowerCase().includes('equipment'))
        .reduce((sum, account) => sum + Math.abs(account.debit - account.credit), 0);
    }

    return 0;
  }

  /**
   * Generate content from template
   */
  private generateContent(template: DisclosureTemplate, variables: Record<string, string | number | boolean>): string {
    let content = '';
    let sectionNumber = 1;

    for (const section of template.sections) {
      if (section.conditional && !this.evaluateCondition(section.condition || '', variables)) {
        continue;
      }

      if (template.formatting.numbered) {
        content += `${sectionNumber}. `;
        sectionNumber++;
      }

      content += `**${section.title}**\n\n`;
      content += this.replacePlaceholders(section.content, variables) + '\n\n';
    }

    return content.trim();
  }

  /**
   * Replace template placeholders with variable values
   */
  private replacePlaceholders(content: string, variables: Record<string, string | number | boolean>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_match, variableName) => {
      const value = variables[variableName];
      if (value === undefined || value === null) {
        return `[${variableName}]`;
      }
      
      if (typeof value === 'number') {
        // Format numbers as currency if they look like monetary amounts
        if (value > 1000) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
          }).format(value);
        }
        return value.toString();
      }
      
      return value.toString();
    });
  }

  /**
   * Evaluate condition for conditional sections
   */
  private evaluateCondition(condition: string, variables: Record<string, string | number | boolean>): boolean {
    // Simple condition evaluation - would need expression parser in production
    if (condition.includes('!= null')) {
      const variableName = condition.split(' ')[0];
      return variables[variableName] != null && variables[variableName] !== '';
    }
    
    if (condition.includes('== null')) {
      const variableName = condition.split(' ')[0];
      return variables[variableName] == null || variables[variableName] === '';
    }

    return true;
  }

  /**
   * Add custom disclosure rule
   */
  addCustomRule(rule: DisclosureRule): void {
    this.rules.push(rule);
  }

  /**
   * Add industry-specific rules
   */
  addIndustryRules(industry: string, rules: DisclosureRule[]): void {
    if (!this.industryRules[industry]) {
      this.industryRules[industry] = [];
    }
    this.industryRules[industry].push(...rules);
  }

  /**
   * Get all available rules
   */
  getAllRules(): DisclosureRule[] {
    return [...this.rules];
  }

  /**
   * Get rules for specific industry
   */
  getIndustryRules(industry: string): DisclosureRule[] {
    return this.industryRules[industry] || [];
  }

  /**
   * Apply a template to generate a disclosure item
   */
  async applyTemplate(template: DisclosureTemplate, project: Project): Promise<DisclosureItem> {
    const period = project.periods[0] || {
      id: 'default',
      reportingDate: new Date(),
      trialBalance: { rawData: [], mappings: {} },
      periodType: 'annual' as const,
      fiscalYear: new Date().getFullYear(),
      fiscalPeriod: 1,
      isComparative: false,
      status: 'draft' as const,
    };

    const context: DisclosureContext = {
      project,
      period,
      accounts: period.trialBalance?.rawData || [],
      financialRatios: {},
    };

    const variables = this.extractVariables(template, context);
    const content = this.populateTemplate(template, variables);

    return {
      id: `template-${template.id}-${Date.now()}`,
      title: template.title,
      content,
      type: 'template',
      category: 'general',
      isRequired: false,
      priority: 'medium',
      status: 'draft',
      metadata: {
        lastModified: new Date(),
        createdBy: 'user',
        version: '1.0',
        ruleId: template.id,
      },
    };
  }

  /**
   * Extract variables from template based on context
   */
  private extractVariables(template: DisclosureTemplate, context: DisclosureContext): Record<string, string | number> {
    const variables: Record<string, string | number> = {};

    template.variables.forEach(variable => {
      switch (variable.source) {
        case 'account':
          if (variable.calculation) {
            // Find account balance by name/pattern
            const account = context.accounts.find(acc => 
              acc.accountName.toLowerCase().includes(variable.name.toLowerCase())
            );
            variables[variable.name] = account?.debit || account?.credit || 0;
          }
          break;
        case 'metadata':
          variables[variable.name] = context.project.companyName;
          break;
        case 'calculation':
          variables[variable.name] = context.financialRatios[variable.name] || 0;
          break;
        case 'user_input':
        default:
          variables[variable.name] = variable.defaultValue || '';
          break;
      }
    });

    return variables;
  }

  /**
   * Populate template with variables
   */
  private populateTemplate(template: DisclosureTemplate, variables: Record<string, string | number>): string {
    let content = '';

    template.sections.forEach((section, index) => {
      if (template.formatting.numbered) {
        content += `${index + 1}. `;
      }

      content += `**${section.title}**\n\n`;

      let sectionContent = section.content;
      
      // Replace variables in the format {{variable_name}}
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        sectionContent = sectionContent.replace(regex, String(value));
      });

      content += sectionContent + '\n\n';

      // Handle subsections
      if (section.subsections) {
        section.subsections.forEach((subsection, subIndex) => {
          if (template.formatting.bulleted) {
            content += `- `;
          } else if (template.formatting.numbered) {
            content += `  ${index + 1}.${subIndex + 1} `;
          }

          content += `**${subsection.title}**\n`;
          
          let subsectionContent = subsection.content;
          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subsectionContent = subsectionContent.replace(regex, String(value));
          });

          content += subsectionContent + '\n\n';
        });
      }
    });

    return content.trim();
  }
}

/**
 * Create default disclosure engine instance
 */
export const disclosureEngine = new DisclosureEngine();

/**
 * Helper function to generate disclosures for a project
 */
export const generateProjectDisclosures = (
  project: Project,
  period: PeriodData,
  industryType?: string,
  financialRatios?: Record<string, number>
): DisclosureItem[] => {
  const context: DisclosureContext = {
    project,
    period,
    accounts: period.trialBalance.rawData,
    financialRatios: financialRatios || {},
    industryType
  };

  return disclosureEngine.generateDisclosures(context);
};
