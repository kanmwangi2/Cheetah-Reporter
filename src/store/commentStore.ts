import { create } from 'zustand';
import {
  subscribeToComments,
  addComment as addCommentService,
  updateComment as updateCommentService,
  deleteComment as deleteCommentService,
} from '../lib/commentService';
import type { Comment, CommentData } from '../types/project';
import type { StateCreator } from 'zustand';

interface CommentStoreState {
  comments: Comment[];
  activeThreadId: string | null;
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  subscribe: (projectId: string, elementId: string | null) => void;
  addComment: (projectId: string, commentData: CommentData) => Promise<void>;
  updateComment: (projectId: string, commentId: string, updates: Partial<CommentData>) => Promise<void>;
  deleteComment: (projectId: string, commentId: string) => Promise<void>;
  setActiveThreadId: (threadId: string | null) => void;
  cleanup: () => void;
}

const commentStoreCreator: StateCreator<CommentStoreState> = (set, get) => ({
  comments: [],
  activeThreadId: null,
  isLoading: false,
  error: null,
  unsubscribe: null,

  subscribe: (projectId: string, elementId: string | null) => {
    get().cleanup(); // Unsubscribe from any existing listener

    set({ isLoading: true, error: null });
    const unsubscribe = subscribeToComments(
      projectId, 
      elementId, 
      {}, // options - using defaults
      (comments: Comment[]) => {
        set({ comments, isLoading: false });
      }
    );
    set({ unsubscribe });
  },

  addComment: async (projectId: string, commentData: CommentData) => {
    try {
      await addCommentService(projectId, commentData);
      // State will be updated by the real-time listener
    } catch (error) {
      console.error("Error adding comment:", error);
      set({ error: 'Failed to add comment.' });
    }
  },

  updateComment: async (projectId: string, commentId: string, updates: Partial<CommentData>) => {
    try {
      await updateCommentService(projectId, commentId, updates);
    } catch (error) {
      console.error("Error updating comment:", error);
      set({ error: 'Failed to update comment.' });
    }
  },

  deleteComment: async (projectId: string, commentId: string) => {
    try {
      await deleteCommentService(projectId, commentId);
    } catch (error) {
      console.error("Error deleting comment:", error);
      set({ error: 'Failed to delete comment.' });
    }
  },

  setActiveThreadId: (threadId: string | null) => {
    set({ activeThreadId: threadId });
  },

  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    set({ comments: [], unsubscribe: null, isLoading: false, activeThreadId: null });
  },
});

export const useCommentStore = create<CommentStoreState>(commentStoreCreator);
