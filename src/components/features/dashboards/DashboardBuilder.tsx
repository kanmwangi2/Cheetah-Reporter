import React, { useState, useCallback, useEffect } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useDashboardStore } from '../../../store/dashboardStore';
import type { DashboardWidget } from '../../../types/dashboard';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { 
  LayoutDashboard, 
  Plus, 
  Settings, 
  Eye, 
  Edit,
  Trash2,
  Copy,
  RefreshCw
} from 'lucide-react';
import { WidgetLibrary } from '../dashboards/WidgetLibrary';
import { WidgetRenderer } from '../dashboards/WidgetRenderer';
import { WidgetConfigPanel } from '../dashboards/WidgetConfigPanel';
import { DashboardSettings } from '../dashboards/DashboardSettings';
import { Alert, AlertDescription } from '../../ui/alert';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export const DashboardBuilder: React.FC = () => {
  const {
    currentDashboard,
    isEditing,
    selectedWidget,
    loading,
    error,
    setEditMode,
    setSelectedWidget,
    updateWidget,
    deleteWidget,
    duplicateWidget,
    saveLayout,
    refreshWidget,
    refreshAllWidgets,
  } = useDashboardStore();

  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Convert dashboard widgets to grid layout format
  const getLayoutFromWidgets = useCallback((widgets: DashboardWidget[]): Layout[] => {
    return widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: widget.size.minW,
      minH: widget.size.minH,
      maxW: widget.size.maxW,
      maxH: widget.size.maxH,
      static: !isEditing,
    }));
  }, [isEditing]);

  // Handle layout changes
  const handleLayoutChange = useCallback((layout: Layout[]) => {
    if (!currentDashboard || !isEditing) return;

    const updatedWidgets = currentDashboard.widgets.map(widget => {
      const layoutItem = layout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
          updatedAt: new Date(),
        };
      }
      return widget;
    });

    saveLayout(updatedWidgets);
  }, [currentDashboard, isEditing, saveLayout]);

  // Handle widget actions
  const handleWidgetClick = (widget: DashboardWidget) => {
    if (isEditing) {
      setSelectedWidget(selectedWidget?.id === widget.id ? null : widget);
    }
  };

  const handleWidgetDelete = async (widget: DashboardWidget) => {
    if (window.confirm(`Delete widget "${widget.title}"?`)) {
      await deleteWidget(widget.id);
    }
  };

  const handleWidgetDuplicate = async (widget: DashboardWidget) => {
    await duplicateWidget(widget.id);
  };

  const handleWidgetRefresh = async (widget: DashboardWidget) => {
    await refreshWidget(widget.id);
  };

  const handleToggleEditMode = () => {
    setEditMode(!isEditing);
    if (isEditing) {
      setSelectedWidget(null);
    }
  };

  const handleRefreshAll = async () => {
    await refreshAllWidgets();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'e':
            event.preventDefault();
            setEditMode(!isEditing);
            break;
          case 's':
            event.preventDefault();
            if (currentDashboard && isEditing) {
              saveLayout(currentDashboard.widgets);
            }
            break;
          case 'r':
            event.preventDefault();
            refreshAllWidgets();
            break;
          case 'Delete':
            if (selectedWidget) {
              event.preventDefault();
              if (window.confirm(`Delete widget "${selectedWidget.title}"?`)) {
                deleteWidget(selectedWidget.id);
              }
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, selectedWidget, currentDashboard, setEditMode, saveLayout, refreshAllWidgets, deleteWidget]);

  if (!currentDashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <LayoutDashboard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No Dashboard Selected</h3>
          <p className="text-muted-foreground">Please select or create a dashboard to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">{currentDashboard.name}</h1>
              {currentDashboard.description && (
                <p className="text-sm text-muted-foreground">{currentDashboard.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWidgetLibrary(true)}
              disabled={!isEditing}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>

            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={handleToggleEditMode}
            >
              {isEditing ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  View Mode
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Grid */}
      <div className="flex-1 p-4 overflow-auto">
        {currentDashboard.widgets.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <LayoutDashboard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Empty Dashboard</h3>
              <p className="text-muted-foreground mb-4">
                Add your first widget to get started with this dashboard.
              </p>
              <Button onClick={() => setShowWidgetLibrary(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </div>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: getLayoutFromWidgets(currentDashboard.widgets) }}
            breakpoints={currentDashboard.layout.breakpoints}
            cols={currentDashboard.layout.cols}
            rowHeight={currentDashboard.layout.rowHeight}
            margin={currentDashboard.layout.margin}
            containerPadding={currentDashboard.layout.containerPadding}
            isDraggable={currentDashboard.layout.isDraggable && isEditing}
            isResizable={currentDashboard.layout.isResizable && isEditing}
            onLayoutChange={handleLayoutChange}
            useCSSTransforms={true}
          >
            {currentDashboard.widgets.map((widget) => (
              <div key={widget.id} className="widget-container">
                <Card 
                  className={`h-full transition-all ${
                    isEditing 
                      ? 'hover:shadow-md cursor-pointer' 
                      : ''
                  } ${
                    selectedWidget?.id === widget.id 
                      ? 'ring-2 ring-primary' 
                      : ''
                  }`}
                  onClick={() => handleWidgetClick(widget)}
                >
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    {isEditing && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWidgetRefresh(widget);
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWidgetDuplicate(widget);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWidgetDelete(widget);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 h-full">
                    <WidgetRenderer widget={widget} />
                  </CardContent>
                </Card>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Sidebars */}
      {showWidgetLibrary && (
        <WidgetLibrary
          isOpen={showWidgetLibrary}
          onClose={() => setShowWidgetLibrary(false)}
        />
      )}

      {selectedWidget && isEditing && (
        <WidgetConfigPanel
          widget={selectedWidget}
          isOpen={true}
          onClose={() => setSelectedWidget(null)}
          onUpdate={(updates: Partial<DashboardWidget>) =>
            updateWidget({ widgetId: selectedWidget.id, updates })
          }
        />
      )}

      {showSettings && (
        <DashboardSettings
          dashboard={currentDashboard}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Keyboard shortcuts help */}
      {isEditing && (
        <div className="fixed bottom-4 right-4 bg-background/90 backdrop-blur border rounded-lg p-3 text-xs text-muted-foreground">
          <div className="font-medium mb-1">Shortcuts:</div>
          <div>Ctrl+E: Toggle Edit Mode</div>
          <div>Ctrl+S: Save Layout</div>
          <div>Ctrl+R: Refresh All</div>
          <div>Del: Delete Selected</div>
        </div>
      )}
    </div>
  );
};
