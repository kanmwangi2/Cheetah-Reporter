import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Project, PeriodData, TrialBalanceData, TrialBalanceAccount } from '../types/project';
import type { AuditLog } from '../lib/auditTrailService';
import { ProjectService } from '../lib/projectService';
import { logAuditEvent } from '../lib/auditTrailService';
import { useAuthStore } from './authStore';
import { getTemplateById } from '../lib/templateService';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  activePeriodId: string | null;
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setActivePeriod: (periodId: string) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
  createProject: (
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'collaborators' | 'notes' | 'periods'>,
    initialPeriodData: Omit<PeriodData, 'id' | 'mappedTrialBalance'>,
    templateId?: string
  ) => Promise<boolean>;
  loadUserProjects: (userId: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Project>, userId: string, userEmail: string) => Promise<void>;
  deleteProject: (projectId: string, userId: string, userEmail: string) => Promise<void>;
  addPeriod: (projectId: string, periodData: Omit<PeriodData, 'id'>, userId: string, userEmail: string) => Promise<void>;
  updatePeriodTrialBalance: (periodId: string, trialBalanceData: TrialBalanceData) => Promise<void>;
  updateTrialBalance: (periodId: string, trialBalance: TrialBalanceData) => Promise<void>;
  getTrialBalance: (periodId: string) => TrialBalanceData | null;
  getFinalTrialBalanceAccounts: (periodId: string) => TrialBalanceAccount[];
  subscribeToUserProjects: (userId: string) => () => void;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      projects: [],
      currentProject: null,
      activePeriodId: null,
      auditLogs: [],
      loading: false,
      error: null,
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => {
        let activePeriodId: string | null = null;
        if (project && project.periods && project.periods.length > 0) {
          // Default to the latest period
          activePeriodId = project.periods.sort((a, b) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime())[0].id;
        }
        set({ currentProject: project, activePeriodId });
      },
      setActivePeriod: (periodId) => set({ activePeriodId: periodId }),
      setAuditLogs: (logs) => set({ auditLogs: logs }),
      createProject: async (projectData, initialPeriodData, templateId) => {
        const { user } = useAuthStore.getState();
        if (!user) {
          set({ error: 'User not authenticated', loading: false });
          return false;
        }

        set({ loading: true, error: null });
        try {
          let templateData: Partial<Project> = {};
          let templateMappings = {};

          if (templateId) {
            const template = await getTemplateById(templateId);
            if (template) {
              templateData = {
                ifrsStandard: template.ifrsStandard,
                notes: (template.notesStructure as { [noteId: string]: { title: string; content: string; order: number } }) || {},
              };
              templateMappings = template.trialBalanceMappings || {};
            }
          }

          const newPeriod: PeriodData = {
            id: initialPeriodData.reportingDate.toISOString().split('T')[0], // e.g. 2023-12-31
            ...initialPeriodData,
            trialBalance: {
              importDate: new Date(),
              importedBy: user.uid,
              accounts: [],
              mappings: templateMappings,
              mappedTrialBalance: {
                assets: {},
                liabilities: {},
                equity: {},
                revenue: {},
                expenses: {}
              },
              version: 1,
              hasAdjustments: false,
              lastModified: new Date(),
              editHistory: []
            },
          };

          const fullProjectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
            ...projectData,
            createdBy: user.uid,
            collaborators: { [user.uid]: 'admin' },
            notes: templateData.notes || {},
            periods: [newPeriod],
          };

          const projectId = await ProjectService.createProject(fullProjectData, user.uid);
          const newProject = await ProjectService.getProject(projectId);

          if (newProject) {
            set((state) => ({
              projects: [...state.projects, newProject],
            }));
            get().setCurrentProject(newProject);
            return true;
          }
        } catch (error: unknown) {
          set({ error: (error as Error).message, loading: false });
          return false;
        }
      },

      addPeriod: async (projectId, periodData, userId, userEmail) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({ loading: true, error: null });
        try {
            const newPeriod: PeriodData = {
                id: periodData.reportingDate.toISOString().split('T')[0],
                ...periodData,
            };

            const updatedPeriods = [...currentProject.periods, newPeriod];
            await ProjectService.updateProject(projectId, { periods: updatedPeriods });
            
            get().loadProject(projectId); // Reload project to get the latest state
            await logAuditEvent(projectId, userId, userEmail, 'addPeriod', { periodId: newPeriod.id });

        } catch (error: unknown) {
            set({ error: (error as Error).message, loading: false });
        }
    },

    updatePeriodTrialBalance: async (periodId: string, trialBalanceData: TrialBalanceData) => {
        const { currentProject, setCurrentProject } = get();
        const { user } = useAuthStore.getState();

        if (!currentProject || !user) {
            console.error("No current project or user");
            return;
        }

        set({ loading: true, error: null });
        try {
            const updatedPeriods = currentProject.periods.map(p => 
                p.id === periodId ? { ...p, trialBalance: trialBalanceData, mappedTrialBalance: trialBalanceData.mappedTrialBalance } : p
            );

            // Update the project with new periods
            const updatedProject = { ...currentProject, periods: updatedPeriods };
            
            await ProjectService.updateProject(currentProject.id, { periods: updatedPeriods });
            await logAuditEvent(currentProject.id, user.uid, user.email || '', 'updateTrialBalance', { periodId });
            
            // Update the current project state immediately without reloading
            setCurrentProject(updatedProject);
            set({ loading: false });

        } catch (error: unknown) {
            console.error('Failed to update trial balance:', error);
            set({ error: (error as Error).message, loading: false });
        }
    },

    updateTrialBalance: async (periodId: string, trialBalance: TrialBalanceData) => {
        const { currentProject, setCurrentProject } = get();
        const { user } = useAuthStore.getState();

        if (!currentProject || !user) {
            console.error("No current project or user");
            return;
        }

        set({ loading: true, error: null });
        try {
            const updatedPeriods = currentProject.periods.map(p => 
                p.id === periodId ? { 
                    ...p, 
                    trialBalance
                } : p
            );

            const updatedProject = { ...currentProject, periods: updatedPeriods };
            
            await ProjectService.updateProject(currentProject.id, { periods: updatedPeriods });
            await logAuditEvent(currentProject.id, user.uid, user.email || '', 'updateTrialBalance', { 
                periodId, 
                version: trialBalance.version 
            });
            
            setCurrentProject(updatedProject);
            set({ loading: false });

        } catch (error: unknown) {
            console.error('Failed to update trial balance:', error);
            set({ error: (error as Error).message, loading: false });
        }
    },

    getTrialBalance: (periodId: string): TrialBalanceData | null => {
        const { currentProject } = get();
        if (!currentProject) return null;
        
        const period = currentProject.periods.find(p => p.id === periodId);
        return period?.trialBalance || null;
    },

    getFinalTrialBalanceAccounts: (periodId: string): TrialBalanceAccount[] => {
        const { currentProject } = get();
        if (!currentProject) return [];
        
        const period = currentProject.periods.find(p => p.id === periodId);
        const trialBalance = period?.trialBalance;
        
        if (trialBalance) {
            // Return accounts with final amounts calculated
            return trialBalance.accounts.map(account => ({
                ...account,
                // Ensure final amounts are calculated
                finalDebit: account.originalDebit + account.adjustmentDebit,
                finalCredit: account.originalCredit + account.adjustmentCredit
            }));
        }
        
        return [];
    },

    loadUserProjects: async (userId) => {
      set({ loading: true, error: null });
      try {
        const projects = await ProjectService.getUserProjects(userId);
        set({ projects, loading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        set({ error: `Error loading projects: ${errorMessage}`, loading: false });
      }
    },
    loadProject: async (projectId) => {
      set({ loading: true, error: null });
      try {
        const project = await ProjectService.getProject(projectId);
        get().setCurrentProject(project);
        set({ loading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        set({ error: `Error loading project: ${errorMessage}`, loading: false });
      } 
    },
    updateProject: async (projectId, updates, userId, userEmail) => {
      set({ loading: true, error: null });
      try {
        await ProjectService.updateProject(projectId, updates);
        const updatedProject = await ProjectService.getProject(projectId);
        if (updatedProject) {
          const projects = get().projects.map(p =>
            p.id === projectId ? updatedProject : p
          );
          set({ projects, currentProject: updatedProject, loading: false });
          // If the current project is the one being updated, refresh it
          if (get().currentProject?.id === projectId) {
              get().setCurrentProject(updatedProject);
          }
          await logAuditEvent(projectId, userId, userEmail, 'Project Updated', updates);
        }
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          set({ error: `Error updating project: ${errorMessage}`, loading: false });
      }
    },
    deleteProject: async (projectId, userId, userEmail) => {
      set({ loading: true, error: null });
      try {
        await ProjectService.deleteProject(projectId);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          loading: false,
        }));
        await logAuditEvent(projectId, userId, userEmail, 'Project Deleted', { projectId });
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          set({ error: `Error deleting project: ${errorMessage}`, loading: false });
      }
    },
    subscribeToUserProjects: (userId: string) => {
      // This would typically return an unsubscribe function from Firebase
      // For now, we'll load projects once and return a no-op function
      get().loadUserProjects(userId);
      return () => {}; // Unsubscribe function
    },
    }),
    {
      name: 'project-store',
    }
  )
);
