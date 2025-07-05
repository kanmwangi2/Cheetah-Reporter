/**
 * Real-time Collaboration Service
 * Handles WebSocket-based real-time updates, operational transformation, and user presence
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  deleteDoc,
  getDocs,
  limit 
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  projectId: string;
  sectionId: string; // Which section they're currently viewing/editing
  isActive: boolean;
  lastSeen: Timestamp;
  cursorPosition?: {
    x: number;
    y: number;
    elementId?: string;
  };
  currentAction?: 'viewing' | 'editing' | 'commenting';
}

export interface CollaborativeEdit {
  id: string;
  userId: string;
  userName: string;
  projectId: string;
  sectionId: string;
  operation: 'insert' | 'delete' | 'update' | 'format';
  content: Record<string, unknown>;
  position?: number;
  timestamp: Timestamp;
  acknowledged: boolean;
}

export interface ConflictResolution {
  id: string;
  editIds: string[];
  projectId: string;
  sectionId: string;
  conflictType: 'concurrent_edit' | 'content_conflict' | 'version_mismatch';
  resolution: 'merge' | 'override' | 'manual';
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  originalContent: Record<string, unknown>;
  conflictingContent: Record<string, unknown>[];
  mergedContent?: Record<string, unknown>;
}

export class CollaborationService {
  private static presenceListeners: Map<string, () => void> = new Map();
  private static editListeners: Map<string, () => void> = new Map();
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize user presence for a project
   */
  static async initializePresence(
    userId: string, 
    userName: string, 
    userEmail: string,
    projectId: string,
    sectionId: string = 'dashboard',
    userAvatar?: string
  ): Promise<void> {
    const presenceRef = doc(db, 'presence', `${projectId}_${userId}`);
    
    const presenceData: Partial<UserPresence> = {
      userId,
      userName,
      userEmail,
      userAvatar,
      projectId,
      sectionId,
      isActive: true,
      lastSeen: serverTimestamp() as Timestamp,
      currentAction: 'viewing'
    };

    await updateDoc(presenceRef, presenceData).catch(async () => {
      // If document doesn't exist, create it
      await addDoc(collection(db, 'presence'), {
        ...presenceData,
        id: `${projectId}_${userId}`
      });
    });

    // Start heartbeat to maintain presence
    this.startHeartbeat(projectId, userId);
  }

  /**
   * Update user presence (section, cursor position, action)
   */
  static async updatePresence(
    userId: string,
    projectId: string,
    updates: Partial<Pick<UserPresence, 'sectionId' | 'cursorPosition' | 'currentAction'>>
  ): Promise<void> {
    const presenceRef = doc(db, 'presence', `${projectId}_${userId}`);
    
    await updateDoc(presenceRef, {
      ...updates,
      lastSeen: serverTimestamp(),
      isActive: true
    });
  }

  /**
   * Subscribe to presence updates for a project
   */
  static subscribeToPresence(
    projectId: string, 
    callback: (users: UserPresence[]) => void
  ): () => void {
    const q = query(
      collection(db, 'presence'),
      where('projectId', '==', projectId),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserPresence[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({ ...data, id: doc.id } as unknown as UserPresence);
      });
      callback(users);
    });

    this.presenceListeners.set(projectId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Start heartbeat to maintain presence
   */
  private static startHeartbeat(projectId: string, userId: string): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const presenceRef = doc(db, 'presence', `${projectId}_${userId}`);
        await updateDoc(presenceRef, {
          lastSeen: serverTimestamp(),
          isActive: true
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * End user presence (when leaving project/app)
   */
  static async endPresence(userId: string, projectId: string): Promise<void> {
    const presenceRef = doc(db, 'presence', `${projectId}_${userId}`);
    
    await updateDoc(presenceRef, {
      isActive: false,
      lastSeen: serverTimestamp()
    });

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Record a collaborative edit
   */
  static async recordEdit(
    userId: string,
    userName: string,
    projectId: string,
    sectionId: string,
    operation: CollaborativeEdit['operation'],
    content: Record<string, unknown>,
    position?: number
  ): Promise<string> {
    const editData: Omit<CollaborativeEdit, 'id'> = {
      userId,
      userName,
      projectId,
      sectionId,
      operation,
      content,
      position,
      timestamp: serverTimestamp() as Timestamp,
      acknowledged: false
    };

    const docRef = await addDoc(collection(db, 'collaborative_edits'), editData);
    return docRef.id;
  }

  /**
   * Subscribe to collaborative edits for a section
   */
  static subscribeToEdits(
    projectId: string,
    sectionId: string,
    callback: (edits: CollaborativeEdit[]) => void
  ): () => void {
    const q = query(
      collection(db, 'collaborative_edits'),
      where('projectId', '==', projectId),
      where('sectionId', '==', sectionId),
      where('acknowledged', '==', false),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const edits: CollaborativeEdit[] = [];
      snapshot.forEach((doc) => {
        edits.push({ id: doc.id, ...doc.data() } as CollaborativeEdit);
      });
      callback(edits);
    });

    this.editListeners.set(`${projectId}_${sectionId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Acknowledge edit (mark as processed)
   */
  static async acknowledgeEdit(editId: string): Promise<void> {
    const editRef = doc(db, 'collaborative_edits', editId);
    await updateDoc(editRef, {
      acknowledged: true
    });
  }

  /**
   * Apply operational transformation to resolve conflicts
   */
  static async resolveConflict(
    conflictingEdits: CollaborativeEdit[],
    projectId: string,
    sectionId: string,
    originalContent: Record<string, unknown>
  ): Promise<ConflictResolution> {
    // Simple operational transformation - in a real app, this would be more sophisticated
    const resolution: Omit<ConflictResolution, 'id'> = {
      editIds: conflictingEdits.map(edit => edit.id),
      projectId,
      sectionId,
      conflictType: 'concurrent_edit',
      resolution: 'merge',
      originalContent,
      conflictingContent: conflictingEdits.map(edit => edit.content)
    };

    // Apply transformation logic based on operation types
    let mergedContent = { ...originalContent };
    
    for (const edit of conflictingEdits.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())) {
      switch (edit.operation) {
        case 'insert':
          if (edit.position !== undefined) {
            // Insert content at position with conflict resolution
            mergedContent = this.insertWithTransform(mergedContent, edit.content, edit.position);
          }
          break;
        case 'update':
          // Merge updates, later timestamps take precedence for same fields
          mergedContent = { ...mergedContent, ...edit.content };
          break;
        case 'delete':
          // Apply deletion if content still exists
          mergedContent = this.deleteWithTransform(mergedContent, edit.content);
          break;
      }
    }

    resolution.mergedContent = mergedContent;

    const docRef = await addDoc(collection(db, 'conflict_resolutions'), {
      ...resolution,
      resolvedAt: serverTimestamp()
    });

    return { id: docRef.id, ...resolution } as ConflictResolution;
  }

  /**
   * Transform insert operation to handle position conflicts
   */
  private static insertWithTransform(
    content: Record<string, unknown>, 
    newContent: Record<string, unknown>, 
    position: number
  ): Record<string, unknown> {
    // For objects, merge new content at specified position
    // In a real implementation, this would handle array insertions
    console.log('Inserting at position:', position);
    return { ...content, ...newContent };
  }

  /**
   * Transform delete operation
   */
  private static deleteWithTransform(
    content: Record<string, unknown>, 
    deleteContent: Record<string, unknown>
  ): Record<string, unknown> {
    // For objects, remove specified keys
    const result = { ...content };
    Object.keys(deleteContent).forEach(key => {
      delete result[key];
    });
    return result;
  }

  /**
   * Get collaboration analytics for a project
   */
  static async getCollaborationAnalytics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEdits: number;
    activeUsers: number;
    sectionActivity: Record<string, number>;
    conflictRate: number;
  }> {
    try {
      // Get edits within date range
      const editsQuery = query(
        collection(db, 'collaborative_edits'),
        where('projectId', '==', projectId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );
      
      const editsSnapshot = await getDocs(editsQuery);
      const totalEdits = editsSnapshot.size;
      
      // Count unique users
      const uniqueUsers = new Set(editsSnapshot.docs.map(doc => doc.data().userId));
      const activeUsers = uniqueUsers.size;
      
      // Section activity
      const sectionActivity: Record<string, number> = {};
      editsSnapshot.docs.forEach(doc => {
        const sectionId = doc.data().sectionId;
        sectionActivity[sectionId] = (sectionActivity[sectionId] || 0) + 1;
      });
      
      // Get conflicts within date range
      const conflictsQuery = query(
        collection(db, 'conflict_resolutions'),
        where('projectId', '==', projectId),
        where('resolvedAt', '>=', startDate),
        where('resolvedAt', '<=', endDate)
      );
      
      const conflictsSnapshot = await getDocs(conflictsQuery);
      const totalConflicts = conflictsSnapshot.size;
      const conflictRate = totalEdits > 0 ? (totalConflicts / totalEdits) * 100 : 0;
      
      return {
        totalEdits,
        activeUsers,
        sectionActivity,
        conflictRate
      };
    } catch (error) {
      console.error('Error getting collaboration analytics:', error);
      return {
        totalEdits: 0,
        activeUsers: 0,
        sectionActivity: {},
        conflictRate: 0
      };
    }
  }

  /**
   * Get recent activity for a project
   */
  static async getRecentActivity(
    projectId: string,
    maxResults: number = 50
  ): Promise<CollaborativeEdit[]> {
    try {
      const q = query(
        collection(db, 'collaborative_edits'),
        where('projectId', '==', projectId),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CollaborativeEdit));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Clear old presence records (older than 24 hours)
   */
  static async cleanupPresence(): Promise<void> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);
      
      const q = query(
        collection(db, 'presence'),
        where('lastSeen', '<', cutoffTime)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error cleaning up presence:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  static cleanup(): void {
    this.presenceListeners.forEach(unsubscribe => unsubscribe());
    this.editListeners.forEach(unsubscribe => unsubscribe());
    this.presenceListeners.clear();
    this.editListeners.clear();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
