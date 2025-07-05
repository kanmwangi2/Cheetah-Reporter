/**
 * Version Control and History Service
 * Handles document versioning, branching, merging, and rollback functionality
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface DocumentVersion {
  id: string;
  documentId: string; // ID of the main document
  projectId: string;
  versionNumber: string; // e.g., "1.0", "1.1", "2.0"
  branchName: string; // e.g., "main", "feature/new-disclosures", "hotfix/calculation-error"
  parentVersionId?: string; // ID of the parent version
  content: Record<string, unknown>; // Full document content at this version
  contentHash: string; // Hash of the content for integrity checking
  author: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  timestamp: Timestamp;
  commitMessage: string;
  tags: string[]; // e.g., ["final", "reviewed", "approved"]
  metadata: {
    size: number; // Size of content in bytes
    changeCount: number; // Number of changes from parent
    reviewStatus?: 'pending' | 'approved' | 'rejected';
    isSnapshot: boolean; // Whether this is an automatic snapshot
    triggerEvent?: string; // What triggered this version (manual, auto-save, workflow)
  };
  changes: VersionChange[]; // Detailed change log
  relatedWorkflows?: string[]; // IDs of workflows associated with this version
}

export interface VersionChange {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'rename';
  path: string; // JSONPath to the changed field
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: Timestamp;
  description: string;
}

export interface Branch {
  id: string;
  name: string;
  displayName: string;
  documentId: string;
  projectId: string;
  baseBranch?: string; // Parent branch name
  baseVersionId?: string; // Version this branch was created from
  headVersionId: string; // Latest version in this branch
  author: {
    userId: string;
    userName: string;
  };
  createdAt: Timestamp;
  lastActivity: Timestamp;
  status: 'active' | 'merged' | 'archived' | 'protected';
  description?: string;
  mergeHistory: MergeRecord[];
  protection: {
    preventDirectPush: boolean;
    requireReviewBeforeMerge: boolean;
    restrictedUsers: string[]; // Users who cannot push to this branch
  };
}

export interface MergeRecord {
  id: string;
  sourceBranch: string;
  targetBranch: string;
  sourceVersionId: string;
  targetVersionId: string;
  resultVersionId: string;
  mergedBy: {
    userId: string;
    userName: string;
  };
  mergedAt: Timestamp;
  strategy: 'fast_forward' | 'three_way' | 'manual';
  conflicts: ConflictResolution[];
  commitMessage: string;
}

export interface ConflictResolution {
  path: string;
  sourceValue: unknown;
  targetValue: unknown;
  resolvedValue: unknown;
  resolvedBy: string;
  resolution: 'source' | 'target' | 'manual' | 'both';
}

export interface VersionComparison {
  fromVersion: DocumentVersion;
  toVersion: DocumentVersion;
  changes: VersionChange[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
    totalChanges: number;
  };
  conflictingPaths: string[];
}

export interface RestorePoint {
  id: string;
  name: string;
  description: string;
  documentId: string;
  versionId: string;
  createdBy: string;
  createdAt: Timestamp;
  isAutomatic: boolean;
  metadata: Record<string, unknown>;
}

export class VersionControlService {
  /**
   * Create a new version of a document
   */
  static async createVersion(
    documentId: string,
    projectId: string,
    content: Record<string, unknown>,
    author: { userId: string; userName: string; userEmail: string },
    options: {
      commitMessage: string;
      branchName?: string;
      parentVersionId?: string;
      tags?: string[];
      isSnapshot?: boolean;
      triggerEvent?: string;
    }
  ): Promise<string> {
    const branchName = options.branchName || 'main';
    
    // Get the current branch
    const branch = await this.getBranch(documentId, branchName);
    const parentVersionId = options.parentVersionId || branch?.headVersionId;

    // Calculate changes from parent
    let changes: VersionChange[] = [];
    let changeCount = 0;
    
    if (parentVersionId) {
      const parentVersion = await this.getVersion(parentVersionId);
      if (parentVersion) {
        const comparison = await this.compareVersions(parentVersion.id, content);
        changes = comparison.changes;
        changeCount = comparison.stats.totalChanges;
      }
    } else {
      // First version - everything is a creation
      changeCount = this.countFields(content);
      changes = [{
        id: crypto.randomUUID(),
        type: 'create',
        path: '$',
        newValue: content,
        timestamp: serverTimestamp() as Timestamp,
        description: 'Initial version created'
      }];
    }

    // Generate version number
    const versionNumber = await this.generateVersionNumber(documentId, branchName);
    
    // Calculate content hash
    const contentHash = await this.calculateHash(content);

    // Create version document
    const version: Omit<DocumentVersion, 'id'> = {
      documentId,
      projectId,
      versionNumber,
      branchName,
      parentVersionId,
      content,
      contentHash,
      author,
      timestamp: serverTimestamp() as Timestamp,
      commitMessage: options.commitMessage,
      tags: options.tags || [],
      metadata: {
        size: JSON.stringify(content).length,
        changeCount,
        isSnapshot: options.isSnapshot || false,
        triggerEvent: options.triggerEvent
      },
      changes,
      relatedWorkflows: []
    };

    const versionsCol = collection(db, 'document_versions');
    const docRef = await addDoc(versionsCol, version);

    // Update branch head
    await this.updateBranchHead(documentId, branchName, docRef.id);

    // Create automatic restore point for significant changes
    if (changeCount > 10 && !options.isSnapshot) {
      await this.createRestorePoint(
        documentId,
        docRef.id,
        author.userId,
        `Auto: ${options.commitMessage}`,
        'Automatic restore point',
        true
      );
    }

    return docRef.id;
  }

  /**
   * Get a specific version
   */
  static async getVersion(versionId: string): Promise<DocumentVersion | null> {
    const versionDoc = doc(db, 'document_versions', versionId);
    const snapshot = await getDoc(versionDoc);
    
    if (!snapshot.exists()) {
      return null;
    }

    return { id: snapshot.id, ...snapshot.data() } as DocumentVersion;
  }

  /**
   * Get version history for a document
   */
  static async getVersionHistory(
    documentId: string,
    branchName?: string,
    limitCount: number = 50
  ): Promise<DocumentVersion[]> {
    const versionsCol = collection(db, 'document_versions');
    const constraints = [
      where('documentId', '==', documentId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    ];

    if (branchName) {
      constraints.splice(1, 0, where('branchName', '==', branchName));
    }

    const q = query(versionsCol, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DocumentVersion));
  }

  /**
   * Subscribe to version history updates
   */
  static subscribeToVersionHistory(
    documentId: string,
    branchName: string | undefined,
    callback: (versions: DocumentVersion[]) => void
  ): () => void {
    const versionsCol = collection(db, 'document_versions');
    const constraints = [
      where('documentId', '==', documentId),
      orderBy('timestamp', 'desc'),
      limit(50)
    ];

    if (branchName) {
      constraints.splice(1, 0, where('branchName', '==', branchName));
    }

    const q = query(versionsCol, ...constraints);

    return onSnapshot(q, (snapshot) => {
      const versions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DocumentVersion));
      callback(versions);
    });
  }

  /**
   * Create a new branch
   */
  static async createBranch(
    documentId: string,
    projectId: string,
    branchName: string,
    displayName: string,
    author: { userId: string; userName: string },
    baseVersionId: string,
    description?: string
  ): Promise<string> {
    // Check if branch already exists
    const existingBranch = await this.getBranch(documentId, branchName);
    if (existingBranch) {
      throw new Error(`Branch '${branchName}' already exists`);
    }

    const baseVersion = await this.getVersion(baseVersionId);
    if (!baseVersion) {
      throw new Error('Base version not found');
    }

    const branch: Omit<Branch, 'id'> = {
      name: branchName,
      displayName,
      documentId,
      projectId,
      baseBranch: baseVersion.branchName,
      baseVersionId,
      headVersionId: baseVersionId,
      author,
      createdAt: serverTimestamp() as Timestamp,
      lastActivity: serverTimestamp() as Timestamp,
      status: 'active',
      description,
      mergeHistory: [],
      protection: {
        preventDirectPush: false,
        requireReviewBeforeMerge: false,
        restrictedUsers: []
      }
    };

    const branchesCol = collection(db, 'document_branches');
    const docRef = await addDoc(branchesCol, branch);

    return docRef.id;
  }

  /**
   * Get branch information
   */
  static async getBranch(documentId: string, branchName: string): Promise<Branch | null> {
    const branchesCol = collection(db, 'document_branches');
    const q = query(
      branchesCol,
      where('documentId', '==', documentId),
      where('name', '==', branchName)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Branch;
  }

  /**
   * Get all branches for a document
   */
  static async getBranches(documentId: string): Promise<Branch[]> {
    const branchesCol = collection(db, 'document_branches');
    const q = query(
      branchesCol,
      where('documentId', '==', documentId),
      orderBy('lastActivity', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Branch));
  }

  /**
   * Merge branches
   */
  static async mergeBranches(
    documentId: string,
    sourceBranch: string,
    targetBranch: string,
    mergedBy: { userId: string; userName: string },
    commitMessage: string,
    strategy: 'fast_forward' | 'three_way' | 'manual' = 'three_way'
  ): Promise<{
    success: boolean;
    resultVersionId?: string;
    conflicts?: ConflictResolution[];
    mergeId: string;
  }> {
    const source = await this.getBranch(documentId, sourceBranch);
    const target = await this.getBranch(documentId, targetBranch);

    if (!source || !target) {
      throw new Error('Source or target branch not found');
    }

    const sourceVersion = await this.getVersion(source.headVersionId);
    const targetVersion = await this.getVersion(target.headVersionId);

    if (!sourceVersion || !targetVersion) {
      throw new Error('Source or target version not found');
    }

    // Compare versions to detect conflicts
    const comparison = await this.compareVersionsDetailed(sourceVersion, targetVersion);
    
    if (comparison.conflictingPaths.length > 0 && strategy !== 'manual') {
      // Conflicts detected - return for manual resolution
      return {
        success: false,
        conflicts: comparison.conflictingPaths.map(path => ({
          path,
          sourceValue: this.getValueAtPath(sourceVersion.content, path),
          targetValue: this.getValueAtPath(targetVersion.content, path),
          resolvedValue: null,
          resolvedBy: '',
          resolution: 'manual' as const
        })),
        mergeId: crypto.randomUUID()
      };
    }

    // Perform merge
    const mergedContent = this.mergeContent(
      targetVersion.content,
      sourceVersion.content,
      strategy
    );

    // Create merged version
    const mergedVersionId = await this.createVersion(
      documentId,
      sourceVersion.projectId,
      mergedContent,
      {
        userId: mergedBy.userId,
        userName: mergedBy.userName,
        userEmail: '' // This would be resolved from user data
      },
      {
        commitMessage: `Merge ${sourceBranch} into ${targetBranch}: ${commitMessage}`,
        branchName: targetBranch,
        parentVersionId: targetVersion.id,
        triggerEvent: 'merge'
      }
    );

    // Record merge
    const mergeRecord: MergeRecord = {
      id: crypto.randomUUID(),
      sourceBranch,
      targetBranch,
      sourceVersionId: source.headVersionId,
      targetVersionId: target.headVersionId,
      resultVersionId: mergedVersionId,
      mergedBy,
      mergedAt: serverTimestamp() as Timestamp,
      strategy,
      conflicts: [],
      commitMessage
    };

    // Update target branch merge history
    const targetBranchDoc = doc(db, 'document_branches', target.id);
    await updateDoc(targetBranchDoc, {
      mergeHistory: [...target.mergeHistory, mergeRecord],
      lastActivity: serverTimestamp()
    });

    return {
      success: true,
      resultVersionId: mergedVersionId,
      mergeId: mergeRecord.id
    };
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    fromVersionId: string,
    toContent: Record<string, unknown>
  ): Promise<VersionComparison> {
    const fromVersion = await this.getVersion(fromVersionId);
    if (!fromVersion) {
      throw new Error('From version not found');
    }

    // Create a temporary version object for comparison
    const toVersion: DocumentVersion = {
      ...fromVersion,
      id: 'temp',
      content: toContent,
      versionNumber: 'temp'
    };

    return this.compareVersionsDetailed(fromVersion, toVersion);
  }

  /**
   * Detailed version comparison
   */
  static async compareVersionsDetailed(
    fromVersion: DocumentVersion,
    toVersion: DocumentVersion
  ): Promise<VersionComparison> {
    const changes = this.detectChanges(fromVersion.content, toVersion.content);
    const conflictingPaths = this.detectConflicts(fromVersion.content, toVersion.content);

    const stats = {
      additions: changes.filter(c => c.type === 'create').length,
      deletions: changes.filter(c => c.type === 'delete').length,
      modifications: changes.filter(c => c.type === 'update').length,
      totalChanges: changes.length
    };

    return {
      fromVersion,
      toVersion,
      changes,
      stats,
      conflictingPaths
    };
  }

  /**
   * Rollback to a specific version
   */
  static async rollbackToVersion(
    documentId: string,
    versionId: string,
    rolledBackBy: { userId: string; userName: string; userEmail: string },
    commitMessage?: string
  ): Promise<string> {
    const targetVersion = await this.getVersion(versionId);
    if (!targetVersion) {
      throw new Error('Target version not found');
    }

    // Create a new version with the old content
    const rollbackVersionId = await this.createVersion(
      documentId,
      targetVersion.projectId,
      targetVersion.content,
      rolledBackBy,
      {
        commitMessage: commitMessage || `Rollback to version ${targetVersion.versionNumber}`,
        branchName: targetVersion.branchName,
        triggerEvent: 'rollback',
        tags: ['rollback']
      }
    );

    return rollbackVersionId;
  }

  /**
   * Create a restore point
   */
  static async createRestorePoint(
    documentId: string,
    versionId: string,
    createdBy: string,
    name: string,
    description: string,
    isAutomatic: boolean = false
  ): Promise<string> {
    const restorePoint: Omit<RestorePoint, 'id'> = {
      name,
      description,
      documentId,
      versionId,
      createdBy,
      createdAt: serverTimestamp() as Timestamp,
      isAutomatic,
      metadata: {}
    };

    const restorePointsCol = collection(db, 'restore_points');
    const docRef = await addDoc(restorePointsCol, restorePoint);

    return docRef.id;
  }

  /**
   * Get restore points for a document
   */
  static async getRestorePoints(documentId: string): Promise<RestorePoint[]> {
    const restorePointsCol = collection(db, 'restore_points');
    const q = query(
      restorePointsCol,
      where('documentId', '==', documentId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RestorePoint));
  }

  /**
   * Delete old versions (cleanup)
   */
  static async cleanupOldVersions(
    documentId: string,
    keepCount: number = 50,
    keepDays: number = 90
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const versionsCol = collection(db, 'document_versions');
    const q = query(
      versionsCol,
      where('documentId', '==', documentId),
      where('timestamp', '<', cutoffDate),
      orderBy('timestamp', 'desc'),
      limit(1000) // Process in batches
    );

    const snapshot = await getDocs(q);
    const versions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentVersion));

    // Keep tagged versions and recent versions
    const versionsToDelete = versions
      .filter((_v, index) => index >= keepCount) // Keep recent versions
      .filter(v => !v.tags.includes('final') && !v.tags.includes('approved')); // Keep important versions

    let deletedCount = 0;
    for (const version of versionsToDelete) {
      await deleteDoc(doc(db, 'document_versions', version.id));
      deletedCount++;
    }

    return deletedCount;
  }

  // Helper methods
  private static async generateVersionNumber(documentId: string, branchName: string): Promise<string> {
    const versions = await this.getVersionHistory(documentId, branchName, 1);
    if (versions.length === 0) {
      return '1.0';
    }

    const lastVersion = versions[0].versionNumber;
    const parts = lastVersion.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;

    // Increment minor version
    return `${major}.${minor + 1}`;
  }

  private static async calculateHash(content: Record<string, unknown>): Promise<string> {
    const str = JSON.stringify(content, Object.keys(content).sort());
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static countFields(obj: Record<string, unknown>, depth: number = 0): number {
    let count = 0;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null && depth < 10) {
        count += this.countFields(value as Record<string, unknown>, depth + 1);
      } else {
        count++;
      }
    }
    return count;
  }

  private static async updateBranchHead(documentId: string, branchName: string, versionId: string): Promise<void> {
    const branch = await this.getBranch(documentId, branchName);
    if (branch) {
      const branchDoc = doc(db, 'document_branches', branch.id);
      await updateDoc(branchDoc, {
        headVersionId: versionId,
        lastActivity: serverTimestamp()
      });
    } else {
      // Create main branch if it doesn't exist
      if (branchName === 'main') {
        await this.createBranch(
          documentId,
          '', // projectId would be resolved
          'main',
          'Main Branch',
          { userId: 'system', userName: 'System' },
          versionId,
          'Main development branch'
        );
      }
    }
  }

  private static detectChanges(oldContent: Record<string, unknown>, newContent: Record<string, unknown>): VersionChange[] {
    // This would implement a sophisticated diff algorithm
    // For now, return a simple comparison
    const changes: VersionChange[] = [];
    
    // Simple implementation - compare JSON strings
    if (JSON.stringify(oldContent) !== JSON.stringify(newContent)) {
      changes.push({
        id: crypto.randomUUID(),
        type: 'update',
        path: '$',
        oldValue: oldContent,
        newValue: newContent,
        timestamp: serverTimestamp() as Timestamp,
        description: 'Content updated'
      });
    }

    return changes;
  }

  private static detectConflicts(content1: Record<string, unknown>, content2: Record<string, unknown>): string[] {
    // This would implement conflict detection logic
    // For now, return empty array (no conflicts)
    console.log('Detecting conflicts between', content1, content2);
    return [];
  }

  private static mergeContent(
    base: Record<string, unknown>,
    source: Record<string, unknown>,
    strategy: 'fast_forward' | 'three_way' | 'manual'
  ): Record<string, unknown> {
    // This would implement sophisticated merge logic
    // For now, return source content for fast_forward, merged for others
    switch (strategy) {
      case 'fast_forward':
        return source;
      case 'three_way':
      case 'manual':
        return { ...base, ...source };
      default:
        return source;
    }
  }

  private static getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
    // Simple path resolution - in a real implementation, this would use a library like lodash
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part] as Record<string, unknown>;
      } else {
        return undefined;
      }
    }
    return current;
  }
}
