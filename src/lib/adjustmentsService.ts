/**
 * Adjustments Service
 * Handles journal entries, adjustments, and adjusted trial balance calculations
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { v4 as uuidv4 } from 'uuid';
import type { 
  JournalEntry, 
  AdjustedTrialBalance,
  JournalEntryFilters,
  JournalEntryValidation,
  AdjustmentReport
} from '../types/adjustments';
import { 
  JournalEntryStatus,
  JournalEntryType
} from '../types/adjustments';
import type { TrialBalanceAccount, TrialBalanceData } from '../types/project';
import { logAuditEvent } from './auditTrailService';

export class AdjustmentsService {
  
  /**
   * Create a new journal entry
   */
  static async createJournalEntry(
    projectId: string,
    periodId: string,
    entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'entryNumber' | 'totalDebit' | 'totalCredit'>,
    userId: string,
    userEmail: string
  ): Promise<JournalEntry> {
    // Generate entry number
    const entryNumber = await this.generateEntryNumber(projectId, periodId, entryData.entryType);
    
    // Calculate totals
    const totalDebit = entryData.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entryData.lines.reduce((sum, line) => sum + line.credit, 0);
    
    // Validate entry
    const validation = this.validateJournalEntry({
      ...entryData,
      totalDebit,
      totalCredit
    } as JournalEntry);
    
    if (!validation.isValid) {
      throw new Error(`Invalid journal entry: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    const journalEntry: Omit<JournalEntry, 'id'> = {
      ...entryData,
      periodId,
      entryNumber,
      totalDebit,
      totalCredit,
      lines: entryData.lines.map(line => ({
        ...line,
        id: line.id || uuidv4()
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to Firestore
    const docRef = await addDoc(
      collection(db, 'projects', projectId, 'periods', periodId, 'journalEntries'),
      {
        ...journalEntry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        entryDate: Timestamp.fromDate(journalEntry.entryDate)
      }
    );
    
    const savedEntry = { ...journalEntry, id: docRef.id };
    
    // Log audit event
    await logAuditEvent(
      projectId,
      userId,
      userEmail,
      'createJournalEntry',
      {
        entryId: docRef.id,
        entryNumber,
        entryType: entryData.entryType,
        amount: totalDebit
      }
    );
    
    return savedEntry;
  }
  
  /**
   * Update an existing journal entry
   */
  static async updateJournalEntry(
    projectId: string,
    periodId: string,
    entryId: string,
    updates: Partial<Omit<JournalEntry, 'id' | 'createdAt' | 'entryNumber'>>,
    userId: string,
    userEmail: string
  ): Promise<void> {
    const entryRef = doc(db, 'projects', projectId, 'periods', periodId, 'journalEntries', entryId);
    
    // Recalculate totals if lines are updated
    if (updates.lines) {
      updates.totalDebit = updates.lines.reduce((sum, line) => sum + line.debit, 0);
      updates.totalCredit = updates.lines.reduce((sum, line) => sum + line.credit, 0);
      
      // Validate updated entry
      const validation = this.validateJournalEntry(updates as JournalEntry);
      if (!validation.isValid) {
        throw new Error(`Invalid journal entry update: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      ...(updates.entryDate && { entryDate: Timestamp.fromDate(updates.entryDate) })
    };
    
    await updateDoc(entryRef, updateData);
    
    // Log audit event
    await logAuditEvent(
      projectId,
      userId,
      userEmail,
      'updateJournalEntry',
      {
        entryId,
        updatedFields: Object.keys(updates)
      }
    );
  }
  
  /**
   * Delete a journal entry
   */
  static async deleteJournalEntry(
    projectId: string,
    periodId: string,
    entryId: string,
    userId: string,
    userEmail: string
  ): Promise<void> {
    const entryRef = doc(db, 'projects', projectId, 'periods', periodId, 'journalEntries', entryId);
    
    // Get entry details for audit log
    const entryDoc = await getDoc(entryRef);
    const entryData = entryDoc.data();
    
    await deleteDoc(entryRef);
    
    // Log audit event
    await logAuditEvent(
      projectId,
      userId,
      userEmail,
      'deleteJournalEntry',
      {
        entryId,
        entryNumber: entryData?.entryNumber,
        amount: entryData?.totalDebit
      }
    );
  }
  
  /**
   * Get journal entries with filters
   */
  static async getJournalEntries(
    projectId: string,
    periodId: string,
    filters?: JournalEntryFilters
  ): Promise<JournalEntry[]> {
    let q = query(
      collection(db, 'projects', projectId, 'periods', periodId, 'journalEntries'),
      orderBy('entryDate', 'desc')
    );
    
    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }
    
    if (filters?.entryType && filters.entryType.length > 0) {
      q = query(q, where('entryType', 'in', filters.entryType));
    }
    
    if (filters?.preparedBy) {
      q = query(q, where('preparedBy', '==', filters.preparedBy));
    }
    
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        entryDate: data.entryDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as JournalEntry;
    });
    
    // Apply client-side filters
    let filteredEntries = entries;
    
    if (filters?.dateRange) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.entryDate >= filters.dateRange!.startDate && 
        entry.entryDate <= filters.dateRange!.endDate
      );
    }
    
    if (filters?.amountRange) {
      filteredEntries = filteredEntries.filter(entry =>
        entry.totalDebit >= filters.amountRange!.min &&
        entry.totalDebit <= filters.amountRange!.max
      );
    }
    
    if (filters?.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filteredEntries = filteredEntries.filter(entry =>
        entry.description.toLowerCase().includes(searchLower) ||
        entry.entryNumber.toLowerCase().includes(searchLower) ||
        entry.reference?.toLowerCase().includes(searchLower) ||
        entry.lines.some(line => 
          line.accountName.toLowerCase().includes(searchLower) ||
          line.description?.toLowerCase().includes(searchLower)
        )
      );
    }
    
    if (filters?.accountIds && filters.accountIds.length > 0) {
      filteredEntries = filteredEntries.filter(entry =>
        entry.lines.some(line => filters.accountIds!.includes(line.accountId))
      );
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      filteredEntries = filteredEntries.filter(entry =>
        entry.tags?.some(tag => filters.tags!.includes(tag))
      );
    }
    
    return filteredEntries;
  }
  
  /**
   * Calculate adjusted trial balance
   */
  static async calculateAdjustedTrialBalance(
    projectId: string,
    periodId: string,
    originalTrialBalance: TrialBalanceData
  ): Promise<AdjustedTrialBalance> {
    // Get all posted journal entries
    const journalEntries = await this.getJournalEntries(projectId, periodId, {
      status: [JournalEntryStatus.POSTED]
    });
    
    // Create a map of account adjustments
    const adjustmentsByAccount = new Map<string, number>();
    
    // Process all journal entries
    journalEntries.forEach(entry => {
      entry.lines.forEach(line => {
        const currentAdjustment = adjustmentsByAccount.get(line.accountId) || 0;
        const netAdjustment = line.debit - line.credit;
        adjustmentsByAccount.set(line.accountId, currentAdjustment + netAdjustment);
      });
    });
    
    // Apply adjustments to original trial balance
    const adjustedBalances: TrialBalanceAccount[] = originalTrialBalance.rawData.map(account => {
      const adjustment = adjustmentsByAccount.get(account.accountId) || 0;
      return {
        ...account,
        debit: Math.max(0, account.debit + Math.max(0, adjustment)),
        credit: Math.max(0, account.credit + Math.max(0, -adjustment))
      };
    });
    
    // Add new accounts from adjustments that don't exist in original TB
    adjustmentsByAccount.forEach((adjustment, accountId) => {
      const existingAccount = originalTrialBalance.rawData.find(acc => acc.accountId === accountId);
      if (!existingAccount) {
        // Find account name from journal entries
        const accountName = journalEntries
          .flatMap(entry => entry.lines)
          .find(line => line.accountId === accountId)?.accountName || accountId;
        
        adjustedBalances.push({
          accountId,
          accountName,
          debit: Math.max(0, adjustment),
          credit: Math.max(0, -adjustment)
        });
      }
    });
    
    // Calculate summary
    const netImpactByAccount: { [accountId: string]: number } = {};
    adjustmentsByAccount.forEach((adjustment, accountId) => {
      if (adjustment !== 0) {
        netImpactByAccount[accountId] = adjustment;
      }
    });
    
    const adjustmentSummary = {
      totalEntries: journalEntries.length,
      totalAdjustments: Array.from(adjustmentsByAccount.values()).reduce((sum, adj) => sum + Math.abs(adj), 0),
      lastAdjustmentDate: journalEntries.length > 0 ? 
        new Date(Math.max(...journalEntries.map(e => e.entryDate.getTime()))) : 
        undefined,
      netImpactByAccount
    };
    
    return {
      ...originalTrialBalance,
      rawData: adjustedBalances,
      adjustments: journalEntries,
      adjustedBalances,
      adjustmentSummary
    };
  }
  
  /**
   * Validate journal entry
   */
  static validateJournalEntry(entry: Partial<JournalEntry>): JournalEntryValidation {
    const errors = [];
    const warnings = [];
    
    // Check if debits equal credits
    if (Math.abs((entry.totalDebit || 0) - (entry.totalCredit || 0)) > 0.01) {
      errors.push({
        field: 'lines',
        code: 'UNBALANCED_ENTRY',
        message: 'Total debits must equal total credits'
      });
    }
    
    // Check for empty lines
    if (!entry.lines || entry.lines.length === 0) {
      errors.push({
        field: 'lines',
        code: 'NO_LINES',
        message: 'Journal entry must have at least one line'
      });
    }
    
    // Check for lines with zero amounts
    if (entry.lines?.some(line => line.debit === 0 && line.credit === 0)) {
      warnings.push({
        field: 'lines',
        code: 'ZERO_AMOUNT_LINE',
        message: 'Some lines have zero amounts',
        severity: 'medium' as const
      });
    }
    
    // Check for missing descriptions
    if (!entry.description || entry.description.trim().length === 0) {
      errors.push({
        field: 'description',
        code: 'MISSING_DESCRIPTION',
        message: 'Journal entry description is required'
      });
    }
    
    // Check for very large amounts (potential data entry errors)
    const maxAmount = Math.max(entry.totalDebit || 0, entry.totalCredit || 0);
    if (maxAmount > 1000000) {
      warnings.push({
        field: 'amount',
        code: 'LARGE_AMOUNT',
        message: 'Entry amount is unusually large',
        severity: 'high' as const
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Generate entry number
   */
  private static async generateEntryNumber(
    projectId: string,
    periodId: string,
    entryType: JournalEntryType
  ): Promise<string> {
    // Get existing entries to determine next number
    const entries = await this.getJournalEntries(projectId, periodId);
    
    const prefix = this.getEntryPrefix(entryType);
    const existingNumbers = entries
      .filter(e => e.entryNumber.startsWith(prefix))
      .map(e => {
        const match = e.entryNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }
  
  /**
   * Get entry prefix based on type
   */
  private static getEntryPrefix(entryType: JournalEntryType): string {
    switch (entryType) {
      case JournalEntryType.ADJUSTMENT:
        return 'ADJ-';
      case JournalEntryType.RECLASSIFICATION:
        return 'RECL-';
      case JournalEntryType.ACCRUAL:
        return 'ACC-';
      case JournalEntryType.PREPAYMENT:
        return 'PREP-';
      case JournalEntryType.DEPRECIATION:
        return 'DEP-';
      case JournalEntryType.PROVISION:
        return 'PROV-';
      case JournalEntryType.REVERSAL:
        return 'REV-';
      case JournalEntryType.YEAR_END:
        return 'YE-';
      default:
        return 'JE-';
    }
  }
  
  /**
   * Generate adjustment report
   */
  static async generateAdjustmentReport(
    projectId: string,
    periodId: string
  ): Promise<AdjustmentReport> {
    const journalEntries = await this.getJournalEntries(projectId, periodId);
    
    // Calculate summary statistics
    const entriesByType: { [type: string]: number } = {};
    const entriesByStatus: { [status: string]: number } = {};
    let largestAmount = 0;
    let largestEntry: JournalEntry | undefined;
    
    journalEntries.forEach(entry => {
      // By type
      entriesByType[entry.entryType] = (entriesByType[entry.entryType] || 0) + 1;
      
      // By status
      entriesByStatus[entry.status] = (entriesByStatus[entry.status] || 0) + 1;
      
      // Largest entry
      if (entry.totalDebit > largestAmount) {
        largestAmount = entry.totalDebit;
        largestEntry = entry;
      }
    });
    
    // Impact analysis
    const accountsAffected = new Set();
    let totalDebitAdjustments = 0;
    let totalCreditAdjustments = 0;
    
    journalEntries.forEach(entry => {
      entry.lines.forEach(line => {
        accountsAffected.add(line.accountId);
        totalDebitAdjustments += line.debit;
        totalCreditAdjustments += line.credit;
      });
    });
    
    // Compliance checks
    const unbalancedEntries = journalEntries.filter(entry => 
      Math.abs(entry.totalDebit - entry.totalCredit) > 0.01
    );
    
    const unapprovedEntries = journalEntries.filter(entry =>
      entry.status !== JournalEntryStatus.APPROVED && entry.status !== JournalEntryStatus.POSTED
    );
    
    const entriesRequiringReview = journalEntries.filter(entry =>
      entry.status === JournalEntryStatus.PENDING_REVIEW
    );
    
    // Significant adjustments (> 1% of largest entry or > 10,000)
    const significantThreshold = Math.max(largestAmount * 0.01, 10000);
    const significantAdjustments = journalEntries.filter(entry =>
      entry.totalDebit > significantThreshold
    );
    
    return {
      periodId,
      generatedAt: new Date(),
      summary: {
        totalEntries: journalEntries.length,
        totalAdjustments: totalDebitAdjustments,
        entriesByType,
        entriesByStatus,
        largestAdjustment: largestEntry ? {
          entryId: largestEntry.id,
          amount: largestEntry.totalDebit,
          description: largestEntry.description
        } : {
          entryId: '',
          amount: 0,
          description: 'No entries found'
        }
      },
      impactAnalysis: {
        accountsAffected: accountsAffected.size,
        totalDebitAdjustments,
        totalCreditAdjustments,
        netImpact: totalDebitAdjustments - totalCreditAdjustments,
        significantAdjustments
      },
      complianceChecks: {
        unbalancedEntries,
        unapprovedEntries,
        entriesRequiringReview
      }
    };
  }
}
