import { collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { Comment, CommentData } from "../types/project";

const getCommentsCollection = (projectId: string) => {
  return collection(db, "projects", projectId, "comments");
};

export const addComment = async (projectId: string, commentData: CommentData): Promise<string> => {
  const commentsCol = getCommentsCollection(projectId);
  const docRef = await addDoc(commentsCol, {
    ...commentData,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const subscribeToComments = (
  projectId: string,
  elementId: string | null, // null to get all comments for the project
  callback: (comments: Comment[]) => void
) => {
  const commentsCol = getCommentsCollection(projectId);
  let q;
  if (elementId) {
    q = query(commentsCol, where("elementId", "==", elementId), where("isDeleted", "!=", true), orderBy("createdAt", "asc"));
  } else {
    q = query(commentsCol, where("isDeleted", "!=", true), orderBy("createdAt", "asc"));
  }

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Comment));
    callback(comments);
  });

  return unsubscribe;
};

export const updateComment = async (projectId: string, commentId: string, updates: Partial<CommentData>): Promise<void> => {
  const commentDoc = doc(db, "projects", projectId, "comments", commentId);
  await updateDoc(commentDoc, {
    ...updates,
    updatedAt: serverTimestamp(),
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
