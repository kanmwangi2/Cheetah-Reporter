/**
 * Review and Approval Workflow Service
 * Handles multi-stage review processes, approval routing, and electronic signatures
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface WorkflowStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  type: 'review' | 'approval' | 'notification' | 'automation';
  requiredApprovers: number; // Minimum number of approvers needed
  assignedUsers: string[]; // User IDs who can approve at this stage
  autoAssign?: boolean; // Auto-assign based on project collaborators
  allowParallel: boolean; // Allow multiple users to review simultaneously
  requiredDocuments?: string[]; // Required document IDs for this stage
  conditions?: WorkflowCondition[]; // Conditions that must be met
  timeLimit?: number; // Time limit in hours
  escalationRules?: EscalationRule[];
}

export interface WorkflowCondition {
  type: 'field_value' | 'user_role' | 'document_status' | 'custom';
  field?: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number | boolean;
  description?: string;
}

export interface EscalationRule {
  trigger: 'time_exceeded' | 'rejection' | 'no_response';
  action: 'reassign' | 'notify' | 'skip_stage' | 'escalate_to_manager';
  targetUsers?: string[];
  delay?: number; // Hours to wait before escalation
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial_statements' | 'adjustments' | 'disclosures' | 'custom';
  stages: WorkflowStage[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Timestamp;
  usageCount: number;
  tags: string[];
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  projectId: string;
  documentId?: string; // ID of document being reviewed (optional)
  documentType?: string; // Type of document (statement, note, etc.)
  title: string;
  description?: string;
  currentStage: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  initiatedBy: string;
  initiatedAt: Timestamp;
  completedAt?: Timestamp;
  stages: WorkflowStageInstance[];
  metadata: {
    totalStages: number;
    completedStages: number;
    estimatedCompletion?: Date;
    actualCompletion?: Date;
    rejectionReason?: string;
  };
  notifications: WorkflowNotification[];
  auditLog: WorkflowAuditEntry[];
}

export interface WorkflowStageInstance {
  stageId: string;
  stageName: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';
  assignedTo: string[];
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  approvals: WorkflowApproval[];
  comments: string[]; // Comment IDs
  requiredApprovals: number;
  receivedApprovals: number;
  timeLimit?: number;
  escalated: boolean;
}

export interface WorkflowApproval {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  decision: 'approved' | 'rejected' | 'changes_requested';
  timestamp: Timestamp;
  comments?: string;
  signature?: ElectronicSignature;
  ipAddress?: string;
  userAgent?: string;
}

export interface ElectronicSignature {
  signerName: string;
  signerEmail: string;
  signatureMethod: 'typed' | 'drawn' | 'certificate';
  signatureData: string; // Base64 encoded signature or certificate data
  timestamp: Timestamp;
  ipAddress: string;
  documentHash: string; // Hash of the document at time of signing
  isValid: boolean;
}

export interface WorkflowNotification {
  id: string;
  type: 'assignment' | 'reminder' | 'escalation' | 'completion' | 'rejection';
  userId: string;
  title: string;
  message: string;
  read: boolean;
  sentAt: Timestamp;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface WorkflowAuditEntry {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  action: 'created' | 'stage_completed' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  details: string;
  stageId?: string;
  metadata?: Record<string, unknown>;
}

export class WorkflowService {
  /**
   * Create a new workflow template
   */
  static async createWorkflowTemplate(
    template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'usageCount'>
  ): Promise<string> {
    const templatesCol = collection(db, 'workflow_templates');
    const docRef = await addDoc(templatesCol, {
      ...template,
      createdAt: serverTimestamp(),
      usageCount: 0
    });
    return docRef.id;
  }

  /**
   * Get workflow templates
   */
  static async getWorkflowTemplates(
    category?: string,
    isPublic?: boolean
  ): Promise<WorkflowTemplate[]> {
    const templatesCol = collection(db, 'workflow_templates');
    const constraints = [];

    if (category) {
      constraints.push(where('category', '==', category));
    }

    if (isPublic !== undefined) {
      constraints.push(where('isPublic', '==', isPublic));
    }

    const q = query(templatesCol, ...constraints, orderBy('usageCount', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WorkflowTemplate));
  }

  /**
   * Start a new workflow instance
   */
  static async startWorkflow(
    templateId: string,
    projectId: string,
    initiatedBy: string,
    options: {
      title: string;
      description?: string;
      documentId?: string;
      documentType?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      customAssignments?: Record<string, string[]>; // stageId -> userIds
    }
  ): Promise<string> {
    // Get template
    const templateDoc = await getDocs(query(
      collection(db, 'workflow_templates'),
      where('__name__', '==', templateId)
    ));

    if (templateDoc.empty) {
      throw new Error('Workflow template not found');
    }

    const template = templateDoc.docs[0].data() as WorkflowTemplate;

    // Create workflow instance
    const stageInstances: WorkflowStageInstance[] = template.stages.map(stage => ({
      stageId: stage.id,
      stageName: stage.name,
      status: 'pending',
      assignedTo: options.customAssignments?.[stage.id] || stage.assignedUsers,
      approvals: [],
      comments: [],
      requiredApprovals: stage.requiredApprovers,
      receivedApprovals: 0,
      timeLimit: stage.timeLimit,
      escalated: false
    }));

    // Set first stage to in_progress
    if (stageInstances.length > 0) {
      stageInstances[0].status = 'in_progress';
      stageInstances[0].startedAt = serverTimestamp() as Timestamp;
    }

    const workflowInstance: Omit<WorkflowInstance, 'id'> = {
      templateId,
      projectId,
      documentId: options.documentId,
      documentType: options.documentType,
      title: options.title,
      description: options.description,
      currentStage: 0,
      status: 'in_progress',
      priority: options.priority || 'normal',
      initiatedBy,
      initiatedAt: serverTimestamp() as Timestamp,
      stages: stageInstances,
      metadata: {
        totalStages: template.stages.length,
        completedStages: 0
      },
      notifications: [],
      auditLog: [{
        id: crypto.randomUUID(),
        timestamp: serverTimestamp() as Timestamp,
        userId: initiatedBy,
        userName: 'System', // This would be resolved from user data
        action: 'created',
        details: `Workflow "${options.title}" initiated`
      }]
    };

    const instancesCol = collection(db, 'workflow_instances');
    const docRef = await addDoc(instancesCol, workflowInstance);

    // Send notifications to first stage assignees
    await this.sendStageNotifications(docRef.id, 0, 'assignment');

    // Update template usage count
    await updateDoc(doc(db, 'workflow_templates', templateId), {
      usageCount: template.usageCount + 1
    });

    return docRef.id;
  }

  /**
   * Submit approval/rejection for a workflow stage
   */
  static async submitApproval(
    workflowId: string,
    stageIndex: number,
    userId: string,
    userName: string,
    userEmail: string,
    decision: 'approved' | 'rejected' | 'changes_requested',
    comments?: string,
    signature?: Omit<ElectronicSignature, 'timestamp' | 'isValid'>
  ): Promise<void> {
    const instanceDoc = doc(db, 'workflow_instances', workflowId);
    
    // Get current workflow
    const workflowSnapshot = await getDocs(query(
      collection(db, 'workflow_instances'),
      where('__name__', '==', workflowId)
    ));

    if (workflowSnapshot.empty) {
      throw new Error('Workflow not found');
    }

    const workflow = workflowSnapshot.docs[0].data() as WorkflowInstance;
    const stage = workflow.stages[stageIndex];

    if (!stage.assignedTo.includes(userId)) {
      throw new Error('User not authorized to approve this stage');
    }

    // Create approval record
    const approval: WorkflowApproval = {
      id: crypto.randomUUID(),
      userId,
      userName,
      userEmail,
      decision,
      timestamp: serverTimestamp() as Timestamp,
      comments,
      signature: signature ? {
        ...signature,
        timestamp: serverTimestamp() as Timestamp,
        isValid: true
      } : undefined,
      ipAddress: 'unknown', // This would be captured from the request
      userAgent: navigator.userAgent
    };

    // Update stage
    stage.approvals.push(approval);
    stage.receivedApprovals += 1;

    // Check if stage is complete
    if (decision === 'rejected') {
      stage.status = 'rejected';
      stage.completedAt = serverTimestamp() as Timestamp;
      workflow.status = 'rejected';
      workflow.metadata.rejectionReason = comments;
    } else if (stage.receivedApprovals >= stage.requiredApprovals) {
      stage.status = 'approved';
      stage.completedAt = serverTimestamp() as Timestamp;
      workflow.metadata.completedStages += 1;

      // Move to next stage or complete workflow
      if (stageIndex < workflow.stages.length - 1) {
        workflow.currentStage += 1;
        workflow.stages[workflow.currentStage].status = 'in_progress';
        workflow.stages[workflow.currentStage].startedAt = serverTimestamp() as Timestamp;
        
        // Send notifications for next stage
        await this.sendStageNotifications(workflowId, workflow.currentStage, 'assignment');
      } else {
        // Workflow complete
        workflow.status = 'approved';
        workflow.completedAt = serverTimestamp() as Timestamp;
        workflow.metadata.actualCompletion = new Date();
      }
    }

    // Add audit log entry
    workflow.auditLog.push({
      id: crypto.randomUUID(),
      timestamp: serverTimestamp() as Timestamp,
      userId,
      userName,
      action: decision === 'approved' ? 'approved' : 'rejected',
      details: `Stage "${stage.stageName}" ${decision}${comments ? `: ${comments}` : ''}`,
      stageId: stage.stageId
    });

    // Update workflow
    await updateDoc(instanceDoc, {
      stages: workflow.stages,
      status: workflow.status,
      currentStage: workflow.currentStage,
      completedAt: workflow.completedAt,
      metadata: workflow.metadata,
      auditLog: workflow.auditLog
    });
  }

  /**
   * Get workflow instances for a project
   */
  static subscribeToProjectWorkflows(
    projectId: string,
    callback: (workflows: WorkflowInstance[]) => void
  ): () => void {
    const q = query(
      collection(db, 'workflow_instances'),
      where('projectId', '==', projectId),
      orderBy('initiatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const workflows = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkflowInstance));
      callback(workflows);
    });
  }

  /**
   * Get user's pending approvals
   */
  static async getUserPendingApprovals(userId: string): Promise<{
    workflow: WorkflowInstance;
    stageIndex: number;
    stage: WorkflowStageInstance;
  }[]> {
    // This would need a more complex query in a real implementation
    // For now, we'll get all in-progress workflows and filter
    const q = query(
      collection(db, 'workflow_instances'),
      where('status', 'in', ['in_progress', 'pending'])
    );

    const snapshot = await getDocs(q);
    const pendingApprovals: {
      workflow: WorkflowInstance;
      stageIndex: number;
      stage: WorkflowStageInstance;
    }[] = [];

    snapshot.docs.forEach(doc => {
      const workflow = { id: doc.id, ...doc.data() } as WorkflowInstance;
      const currentStage = workflow.stages[workflow.currentStage];
      
      if (currentStage && 
          currentStage.assignedTo.includes(userId) && 
          currentStage.status === 'in_progress' &&
          !currentStage.approvals.some(approval => approval.userId === userId)) {
        pendingApprovals.push({
          workflow,
          stageIndex: workflow.currentStage,
          stage: currentStage
        });
      }
    });

    return pendingApprovals;
  }

  /**
   * Cancel a workflow
   */
  static async cancelWorkflow(
    workflowId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const instanceDoc = doc(db, 'workflow_instances', workflowId);
    
    await updateDoc(instanceDoc, {
      status: 'cancelled',
      completedAt: serverTimestamp(),
      'metadata.rejectionReason': reason,
      auditLog: [{
        id: crypto.randomUUID(),
        timestamp: serverTimestamp(),
        userId,
        userName: 'System',
        action: 'cancelled',
        details: `Workflow cancelled${reason ? `: ${reason}` : ''}`
      }]
    });
  }

  /**
   * Send notifications for a workflow stage
   */
  private static async sendStageNotifications(
    workflowId: string,
    stageIndex: number,
    type: 'assignment' | 'reminder' | 'escalation'
  ): Promise<void> {
    // This would integrate with a notification service
    // For now, just log the notification
    console.log(`Sending ${type} notifications for workflow ${workflowId}, stage ${stageIndex}`);
  }

  /**
   * Process workflow escalations (called by a scheduled job)
   */
  static async processEscalations(): Promise<void> {
    const now = new Date();
    const q = query(
      collection(db, 'workflow_instances'),
      where('status', '==', 'in_progress')
    );

    const snapshot = await getDocs(q);
    
    for (const docSnapshot of snapshot.docs) {
      const workflow = { id: docSnapshot.id, ...docSnapshot.data() } as WorkflowInstance;
      const currentStage = workflow.stages[workflow.currentStage];

      if (currentStage && 
          currentStage.timeLimit && 
          currentStage.startedAt &&
          !currentStage.escalated) {
        
        const stageStartTime = currentStage.startedAt instanceof Date 
          ? currentStage.startedAt 
          : new Date(currentStage.startedAt.seconds * 1000);
        
        const timeElapsed = (now.getTime() - stageStartTime.getTime()) / (1000 * 60 * 60); // Hours
        
        if (timeElapsed > currentStage.timeLimit) {
          // Escalate
          currentStage.escalated = true;
          
          workflow.auditLog.push({
            id: crypto.randomUUID(),
            timestamp: serverTimestamp() as Timestamp,
            userId: 'system',
            userName: 'System',
            action: 'escalated',
            details: `Stage "${currentStage.stageName}" escalated due to time limit exceeded`,
            stageId: currentStage.stageId
          });

          await updateDoc(doc(db, 'workflow_instances', workflow.id), {
            stages: workflow.stages,
            auditLog: workflow.auditLog
          });

          // Send escalation notifications
          await this.sendStageNotifications(workflow.id, workflow.currentStage, 'escalation');
        }
      }
    }
  }

  /**
   * Delete a workflow template
   */
  static async deleteWorkflowTemplate(templateId: string): Promise<void> {
    const templateDoc = doc(db, 'workflow_templates', templateId);
    await deleteDoc(templateDoc);
  }

  /**
   * Get workflow analytics
   */
  static async getWorkflowAnalytics(): Promise<{
    totalWorkflows: number;
    completedWorkflows: number;
    averageCompletionTime: number; // in hours
    rejectionRate: number;
    stageAnalytics: Record<string, {
      averageTime: number;
      rejectionRate: number;
      escalationRate: number;
    }>;
  }> {
    // This would implement complex analytics queries
    // For now, return mock data
    return {
      totalWorkflows: 0,
      completedWorkflows: 0,
      averageCompletionTime: 0,
      rejectionRate: 0,
      stageAnalytics: {}
    };
  }
}
