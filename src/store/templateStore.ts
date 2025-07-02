import { create } from 'zustand';
import { 
  getTemplates as fetchTemplates,
  createTemplateFromProject as createTemplate,
  deleteTemplate as removeTemplate,
} from '../lib/templateService';
import type { ReportTemplate, Project } from '../types/project';

interface TemplateState {
  templates: ReportTemplate[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  createTemplateFromProject: (project: Project, name: string, description?: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  loading: false,
  error: null,
  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const templates = await fetchTemplates();
      set({ templates, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  createTemplateFromProject: async (project, name, description) => {
    set({ loading: true, error: null });
    try {
      await createTemplate(project, name, description);
      // After creating, refresh the list
      const templates = await fetchTemplates();
      set({ templates, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  deleteTemplate: async (templateId: string) => {
    set({ loading: true, error: null });
    try {
      await removeTemplate(templateId);
      // After deleting, refresh the list by filtering out the deleted one
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== templateId),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));
