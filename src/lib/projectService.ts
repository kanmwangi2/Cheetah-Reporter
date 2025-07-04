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
    // Get projects where user is the creator (temporarily without orderBy until index builds)
    const createdQuery = query(
      collection(db, this.COLLECTION),
      where('createdBy', '==', userId)
    )
    
    // Get projects where user is a collaborator (without orderBy to avoid index requirement)
    const collaboratorQuery = query(
      collection(db, this.COLLECTION),
      where(`collaborators.${userId}`, 'in', ['admin', 'editor', 'viewer'])
    )
    
    const [createdSnapshot, collaboratorSnapshot] = await Promise.all([
      getDocs(createdQuery),
      getDocs(collaboratorQuery)
    ])
    
    // Combine results and remove duplicates
    const projectMap = new Map<string, Project>()
    
    createdSnapshot.docs.forEach(doc => {
      projectMap.set(doc.id, convertFirestoreProject(doc))
    })
    
    collaboratorSnapshot.docs.forEach(doc => {
      if (!projectMap.has(doc.id)) {
        projectMap.set(doc.id, convertFirestoreProject(doc))
      }
    })
    
    // Sort by updatedAt in memory
    return Array.from(projectMap.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
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
    // Subscribe to projects where user is the creator (temporarily without orderBy until index builds)
    const createdQuery = query(
      collection(db, this.COLLECTION),
      where('createdBy', '==', userId)
    )
    
    // Subscribe to projects where user is a collaborator
    const collaboratorQuery = query(
      collection(db, this.COLLECTION),
      where(`collaborators.${userId}`, 'in', ['admin', 'editor', 'viewer'])
    )
    
    const projectMap = new Map<string, Project>()
    
    const updateProjects = () => {
      const projects = Array.from(projectMap.values()).sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      callback(projects)
    }
    
    const createdUnsubscribe = onSnapshot(createdQuery, (snapshot) => {
      // Update created projects
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          projectMap.set(change.doc.id, convertFirestoreProject(change.doc))
        } else if (change.type === 'removed') {
          projectMap.delete(change.doc.id)
        }
      })
      updateProjects()
    })
    
    const collaboratorUnsubscribe = onSnapshot(collaboratorQuery, (snapshot) => {
      // Update collaborator projects (but don't override if already exists from created query)
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          if (!projectMap.has(change.doc.id)) {
            projectMap.set(change.doc.id, convertFirestoreProject(change.doc))
          }
        } else if (change.type === 'removed') {
          const project = convertFirestoreProject(change.doc)
          // Only remove if user is not the creator
          if (project.createdBy !== userId) {
            projectMap.delete(change.doc.id)
          }
        }
      })
      updateProjects()
    })
    
    // Return a function that unsubscribes from both queries
    return () => {
      createdUnsubscribe()
      collaboratorUnsubscribe()
    }
  }

  // Check user access to project
  static async checkProjectAccess(projectId: string, userId: string): Promise<'admin' | 'editor' | 'viewer' | null> {
    const project = await this.getProject(projectId)
    if (!project) return null
    
    return project.collaborators[userId] || null
  }
}
