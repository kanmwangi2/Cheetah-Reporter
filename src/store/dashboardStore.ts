import { create } from 'zustand';
import type { 
  Dashboard, 
  DashboardWidget, 
  DashboardState, 
  DashboardPreset, 
  DashboardTemplate,
  WidgetLibraryItem,
  WidgetUpdatePayload,
  DashboardUpdatePayload 
} from '../types/dashboard';

interface DashboardStore extends DashboardState {
  // Dashboard management
  createDashboard: (dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  loadDashboard: (dashboardId: string) => Promise<void>;
  updateDashboard: (payload: DashboardUpdatePayload) => Promise<void>;
  deleteDashboard: (dashboardId: string) => Promise<void>;
  duplicateDashboard: (dashboardId: string, newName: string) => Promise<string>;
  loadUserDashboards: (userId: string) => Promise<void>;
  setCurrentDashboard: (dashboard: Dashboard | null) => void;
  
  // Widget management
  addWidget: (widget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateWidget: (payload: WidgetUpdatePayload) => Promise<void>;
  deleteWidget: (widgetId: string) => Promise<void>;
  duplicateWidget: (widgetId: string) => Promise<string>;
  moveWidget: (widgetId: string, position: { x: number; y: number }) => Promise<void>;
  resizeWidget: (widgetId: string, size: { w: number; h: number }) => Promise<void>;
  setSelectedWidget: (widget: DashboardWidget | null) => void;
  
  // Dashboard editing
  setEditMode: (isEditing: boolean) => void;
  saveLayout: (widgets: DashboardWidget[]) => Promise<void>;
  resetLayout: () => Promise<void>;
  
  // Templates and presets
  loadPresets: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  createFromPreset: (presetId: string, name: string) => Promise<string>;
  createFromTemplate: (templateId: string, name: string) => Promise<string>;
  saveAsTemplate: (dashboardId: string, templateData: Partial<DashboardTemplate>) => Promise<string>;
  
  // Widget library
  loadWidgetLibrary: () => void;
  getWidgetsByCategory: (category: string) => WidgetLibraryItem[];
  
  // Sharing and permissions
  shareDashboard: (dashboardId: string, userEmail: string, role: 'editor' | 'viewer') => Promise<void>;
  removeDashboardAccess: (dashboardId: string, userId: string) => Promise<void>;
  updateDashboardPermissions: (dashboardId: string, permissions: Partial<Dashboard['permissions']>) => Promise<void>;
  
  // Data and real-time updates
  refreshWidget: (widgetId: string) => Promise<void>;
  refreshAllWidgets: () => Promise<void>;
  subscribeToRealTimeUpdates: (dashboardId: string) => () => void;
  
  // Utility functions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Default widget library items
const defaultWidgetLibrary: WidgetLibraryItem[] = [
  {
    type: 'kpi-card',
    name: 'KPI Card',
    description: 'Display key performance indicators with trend information',
    icon: 'TrendingUp',
    category: 'metrics',
    defaultConfig: {
      format: 'currency',
      showTrend: true,
      animation: true,
    },
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    dataRequirements: [
      { field: 'value', type: 'number', required: true, description: 'Primary metric value' },
      { field: 'previousValue', type: 'number', required: false, description: 'Previous period value for comparison' },
    ],
  },
  {
    type: 'line-chart',
    name: 'Line Chart',
    description: 'Show trends over time with multiple data series',
    icon: 'LineChart',
    category: 'charts',
    defaultConfig: {
      showGrid: true,
      showLegend: true,
      animation: true,
    },
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    dataRequirements: [
      { field: 'dates', type: 'date', required: true, description: 'Time periods' },
      { field: 'values', type: 'number', required: true, description: 'Data values' },
    ],
  },
  {
    type: 'bar-chart',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: 'BarChart',
    category: 'charts',
    defaultConfig: {
      showGrid: true,
      showLegend: true,
      animation: true,
    },
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    dataRequirements: [
      { field: 'categories', type: 'string', required: true, description: 'Category labels' },
      { field: 'values', type: 'number', required: true, description: 'Data values' },
    ],
  },
  {
    type: 'pie-chart',
    name: 'Pie Chart',
    description: 'Show proportions of a whole',
    icon: 'PieChart',
    category: 'charts',
    defaultConfig: {
      showLegend: true,
      animation: true,
    },
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    dataRequirements: [
      { field: 'labels', type: 'string', required: true, description: 'Slice labels' },
      { field: 'values', type: 'number', required: true, description: 'Slice values' },
    ],
  },
  {
    type: 'financial-ratios',
    name: 'Financial Ratios',
    description: 'Display key financial ratios with benchmarks',
    icon: 'Calculator',
    category: 'financial',
    defaultConfig: {
      format: 'number',
      precision: 2,
      showBenchmarks: true,
    },
    defaultSize: { x: 0, y: 0, w: 4, h: 6 },
    dataRequirements: [
      { field: 'ratios', type: 'number', required: true, description: 'Ratio values' },
      { field: 'benchmarks', type: 'number', required: false, description: 'Industry benchmarks' },
    ],
  },
  {
    type: 'cash-flow-chart',
    name: 'Cash Flow Chart',
    description: 'Visualize cash flow trends and patterns',
    icon: 'DollarSign',
    category: 'financial',
    defaultConfig: {
      format: 'currency',
      showGrid: true,
      showLegend: true,
    },
    defaultSize: { x: 0, y: 0, w: 8, h: 4 },
    dataRequirements: [
      { field: 'periods', type: 'date', required: true, description: 'Time periods' },
      { field: 'operatingCashFlow', type: 'number', required: true, description: 'Operating cash flow' },
      { field: 'investingCashFlow', type: 'number', required: true, description: 'Investing cash flow' },
      { field: 'financingCashFlow', type: 'number', required: true, description: 'Financing cash flow' },
    ],
  },
  {
    type: 'table',
    name: 'Data Table',
    description: 'Display detailed financial data in tabular format',
    icon: 'Table',
    category: 'tables',
    defaultConfig: {
      format: 'currency',
      showHeaders: true,
      sortable: true,
    },
    defaultSize: { x: 0, y: 0, w: 8, h: 6 },
    dataRequirements: [
      { field: 'headers', type: 'string', required: true, description: 'Column headers' },
      { field: 'rows', type: 'string', required: true, description: 'Table data' },
    ],
  },
];

// Default dashboard presets
const defaultPresets: DashboardPreset[] = [
  {
    id: 'executive-overview',
    name: 'Executive Overview',
    description: 'High-level financial metrics for executive reporting',
    category: 'executive',
    isBuiltIn: true,
    tags: ['executive', 'overview', 'kpi'],
    layout: {
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      rowHeight: 60,
      margin: [10, 10],
      containerPadding: [10, 10],
      isDraggable: true,
      isResizable: true,
    },
    widgets: [
      {
        type: 'kpi-card',
        title: 'Total Revenue',
        position: { x: 0, y: 0, w: 3, h: 2 },
        size: { minW: 2, minH: 2 },
        config: { format: 'currency', showTrend: true },
        dataSource: { type: 'calculated', calculation: { formula: 'SUM(revenue)', variables: {}, dependencies: [] } },
        isVisible: true,
      },
      {
        type: 'kpi-card',
        title: 'Net Profit',
        position: { x: 3, y: 0, w: 3, h: 2 },
        size: { minW: 2, minH: 2 },
        config: { format: 'currency', showTrend: true },
        dataSource: { type: 'calculated', calculation: { formula: 'SUM(netIncome)', variables: {}, dependencies: [] } },
        isVisible: true,
      },
      {
        type: 'kpi-card',
        title: 'Cash Position',
        position: { x: 6, y: 0, w: 3, h: 2 },
        size: { minW: 2, minH: 2 },
        config: { format: 'currency', showTrend: true },
        dataSource: { type: 'calculated', calculation: { formula: 'SUM(cash)', variables: {}, dependencies: [] } },
        isVisible: true,
      },
      {
        type: 'line-chart',
        title: 'Revenue Trend',
        position: { x: 0, y: 2, w: 6, h: 4 },
        size: { minW: 4, minH: 3 },
        config: { showGrid: true, showLegend: true },
        dataSource: { type: 'calculated', calculation: { formula: 'REVENUE_TREND()', variables: {}, dependencies: [] } },
        isVisible: true,
      },
      {
        type: 'financial-ratios',
        title: 'Key Ratios',
        position: { x: 6, y: 2, w: 6, h: 4 },
        size: { minW: 3, minH: 3 },
        config: { format: 'number', precision: 2 },
        dataSource: { type: 'calculated', calculation: { formula: 'KEY_RATIOS()', variables: {}, dependencies: [] } },
        isVisible: true,
      },
    ],
  },
  {
    id: 'financial-analyst',
    name: 'Financial Analyst',
    description: 'Detailed financial analysis dashboard for analysts',
    category: 'financial',
    isBuiltIn: true,
    tags: ['analyst', 'detailed', 'financial'],
    layout: {
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      rowHeight: 60,
      margin: [10, 10],
      containerPadding: [10, 10],
      isDraggable: true,
      isResizable: true,
    },
    widgets: [
      {
        type: 'cash-flow-chart',
        title: 'Cash Flow Analysis',
        position: { x: 0, y: 0, w: 8, h: 4 },
        size: { minW: 6, minH: 3 },
        config: { format: 'currency', showGrid: true },
        dataSource: { type: 'calculated', calculation: { formula: 'CASH_FLOW_ANALYSIS()', variables: {}, dependencies: [] } },
        isVisible: true,
      },
      {
        type: 'financial-ratios',
        title: 'All Financial Ratios',
        position: { x: 8, y: 0, w: 4, h: 8 },
        size: { minW: 3, minH: 6 },
        config: { format: 'number', precision: 2, showBenchmarks: true },
        dataSource: { type: 'calculated', calculation: { formula: 'ALL_RATIOS()', variables: {}, dependencies: [] } },
        isVisible: true,
      },
      {
        type: 'table',
        title: 'Variance Analysis',
        position: { x: 0, y: 4, w: 8, h: 4 },
        size: { minW: 6, minH: 3 },
        config: { format: 'currency', showHeaders: true, sortable: true },
        dataSource: { type: 'calculated', calculation: { formula: 'VARIANCE_ANALYSIS()', variables: {}, dependencies: [] } },
        isVisible: true,
      },
    ],
  },
];

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Initial state
  dashboards: [],
  currentDashboard: null,
  isEditing: false,
  selectedWidget: null,
  widgetLibrary: defaultWidgetLibrary,
  presets: defaultPresets,
  templates: [],
  loading: false,
  error: null,

  // Dashboard management
  createDashboard: async (dashboardData) => {
    set({ loading: true, error: null });
    try {
      const newDashboard: Dashboard = {
        ...dashboardData,
        id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      set(state => ({
        dashboards: [...state.dashboards, newDashboard],
        currentDashboard: newDashboard,
        loading: false,
      }));
      
      return newDashboard.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create dashboard', loading: false });
      throw error;
    }
  },

  loadDashboard: async (dashboardId) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const dashboard = state.dashboards.find(d => d.id === dashboardId);
      if (dashboard) {
        set({ currentDashboard: dashboard, loading: false });
      } else {
        throw new Error('Dashboard not found');
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load dashboard', loading: false });
      throw error;
    }
  },

  updateDashboard: async ({ dashboardId, updates }) => {
    set({ loading: true, error: null });
    try {
      const updatedDashboard = {
        ...updates,
        updatedAt: new Date(),
      };
      
      set(state => ({
        dashboards: state.dashboards.map(d => 
          d.id === dashboardId ? { ...d, ...updatedDashboard } : d
        ),
        currentDashboard: state.currentDashboard?.id === dashboardId 
          ? { ...state.currentDashboard, ...updatedDashboard }
          : state.currentDashboard,
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update dashboard', loading: false });
      throw error;
    }
  },

  deleteDashboard: async (dashboardId) => {
    set({ loading: true, error: null });
    try {
      set(state => ({
        dashboards: state.dashboards.filter(d => d.id !== dashboardId),
        currentDashboard: state.currentDashboard?.id === dashboardId ? null : state.currentDashboard,
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete dashboard', loading: false });
      throw error;
    }
  },

  duplicateDashboard: async (dashboardId, newName) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const originalDashboard = state.dashboards.find(d => d.id === dashboardId);
      if (!originalDashboard) {
        throw new Error('Dashboard not found');
      }

      const duplicatedDashboard: Dashboard = {
        ...originalDashboard,
        id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newName,
        createdAt: new Date(),
        updatedAt: new Date(),
        widgets: originalDashboard.widgets.map(widget => ({
          ...widget,
          id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      set(state => ({
        dashboards: [...state.dashboards, duplicatedDashboard],
        loading: false,
      }));

      return duplicatedDashboard.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to duplicate dashboard', loading: false });
      throw error;
    }
  },

  loadUserDashboards: async (userId) => {
    set({ loading: true, error: null });
    try {
      // In a real implementation, this would fetch from Firebase
      // For now, we'll return the existing dashboards filtered by user
      const state = get();
      const userDashboards = state.dashboards.filter(
        d => d.createdBy === userId || 
             d.permissions.editors.includes(userId) || 
             d.permissions.viewers.includes(userId)
      );
      
      set({ dashboards: userDashboards, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load dashboards', loading: false });
      throw error;
    }
  },

  setCurrentDashboard: (dashboard) => {
    set({ currentDashboard: dashboard });
  },

  // Widget management
  addWidget: async (widgetData) => {
    const state = get();
    if (!state.currentDashboard) {
      throw new Error('No dashboard selected');
    }

    try {
      const newWidget: DashboardWidget = {
        ...widgetData,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedDashboard = {
        ...state.currentDashboard,
        widgets: [...state.currentDashboard.widgets, newWidget],
        updatedAt: new Date(),
      };

      set(state => ({
        currentDashboard: updatedDashboard,
        dashboards: state.dashboards.map(d => 
          d.id === updatedDashboard.id ? updatedDashboard : d
        ),
      }));

      return newWidget.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add widget' });
      throw error;
    }
  },

  updateWidget: async ({ widgetId, updates }) => {
    const state = get();
    if (!state.currentDashboard) {
      throw new Error('No dashboard selected');
    }

    try {
      const updatedWidget = {
        ...updates,
        updatedAt: new Date(),
      };

      const updatedDashboard = {
        ...state.currentDashboard,
        widgets: state.currentDashboard.widgets.map(w => 
          w.id === widgetId ? { ...w, ...updatedWidget } : w
        ),
        updatedAt: new Date(),
      };

      set(state => ({
        currentDashboard: updatedDashboard,
        dashboards: state.dashboards.map(d => 
          d.id === updatedDashboard.id ? updatedDashboard : d
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update widget' });
      throw error;
    }
  },

  deleteWidget: async (widgetId) => {
    const state = get();
    if (!state.currentDashboard) {
      throw new Error('No dashboard selected');
    }

    try {
      const updatedDashboard = {
        ...state.currentDashboard,
        widgets: state.currentDashboard.widgets.filter(w => w.id !== widgetId),
        updatedAt: new Date(),
      };

      set(state => ({
        currentDashboard: updatedDashboard,
        dashboards: state.dashboards.map(d => 
          d.id === updatedDashboard.id ? updatedDashboard : d
        ),
        selectedWidget: state.selectedWidget?.id === widgetId ? null : state.selectedWidget,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete widget' });
      throw error;
    }
  },

  duplicateWidget: async (widgetId) => {
    const state = get();
    if (!state.currentDashboard) {
      throw new Error('No dashboard selected');
    }

    try {
      const originalWidget = state.currentDashboard.widgets.find(w => w.id === widgetId);
      if (!originalWidget) {
        throw new Error('Widget not found');
      }

      const duplicatedWidget: DashboardWidget = {
        ...originalWidget,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${originalWidget.title} (Copy)`,
        position: {
          ...originalWidget.position,
          x: originalWidget.position.x + 1,
          y: originalWidget.position.y + 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedDashboard = {
        ...state.currentDashboard,
        widgets: [...state.currentDashboard.widgets, duplicatedWidget],
        updatedAt: new Date(),
      };

      set(state => ({
        currentDashboard: updatedDashboard,
        dashboards: state.dashboards.map(d => 
          d.id === updatedDashboard.id ? updatedDashboard : d
        ),
      }));

      return duplicatedWidget.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to duplicate widget' });
      throw error;
    }
  },

  moveWidget: async (widgetId, position) => {
    await get().updateWidget({ widgetId, updates: { position: { ...position, w: 0, h: 0 } } });
  },

  resizeWidget: async (widgetId, size) => {
    const state = get();
    const widget = state.currentDashboard?.widgets.find(w => w.id === widgetId);
    if (widget) {
      await get().updateWidget({ 
        widgetId, 
        updates: { 
          position: { 
            ...widget.position, 
            w: size.w, 
            h: size.h 
          } 
        } 
      });
    }
  },

  setSelectedWidget: (widget) => {
    set({ selectedWidget: widget });
  },

  // Dashboard editing
  setEditMode: (isEditing) => {
    set({ isEditing });
  },

  saveLayout: async (widgets) => {
    const state = get();
    if (!state.currentDashboard) {
      throw new Error('No dashboard selected');
    }

    try {
      const updatedDashboard = {
        ...state.currentDashboard,
        widgets,
        updatedAt: new Date(),
      };

      set(state => ({
        currentDashboard: updatedDashboard,
        dashboards: state.dashboards.map(d => 
          d.id === updatedDashboard.id ? updatedDashboard : d
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save layout' });
      throw error;
    }
  },

  resetLayout: async () => {
    // Reset to default layout
    await get().saveLayout([]);
  },

  // Templates and presets
  loadPresets: async () => {
    set({ loading: true, error: null });
    try {
      // In a real implementation, this would fetch from Firebase
      set({ presets: defaultPresets, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load presets', loading: false });
    }
  },

  loadTemplates: async () => {
    set({ loading: true, error: null });
    try {
      // In a real implementation, this would fetch from Firebase
      set({ templates: [], loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load templates', loading: false });
    }
  },

  createFromPreset: async (presetId, name) => {
    const state = get();
    const preset = state.presets.find(p => p.id === presetId);
    if (!preset) {
      throw new Error('Preset not found');
    }

    const dashboardData = {
      name,
      description: `Dashboard created from ${preset.name} preset`,
      widgets: preset.widgets.map(widget => ({
        ...widget,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      layout: preset.layout,
      permissions: {
        owner: 'current_user', // Will be set by the calling code
        editors: [],
        viewers: [],
        allowPublicView: false,
        allowPublicEdit: false,
      },
      isPublic: false,
      isTemplate: false,
      tags: preset.tags,
      category: preset.category,
      createdBy: 'current_user', // Will be set by the calling code
    };

    return await get().createDashboard(dashboardData);
  },

  createFromTemplate: async (templateId, name) => {
    const state = get();
    const template = state.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const dashboardData = {
      ...template.dashboard,
      name,
      createdBy: 'current_user', // Will be set by the calling code
      widgets: template.dashboard.widgets.map(widget => ({
        ...widget,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    return await get().createDashboard(dashboardData);
  },

  saveAsTemplate: async (dashboardId, templateData) => {
    const state = get();
    const dashboard = state.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    try {
      const newTemplate: DashboardTemplate = {
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: templateData.name || dashboard.name,
        description: templateData.description || dashboard.description || '',
        dashboard: {
          name: dashboard.name,
          description: dashboard.description || '',
          widgets: dashboard.widgets,
          layout: dashboard.layout,
          permissions: dashboard.permissions,
          isPublic: dashboard.isPublic,
          isTemplate: dashboard.isTemplate,
          tags: dashboard.tags,
          category: dashboard.category,
          sharedWith: dashboard.sharedWith,
          projectId: dashboard.projectId,
        },
        downloads: 0,
        rating: 0,
        reviews: [],
        createdBy: dashboard.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set(state => ({
        templates: [...state.templates, newTemplate],
      }));

      return newTemplate.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save template' });
      throw error;
    }
  },

  // Widget library
  loadWidgetLibrary: () => {
    set({ widgetLibrary: defaultWidgetLibrary });
  },

  getWidgetsByCategory: (category) => {
    const state = get();
    return state.widgetLibrary.filter(widget => widget.category === category);
  },

  // Sharing and permissions
  shareDashboard: async (dashboardId, userEmail, role) => {
    // In a real implementation, this would handle Firebase security rules
    try {
      await get().updateDashboard({
        dashboardId,
        updates: {
          sharedWith: [
            // Add new shared user
            {
              userId: userEmail, // In real implementation, resolve email to userId
              email: userEmail,
              role,
              addedAt: new Date(),
              addedBy: '', // Current user ID
            }
          ]
        }
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to share dashboard' });
      throw error;
    }
  },

  removeDashboardAccess: async (dashboardId, userId) => {
    const state = get();
    const dashboard = state.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    try {
      await get().updateDashboard({
        dashboardId,
        updates: {
          sharedWith: dashboard.sharedWith?.filter(user => user.userId !== userId) || [],
          permissions: {
            ...dashboard.permissions,
            editors: dashboard.permissions.editors.filter(id => id !== userId),
            viewers: dashboard.permissions.viewers.filter(id => id !== userId),
          }
        }
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove access' });
      throw error;
    }
  },

  updateDashboardPermissions: async (dashboardId, permissions) => {
    const state = get();
    const dashboard = state.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    try {
      await get().updateDashboard({
        dashboardId,
        updates: { 
          permissions: {
            ...dashboard.permissions,
            ...permissions
          }
        }
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update permissions' });
      throw error;
    }
  },

  // Data and real-time updates
  refreshWidget: async (widgetId) => {
    // In a real implementation, this would refresh the widget's data
    console.log(`Refreshing widget: ${widgetId}`);
  },

  refreshAllWidgets: async () => {
    const state = get();
    if (state.currentDashboard) {
      for (const widget of state.currentDashboard.widgets) {
        await get().refreshWidget(widget.id);
      }
    }
  },

  subscribeToRealTimeUpdates: (dashboardId) => {
    // In a real implementation, this would set up Firebase listeners
    console.log(`Subscribing to real-time updates for dashboard: ${dashboardId}`);
    
    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribing from real-time updates for dashboard: ${dashboardId}`);
    };
  },

  // Utility functions
  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
