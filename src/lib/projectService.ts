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
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import type { PeriodData, Project } from '../types/project'

// Convert Firestore data to Project
const convertFirestoreProject = (doc: any): Project => {
  const data = doc.data()
  return {
    ...data,
    id: doc.id,
    periods: data.periods?.map((p: any) => ({
      ...p,
      reportingDate: p.reportingDate?.toDate() || new Date(),
    })) || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  }
}

// Convert Project to Firestore data
const convertProjectToFirestore = (project: Partial<Omit<Project, 'id'>>) => {
  const data: any = { ...project };

  if (data.periods) {
    data.periods = data.periods.map((p: PeriodData) => ({
      ...p,
      reportingDate: Timestamp.fromDate(p.reportingDate),
    }));
  }

  if (project.createdAt) {
    data.createdAt = Timestamp.fromDate(project.createdAt);
  }
  
  data.updatedAt = serverTimestamp();

  return data;
}

export class ProjectService {
  static readonly COLLECTION = 'projects'

  // Create a new project
  static async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
    const project = {
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      collaborators: {
        [userId]: 'admin' as const
      }
    }

    const docRef = await addDoc(collection(db, this.COLLECTION), convertProjectToFirestore(project))
    return docRef.id
  }

  // Get user's projects
  static async getUserProjects(userId: string): Promise<Project[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where(`collaborators.${userId}`, 'in', ['admin', 'editor', 'viewer']),
      orderBy('updatedAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(convertFirestoreProject)
  }

  // Get a specific project
  static async getProject(projectId: string): Promise<Project | null> {
    const docRef = doc(db, this.COLLECTION, projectId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return convertFirestoreProject(docSnap)
    }
    return null
  }

  // Update a project
  static async updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) {
    const docRef = doc(db, this.COLLECTION, projectId)
    const updateData = convertProjectToFirestore(updates);
    
    await updateDoc(docRef, updateData)
  }

  // Delete a project
  static async deleteProject(projectId: string) {
    const docRef = doc(db, this.COLLECTION, projectId)
    await deleteDoc(docRef)
  }

  // Add collaborator to project
  static async addCollaborator(projectId: string, userId: string, role: 'admin' | 'editor' | 'viewer') {
    const docRef = doc(db, this.COLLECTION, projectId)
    await updateDoc(docRef, {
      [`collaborators.${userId}`]: role,
      updatedAt: serverTimestamp()
    })
  }

  // Remove collaborator from project
  static async removeCollaborator(projectId: string, userId: string) {
    const docRef = doc(db, this.COLLECTION, projectId)
    await updateDoc(docRef, {
      [`collaborators.${userId}`]: null,
      updatedAt: serverTimestamp()
    })
  }

  // Subscribe to project changes
  static subscribeToProject(projectId: string, callback: (project: Project | null) => void) {
    const docRef = doc(db, this.COLLECTION, projectId)
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(convertFirestoreProject(doc))
      } else {
        callback(null)
      }
    })
  }

  // Subscribe to user's projects
  static subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void) {
    const q = query(
      collection(db, this.COLLECTION),
      where(`collaborators.${userId}`, 'in', ['admin', 'editor', 'viewer']),
      orderBy('updatedAt', 'desc')
    )
    
    return onSnapshot(q, (querySnapshot) => {
      const projects = querySnapshot.docs.map(convertFirestoreProject)
      callback(projects)
    })
  }

  // Check user access to project
  static async checkProjectAccess(projectId: string, userId: string): Promise<'admin' | 'editor' | 'viewer' | null> {
    const project = await this.getProject(projectId)
    if (!project) return null
    
    return project.collaborators[userId] || null
  }
}
