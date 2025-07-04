import type { TrialBalanceAccount } from '../types/project';

export interface AccountMatch {
  accountId: string;
  accountName: string;
  ifrsLineItemId: string;
  confidence: number;
  reasons: string[];
}

export interface MatchingRule {
  id: string;
  pattern: string | RegExp;
  ifrsLineItemId: string;
  priority: number;
  description: string;
}

// Pre-defined matching rules based on common account patterns
const DEFAULT_MATCHING_RULES: MatchingRule[] = [
  // Assets
  {
    id: 'cash-bank',
    pattern: /\b(cash|bank|checking|savings|petty cash)\b/i,
    ifrsLineItemId: 'cash_and_cash_equivalents',
    priority: 10,
    description: 'Cash and cash equivalents'
  },
  {
    id: 'accounts-receivable',
    pattern: /\b(accounts receivable|receivables|debtors|trade receivables)\b/i,
    ifrsLineItemId: 'trade_and_other_receivables',
    priority: 9,
    description: 'Trade and other receivables'
  },
  {
    id: 'inventory',
    pattern: /\b(inventory|inventories|stock|goods|merchandise)\b/i,
    ifrsLineItemId: 'inventories',
    priority: 9,
    description: 'Inventories'
  },
  {
    id: 'ppe',
    pattern: /\b(property|plant|equipment|ppe|fixed assets|buildings|machinery|vehicles)\b/i,
    ifrsLineItemId: 'property_plant_equipment',
    priority: 8,
    description: 'Property, plant and equipment'
  },
  {
    id: 'intangible',
    pattern: /\b(intangible|goodwill|patents|trademarks|software|licenses)\b/i,
    ifrsLineItemId: 'intangible_assets',
    priority: 8,
    description: 'Intangible assets'
  },
  
  // Liabilities
  {
    id: 'accounts-payable',
    pattern: /\b(accounts payable|payables|creditors|trade payables)\b/i,
    ifrsLineItemId: 'trade_and_other_payables',
    priority: 9,
    description: 'Trade and other payables'
  },
  {
    id: 'short-term-borrowings',
    pattern: /\b(short.?term|current.*loan|bank.*loan|overdraft|credit line)\b/i,
    ifrsLineItemId: 'borrowings_current',
    priority: 8,
    description: 'Current borrowings'
  },
  {
    id: 'long-term-borrowings',
    pattern: /\b(long.?term|non.?current.*loan|mortgage|bonds|debentures)\b/i,
    ifrsLineItemId: 'borrowings_non_current',
    priority: 8,
    description: 'Non-current borrowings'
  },
  {
    id: 'accrued-expenses',
    pattern: /\b(accrued|accruals|provisions|estimated)\b/i,
    ifrsLineItemId: 'provisions',
    priority: 7,
    description: 'Provisions and accrued expenses'
  },
  
  // Equity
  {
    id: 'share-capital',
    pattern: /\b(share capital|capital stock|common stock|ordinary shares|issued capital)\b/i,
    ifrsLineItemId: 'issued_capital',
    priority: 10,
    description: 'Issued capital'
  },
  {
    id: 'retained-earnings',
    pattern: /\b(retained earnings|accumulated profits|reserves|surplus)\b/i,
    ifrsLineItemId: 'retained_earnings',
    priority: 9,
    description: 'Retained earnings'
  },
  
  // Income Statement
  {
    id: 'revenue',
    pattern: /\b(revenue|sales|income|turnover|fees earned)\b/i,
    ifrsLineItemId: 'revenue',
    priority: 10,
    description: 'Revenue'
  },
  {
    id: 'cost-of-sales',
    pattern: /\b(cost of sales|cost of goods sold|cogs|direct costs)\b/i,
    ifrsLineItemId: 'cost_of_sales',
    priority: 9,
    description: 'Cost of sales'
  },
  {
    id: 'operating-expenses',
    pattern: /\b(operating expenses|admin|administrative|selling|marketing|general)\b/i,
    ifrsLineItemId: 'other_expenses',
    priority: 7,
    description: 'Other operating expenses'
  },
  {
    id: 'depreciation',
    pattern: /\b(depreciation|amortization|impairment)\b/i,
    ifrsLineItemId: 'depreciation_amortisation',
    priority: 8,
    description: 'Depreciation and amortisation'
  },
  {
    id: 'finance-costs',
    pattern: /\b(interest|finance cost|borrowing cost|financial charges)\b/i,
    ifrsLineItemId: 'finance_costs',
    priority: 8,
    description: 'Finance costs'
  },
  {
    id: 'tax-expense',
    pattern: /\b(tax|income tax|corporate tax|provision for tax)\b/i,
    ifrsLineItemId: 'income_tax_expense',
    priority: 9,
    description: 'Income tax expense'
  }
];

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const a = str1.toLowerCase();
  const b = str2.toLowerCase();
  
  if (a === b) return 1;
  if (a.length === 0) return 0;
  if (b.length === 0) return 0;
  
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  const maxLength = Math.max(a.length, b.length);
  return 1 - matrix[b.length][a.length] / maxLength;
}

/**
 * Extract keywords from account name for better matching
 */
function extractKeywords(accountName: string): string[] {
  // Remove common prefixes/suffixes and split
  const cleaned = accountName
    .replace(/^\d+[\s-]*/, '') // Remove account codes at start
    .replace(/\s*-\s*\d+$/, '') // Remove codes at end
    .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
    .toLowerCase();
  
  const words = cleaned.split(/\s+/).filter(word => word.length > 2);
  
  // Remove common stop words
  const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'];
  
  return words.filter(word => !stopWords.includes(word));
}

/**
 * Match a single account against all rules
 */
function matchAccountToRules(account: TrialBalanceAccount, rules: MatchingRule[] = DEFAULT_MATCHING_RULES): AccountMatch[] {
  const matches: AccountMatch[] = [];
  const accountName = account.accountName.toLowerCase();
  const keywords = extractKeywords(account.accountName);
  
  for (const rule of rules) {
    let confidence = 0;
    const reasons: string[] = [];
    
    // Direct pattern matching
    if (rule.pattern instanceof RegExp) {
      if (rule.pattern.test(accountName)) {
        confidence += 0.7;
        reasons.push(`Pattern match: ${rule.description}`);
      }
    } else {
      const similarity = calculateSimilarity(accountName, rule.pattern.toLowerCase());
      if (similarity > 0.6) {
        confidence += similarity * 0.6;
        reasons.push(`Text similarity: ${Math.round(similarity * 100)}%`);
      }
    }
    
    // Keyword matching
    const ruleKeywords = extractKeywords(rule.description);
    const keywordMatches = keywords.filter(kw => 
      ruleKeywords.some(rk => calculateSimilarity(kw, rk) > 0.8)
    );
    
    if (keywordMatches.length > 0) {
      confidence += Math.min(keywordMatches.length * 0.2, 0.5);
      reasons.push(`Keyword matches: ${keywordMatches.join(', ')}`);
    }
    
    // Account code pattern matching (if account has numeric prefix)
    const codeMatch = account.accountName.match(/^(\d+)/);
    if (codeMatch) {
      const code = parseInt(codeMatch[1]);
      // Basic chart of accounts patterns
      if ((code >= 1000 && code < 2000 && rule.ifrsLineItemId.includes('cash')) ||
          (code >= 1100 && code < 1200 && rule.ifrsLineItemId.includes('receivables')) ||
          (code >= 1300 && code < 1400 && rule.ifrsLineItemId.includes('inventories')) ||
          (code >= 1500 && code < 1800 && rule.ifrsLineItemId.includes('property')) ||
          (code >= 2000 && code < 3000 && rule.ifrsLineItemId.includes('payables')) ||
          (code >= 2100 && code < 2200 && rule.ifrsLineItemId.includes('borrowings')) ||
          (code >= 3000 && code < 4000 && rule.ifrsLineItemId.includes('capital')) ||
          (code >= 4000 && code < 5000 && rule.ifrsLineItemId.includes('revenue')) ||
          (code >= 5000 && code < 7000 && rule.ifrsLineItemId.includes('cost'))) {
        confidence += 0.3;
        reasons.push(`Account code pattern: ${code}`);
      }
    }
    
    // Apply priority weighting
    confidence *= (rule.priority / 10);
    
    // Only include matches with reasonable confidence
    if (confidence > 0.3) {
      matches.push({
        accountId: account.accountId,
        accountName: account.accountName,
        ifrsLineItemId: rule.ifrsLineItemId,
        confidence: Math.min(confidence, 1),
        reasons
      });
    }
  }
  
  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Generate smart matching suggestions for all accounts
 */
export function generateAccountMatchingSuggestions(
  accounts: TrialBalanceAccount[],
  customRules: MatchingRule[] = []
): Map<string, AccountMatch[]> {
  const allRules = [...DEFAULT_MATCHING_RULES, ...customRules]
    .sort((a, b) => b.priority - a.priority);
  
  const suggestions = new Map<string, AccountMatch[]>();
  
  for (const account of accounts) {
    const matches = matchAccountToRules(account, allRules);
    if (matches.length > 0) {
      suggestions.set(account.accountId, matches);
    }
  }
  
  return suggestions;
}

/**
 * Get the best suggestion for an account
 */
export function getBestMatchForAccount(account: TrialBalanceAccount): AccountMatch | null {
  const matches = matchAccountToRules(account);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Auto-map accounts with high confidence matches
 */
export function autoMapHighConfidenceAccounts(
  accounts: TrialBalanceAccount[],
  confidenceThreshold: number = 0.8
): Record<string, string> {
  const autoMappings: Record<string, string> = {};
  
  for (const account of accounts) {
    const bestMatch = getBestMatchForAccount(account);
    if (bestMatch && bestMatch.confidence >= confidenceThreshold) {
      autoMappings[account.accountId] = bestMatch.ifrsLineItemId;
    }
  }
  
  return autoMappings;
}

/**
 * Create custom matching rule
 */
export function createCustomRule(
  pattern: string | RegExp,
  ifrsLineItemId: string,
  description: string,
  priority: number = 5
): MatchingRule {
  return {
    id: `custom_${Date.now()}`,
    pattern,
    ifrsLineItemId,
    priority,
    description
  };
}

/**
 * Validate and score mapping quality
 */
export function validateMappingQuality(
  accounts: TrialBalanceAccount[],
  mappings: Record<string, string>
): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  const mappedAccounts = accounts.filter(acc => mappings[acc.accountId]);
  const unmappedAccounts = accounts.filter(acc => !mappings[acc.accountId]);
  
  // Calculate completion score
  const completionScore = mappedAccounts.length / accounts.length;
  
  // Check for common issues
  if (unmappedAccounts.length > 0) {
    issues.push(`${unmappedAccounts.length} accounts remain unmapped`);
    
    // Suggest high-confidence matches for unmapped accounts
    for (const account of unmappedAccounts.slice(0, 3)) {
      const bestMatch = getBestMatchForAccount(account);
      if (bestMatch && bestMatch.confidence > 0.6) {
        suggestions.push(`Consider mapping "${account.accountName}" to ${bestMatch.ifrsLineItemId} (${Math.round(bestMatch.confidence * 100)}% confidence)`);
      }
    }
  }
  
  // Check for balance consistency
  const assetTotal = mappedAccounts
    .filter(acc => {
      const mapping = mappings[acc.accountId];
      return mapping && (
        mapping.includes('cash') || 
        mapping.includes('receivables') || 
        mapping.includes('inventories') || 
        mapping.includes('property') || 
        mapping.includes('intangible')
      );
    })
    .reduce((sum, acc) => sum + acc.debit - acc.credit, 0);
    
  const liabilityTotal = mappedAccounts
    .filter(acc => {
      const mapping = mappings[acc.accountId];
      return mapping && (
        mapping.includes('payables') || 
        mapping.includes('borrowings') || 
        mapping.includes('provisions')
      );
    })
    .reduce((sum, acc) => sum + acc.credit - acc.debit, 0);
    
  const equityTotal = mappedAccounts
    .filter(acc => {
      const mapping = mappings[acc.accountId];
      return mapping && (
        mapping.includes('capital') || 
        mapping.includes('earnings') || 
        mapping.includes('reserves')
      );
    })
    .reduce((sum, acc) => sum + acc.credit - acc.debit, 0);
  
  const balanceDifference = Math.abs(assetTotal - (liabilityTotal + equityTotal));
  const balanceScore = balanceDifference < 1000 ? 1 : Math.max(0, 1 - balanceDifference / 100000);
  
  if (balanceScore < 0.9) {
    issues.push('Balance sheet equation may not balance with current mappings');
    suggestions.push('Review asset, liability, and equity account mappings');
  }
  
  const overallScore = (completionScore * 0.7) + (balanceScore * 0.3);
  
  return {
    score: overallScore,
    issues,
    suggestions
  };
}
