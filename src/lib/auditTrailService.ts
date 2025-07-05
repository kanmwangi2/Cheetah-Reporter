import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export interface AuditLog {
  id?: string;
  timestamp: Date | object; // Can be Firestore serverTimestamp or Date
  userId: string;
  userEmail: string; // Store user email for easier display
  action: string;
  details: object;
}

const getAuditTrailCollection = (projectId: string) => {
  return collection(db, "projects", projectId, "audit_trail");
};

export const logAuditEvent = async (projectId: string, userId: string, userEmail: string, action: string, details: object = {}) => {
  if (!projectId || !userId) {
    console.error("Project ID and User ID are required to log an audit event.");
    return;
  }
  try {
    await addDoc(getAuditTrailCollection(projectId), {
      timestamp: serverTimestamp(),
      userId,
      userEmail,
      action,
      details,
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
};

export const subscribeToAuditTrail = (projectId: string, callback: (logs: AuditLog[]) => void) => {
  const q = query(getAuditTrailCollection(projectId), orderBy("timestamp", "desc"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const logs: AuditLog[] = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as AuditLog);
    });
    callback(logs);
  });

  return unsubscribe;
};
