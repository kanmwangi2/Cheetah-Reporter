export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  dataSource: DataSourceConfig;
  refreshInterval?: number; // seconds
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetSize {
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetConfig {
  theme?: 'light' | 'dark' | 'auto';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animation?: boolean;
  precision?: number;
  format?: 'currency' | 'percentage' | 'number' | 'text';
  showTrend?: boolean;
  showBenchmarks?: boolean;
  showHeaders?: boolean;
  sortable?: boolean;
  customSettings?: Record<string, unknown>;
}

export interface DataSourceConfig {
  type: 'project' | 'calculated' | 'external';
  projectId?: string;
  periodId?: string;
  calculation?: CalculationConfig;
  filter?: FilterConfig;
  aggregation?: AggregationConfig;
}

export interface CalculationConfig {
  formula: string;
  variables: Record<string, string>;
  dependencies: string[];
}

export interface FilterConfig {
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
}

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: string | number | boolean | Date;
}

export interface AggregationConfig {
  function: 'sum' | 'average' | 'count' | 'min' | 'max';
  groupBy?: string[];
  period: 'current' | 'previous' | 'ytd' | 'custom';
}

export type WidgetType = 
  | 'kpi-card'
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'donut-chart'
  | 'area-chart'
  | 'trend-indicator'
  | 'progress-bar'
  | 'gauge'
  | 'table'
  | 'ratio-grid'
  | 'waterfall-chart'
  | 'financial-ratios'
  | 'cash-flow-chart'
  | 'balance-trend'
  | 'profit-loss-trend'
  | 'comparison-chart'
  | 'variance-analysis'
  | 'text-summary'
  | 'alert-list';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  permissions: DashboardPermissions;
  isPublic: boolean;
  isTemplate: boolean;
  tags: string[];
  category: DashboardCategory;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sharedWith?: SharedUser[];
  projectId?: string; // Optional: Link to specific project
}

export interface DashboardLayout {
  breakpoints: { lg: number; md: number; sm: number; xs: number; xxs: number };
  cols: { lg: number; md: number; sm: number; xs: number; xxs: number };
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  isDraggable: boolean;
  isResizable: boolean;
}

export interface DashboardPermissions {
  owner: string;
  editors: string[];
  viewers: string[];
  allowPublicView: boolean;
  allowPublicEdit: boolean;
}

export interface SharedUser {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Date;
  addedBy: string;
}

export type DashboardCategory = 
  | 'executive'
  | 'financial'
  | 'operational'
  | 'compliance'
  | 'analytics'
  | 'custom';

export interface WidgetData {
  value: string | number | boolean | object;
  previousValue?: string | number | boolean | object;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  changePercent?: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  category: DashboardCategory;
  widgets: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>[];
  layout: DashboardLayout;
  preview?: string; // Base64 image or URL
  isBuiltIn: boolean;
  tags: string[];
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  dashboard: Omit<Dashboard, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;
  preview?: string;
  downloads: number;
  rating: number;
  reviews: DashboardReview[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardReview {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface WidgetLibraryItem {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  category: 'financial' | 'charts' | 'metrics' | 'tables' | 'indicators';
  defaultConfig: WidgetConfig;
  defaultSize: WidgetPosition;
  dataRequirements: DataRequirement[];
  preview?: string;
}

export interface DataRequirement {
  field: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  required: boolean;
  description: string;
}

export interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  isEditing: boolean;
  selectedWidget: DashboardWidget | null;
  widgetLibrary: WidgetLibraryItem[];
  presets: DashboardPreset[];
  templates: DashboardTemplate[];
  loading: boolean;
  error: string | null;
}

export interface WidgetUpdatePayload {
  widgetId: string;
  updates: Partial<DashboardWidget>;
}

export interface DashboardUpdatePayload {
  dashboardId: string;
  updates: Partial<Dashboard>;
}
