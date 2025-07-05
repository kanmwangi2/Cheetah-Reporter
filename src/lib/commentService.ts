import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDocs,
  limit,
  startAfter,
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import type { Comment, CommentData } from "../types/project";

export interface AdvancedComment extends Comment {
  parentId?: string; // For threading
  mentions?: string[]; // User IDs mentioned in the comment
  isResolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  reactions?: Record<string, string[]>; // emoji -> userIds[]
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  assignedTo?: string[];
  dueDate?: Date;
  tags?: string[];
  isPrivate?: boolean;
  threadCount?: number;
}

export interface CommentThread {
  parentComment: AdvancedComment;
  replies: AdvancedComment[];
  totalReplies: number;
  lastActivity: Date;
}

export interface CommentTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
}

const getCommentsCollection = (projectId: string) => {
  return collection(db, "projects", projectId, "comments");
};

const getCommentTemplatesCollection = () => {
  return collection(db, "comment_templates");
};

export const addComment = async (
  projectId: string, 
  commentData: CommentData & Partial<AdvancedComment>
): Promise<string> => {
  const commentsCol = getCommentsCollection(projectId);
  
  // Extract mentions from content
  const mentions = extractMentions(commentData.text);
  
  const docRef = await addDoc(commentsCol, {
    ...commentData,
    mentions,
    isDeleted: false,
    isResolved: false,
    reactions: {},
    priority: commentData.priority || 'normal',
    isPrivate: commentData.isPrivate || false,
    tags: commentData.tags || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Update parent comment's thread count if this is a reply
  if (commentData.parentId) {
    await updateThreadCount(projectId, commentData.parentId);
  }
  
  // Send notifications for mentions
  if (mentions.length > 0 && commentData.userId) {
    await sendMentionNotifications(projectId, docRef.id, mentions, commentData.userId);
  }
  
  return docRef.id;
};

export const subscribeToComments = (
  projectId: string,
  elementId: string | null,
  options: {
    includeResolved?: boolean;
    parentOnly?: boolean; // Only top-level comments, no replies
    orderBy?: 'createdAt' | 'updatedAt' | 'priority';
    limit?: number;
  } = {},
  callback: (comments: AdvancedComment[]) => void
) => {
  const commentsCol = getCommentsCollection(projectId);
  const whereConstraints = [
    where("isDeleted", "!=", true)
  ];
  
  if (elementId) {
    whereConstraints.push(where("elementId", "==", elementId));
  }
  
  if (!options.includeResolved) {
    whereConstraints.push(where("isResolved", "!=", true));
  }
  
  if (options.parentOnly) {
    whereConstraints.push(where("parentId", "==", null));
  }
  
  const orderByField = options.orderBy || 'createdAt';
  const orderByDirection = orderByField === 'priority' ? 'desc' : 'asc';
  
  const queryConstraints = [...whereConstraints, orderBy(orderByField, orderByDirection)];
  
  const q = options.limit 
    ? query(commentsCol, ...queryConstraints, limit(options.limit))
    : query(commentsCol, ...queryConstraints);

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as AdvancedComment));
    callback(comments);
  });

  return unsubscribe;
};

export const subscribeToCommentThread = (
  projectId: string,
  parentCommentId: string,
  callback: (thread: CommentThread) => void
) => {
  const commentsCol = getCommentsCollection(projectId);
  
  // Get parent comment
  const parentDoc = doc(commentsCol, parentCommentId);
  const parentUnsubscribe = onSnapshot(parentDoc, (doc) => {
    if (!doc.exists()) return;
    
    const parentComment = { id: doc.id, ...doc.data() } as AdvancedComment;
    
    // Get replies
    const repliesQuery = query(
      commentsCol,
      where("parentId", "==", parentCommentId),
      where("isDeleted", "!=", true),
      orderBy("createdAt", "asc")
    );
    
    const repliesUnsubscribe = onSnapshot(repliesQuery, (snapshot) => {
      const replies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AdvancedComment));
      
      const thread: CommentThread = {
        parentComment,
        replies,
        totalReplies: replies.length,
        lastActivity: replies.length > 0 
          ? new Date(Math.max(...replies.map(r => {
              const timestamp = r.updatedAt;
              return timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp 
                ? (timestamp as { toMillis: () => number }).toMillis() 
                : timestamp instanceof Date 
                  ? timestamp.getTime() 
                  : 0;
            })))
          : parentComment.updatedAt instanceof Date 
            ? parentComment.updatedAt 
            : new Date()
      };
      
      callback(thread);
    });
    
    // Return combined unsubscribe
    return () => {
      parentUnsubscribe();
      repliesUnsubscribe();
    };
  });
  
  return parentUnsubscribe;
};

export const updateComment = async (
  projectId: string, 
  commentId: string, 
  updates: Partial<AdvancedComment>
): Promise<void> => {
  const commentDoc = doc(db, "projects", projectId, "comments", commentId);
  
  // Update mentions if text changed
  if (updates.text) {
    updates.mentions = extractMentions(updates.text);
  }
  
  await updateDoc(commentDoc, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const resolveComment = async (
  projectId: string,
  commentId: string,
  resolvedBy: string
): Promise<void> => {
  const commentDoc = doc(db, "projects", projectId, "comments", commentId);
  await updateDoc(commentDoc, {
    isResolved: true,
    resolvedBy,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const addReaction = async (
  projectId: string,
  commentId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  const commentDoc = doc(db, "projects", projectId, "comments", commentId);
  
  // Get current reactions
  const comment = await getDocs(query(
    collection(db, "projects", projectId, "comments"),
    where("__name__", "==", commentId)
  ));
  
  if (comment.empty) return;
  
  const currentReactions = comment.docs[0].data().reactions || {};
  const userReactions = currentReactions[emoji] || [];
  
  if (!userReactions.includes(userId)) {
    userReactions.push(userId);
    currentReactions[emoji] = userReactions;
    
    await updateDoc(commentDoc, {
      reactions: currentReactions,
      updatedAt: serverTimestamp(),
    });
  }
};

export const removeReaction = async (
  projectId: string,
  commentId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  const commentDoc = doc(db, "projects", projectId, "comments", commentId);
  
  // Get current reactions
  const comment = await getDocs(query(
    collection(db, "projects", projectId, "comments"),
    where("__name__", "==", commentId)
  ));
  
  if (comment.empty) return;
  
  const currentReactions = comment.docs[0].data().reactions || {};
  const userReactions = currentReactions[emoji] || [];
  
  const updatedReactions = userReactions.filter((id: string) => id !== userId);
  if (updatedReactions.length === 0) {
    delete currentReactions[emoji];
  } else {
    currentReactions[emoji] = updatedReactions;
  }
  
  await updateDoc(commentDoc, {
    reactions: currentReactions,
    updatedAt: serverTimestamp(),
  });
};

export const getCommentsByUser = async (
  projectId: string,
  userId: string,
  lastDoc?: DocumentSnapshot,
  limitCount: number = 20
): Promise<{
  comments: AdvancedComment[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
}> => {
  const commentsCol = getCommentsCollection(projectId);
  const queryConstraints = [
    where("userId", "==", userId),
    where("isDeleted", "!=", true),
    orderBy("createdAt", "desc"),
    limit(limitCount + 1), // Get one extra to check if there are more
    ...(lastDoc ? [startAfter(lastDoc)] : [])
  ];
  
  const q = query(commentsCol, ...queryConstraints);
  const snapshot = await getDocs(q);
  
  const comments = snapshot.docs.slice(0, limitCount).map(doc => ({
    id: doc.id,
    ...doc.data()
  } as AdvancedComment));
  
  return {
    comments,
    lastDoc: snapshot.docs[limitCount - 1],
    hasMore: snapshot.docs.length > limitCount
  };
};

// Comment Templates
export const createCommentTemplate = async (
  template: Omit<CommentTemplate, 'id' | 'usageCount'>
): Promise<string> => {
  const templatesCol = getCommentTemplatesCollection();
  const docRef = await addDoc(templatesCol, {
    ...template,
    usageCount: 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getCommentTemplates = async (
  category?: string,
  isPublic?: boolean
): Promise<CommentTemplate[]> => {
  const templatesCol = getCommentTemplatesCollection();
  const constraints = [];
  
  if (category) {
    constraints.push(where("category", "==", category));
  }
  
  if (isPublic !== undefined) {
    constraints.push(where("isPublic", "==", isPublic));
  }
  
  const q = query(templatesCol, ...constraints, orderBy("usageCount", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CommentTemplate));
};

export const useCommentTemplate = async (templateId: string): Promise<void> => {
  const templateDoc = doc(getCommentTemplatesCollection(), templateId);
  await updateDoc(templateDoc, {
    usageCount: (await getDocs(query(
      getCommentTemplatesCollection(),
      where("__name__", "==", templateId)
    ))).docs[0]?.data()?.usageCount + 1 || 1
  });
};

export const deleteComment = async (projectId: string, commentId: string): Promise<void> => {
  const commentDoc = doc(db, "projects", projectId, "comments", commentId);
  await updateDoc(commentDoc, {
    text: "[This comment has been deleted]",
    isDeleted: true,
    updatedAt: serverTimestamp(),
  });
};

// Helper functions
function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

async function updateThreadCount(projectId: string, parentId: string): Promise<void> {
  const parentDoc = doc(db, "projects", projectId, "comments", parentId);
  const repliesQuery = query(
    getCommentsCollection(projectId),
    where("parentId", "==", parentId),
    where("isDeleted", "!=", true)
  );
  
  const repliesSnapshot = await getDocs(repliesQuery);
  await updateDoc(parentDoc, {
    threadCount: repliesSnapshot.size,
    updatedAt: serverTimestamp(),
  });
}

async function sendMentionNotifications(
  projectId: string,
  commentId: string,
  mentions: string[],
  authorId: string
): Promise<void> {
  // This would integrate with a notification service
  // For now, just log the mentions
  console.log('Mentions in comment', commentId, ':', mentions, 'by', authorId, 'in project', projectId);
}
