import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  WriteBatch,
  DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Project, ReportTemplate, ReportTemplateData } from '../types/project';
import { useAuthStore } from '../store/authStore';

const templatesCollection = collection(db, 'templates');

/**
 * Creates a new report template from an existing project.
 * @param project - The project to create the template from.
 * @param templateName - The name for the new template.
 * @param templateDescription - An optional description for the template.
 * @returns The ID of the newly created template.
 */
export const createTemplateFromProject = async (
  project: Project,
  templateName: string,
  templateDescription?: string
): Promise<string> => {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('User not authenticated');

  const templateData: ReportTemplateData = {
    name: templateName,
    description: templateDescription || '',
    createdBy: user.uid,
    createdAt: serverTimestamp() as unknown as Date | { seconds: number; nanoseconds: number },
    ifrsStandard: project.ifrsStandard,
    // Convert mappings from complex object to simple string mapping
    trialBalanceMappings: project.periods[0]?.trialBalance?.mappings 
      ? Object.fromEntries(
          Object.entries(project.periods[0].trialBalance.mappings).map(([accountId, mapping]) => [
            accountId, 
            `${mapping.statement}:${mapping.lineItem}`
          ])
        )
      : {},
    notesStructure: project.notes || {},
    // Add other structural elements here
  };

  const docRef = await addDoc(templatesCollection, templateData);
  return docRef.id;
};

/**
 * Fetches all available report templates for the current user.
 * @returns A list of report templates.
 */
export const getTemplates = async (): Promise<ReportTemplate[]> => {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('User not authenticated');

  // For now, fetches templates created by the user.
  // This could be expanded to include organization-level templates.
  const q = query(templatesCollection, where('createdBy', '==', user.uid));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as ReportTemplate)
  );
};

/**
 * Fetches a single template by its ID.
 * @param templateId - The ID of the template to fetch.
 * @returns The report template data.
 */
export const getTemplateById = async (
  templateId: string
): Promise<ReportTemplate | null> => {
  const docRef = doc(db, 'templates', templateId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ReportTemplate;
  } else {
    return null;
  }
};

/**
 * Deletes a template.
 * @param templateId - The ID of the template to delete.
 */
export const deleteTemplate = async (templateId: string): Promise<void> => {
  const docRef = doc(db, 'templates', templateId);
  await deleteDoc(docRef);
};

/**
 * Applies a template's structure to a new project document.
 * @param batch - The Firestore write batch to add the operations to.
 * @param projectRef - The document reference of the new project.
 * @param template - The template to apply.
 */
export const applyTemplateToProject = (
  batch: WriteBatch,
  projectRef: DocumentReference,
  template: ReportTemplate
) => {
  batch.update(projectRef, {
    ifrsStandard: template.ifrsStandard,
    notes: template.notesStructure,
  });
};
