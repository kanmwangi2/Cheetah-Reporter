import React, { useState } from 'react';
import type { DashboardWidget } from '../../../types/dashboard';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface WidgetConfigPanelProps {
  widget: DashboardWidget;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<DashboardWidget>) => void;
}

export const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({
  widget,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [localWidget, setLocalWidget] = useState<DashboardWidget>(widget);

  const handleSave = () => {
    onUpdate(localWidget);
    onClose();
  };

  const handleCancel = () => {
    setLocalWidget(widget);
    onClose();
  };

  const updateLocalWidget = (updates: Partial<DashboardWidget>) => {
    setLocalWidget(prev => ({ ...prev, ...updates }));
  };

  const updateConfig = (configUpdates: Partial<typeof widget.config>) => {
    setLocalWidget(prev => ({
      ...prev,
      config: { ...prev.config, ...configUpdates }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Widget Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[60vh] overflow-auto">
            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="widget-title">Title</Label>
                <Input
                  id="widget-title"
                  value={localWidget.title}
                  onChange={(e) => updateLocalWidget({ title: e.target.value })}
                  placeholder="Widget title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="widget-width">Width</Label>
                  <Input
                    id="widget-width"
                    type="number"
                    value={localWidget.position.w}
                    onChange={(e) => updateLocalWidget({
                      position: { ...localWidget.position, w: parseInt(e.target.value) || 1 }
                    })}
                    min={localWidget.size.minW}
                    max={localWidget.size.maxW || 12}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="widget-height">Height</Label>
                  <Input
                    id="widget-height"
                    type="number"
                    value={localWidget.position.h}
                    onChange={(e) => updateLocalWidget({
                      position: { ...localWidget.position, h: parseInt(e.target.value) || 1 }
                    })}
                    min={localWidget.size.minH}
                    max={localWidget.size.maxH || 12}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  value={localWidget.refreshInterval || 60}
                  onChange={(e) => updateLocalWidget({ 
                    refreshInterval: parseInt(e.target.value) || 60 
                  })}
                  min={10}
                  placeholder="60"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="widget-visible"
                  checked={localWidget.isVisible}
                  onCheckedChange={(checked) => updateLocalWidget({ isVisible: checked })}
                />
                <Label htmlFor="widget-visible">Visible</Label>
              </div>
            </TabsContent>

            <TabsContent value="display" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="format">Number Format</Label>
                <Select
                  value={localWidget.config.format || 'number'}
                  onValueChange={(value) => updateConfig({ 
                    format: value as 'currency' | 'percentage' | 'number' | 'text' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="precision">Decimal Places</Label>
                <Input
                  id="precision"
                  type="number"
                  value={localWidget.config.precision || 2}
                  onChange={(e) => updateConfig({ 
                    precision: parseInt(e.target.value) || 2 
                  })}
                  min={0}
                  max={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={localWidget.config.theme || 'auto'}
                  onValueChange={(value) => updateConfig({ 
                    theme: value as 'light' | 'dark' | 'auto' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chart-specific options */}
              {['line-chart', 'bar-chart', 'area-chart'].includes(localWidget.type) && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-grid"
                      checked={localWidget.config.showGrid || false}
                      onCheckedChange={(checked) => updateConfig({ showGrid: checked })}
                    />
                    <Label htmlFor="show-grid">Show Grid</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-legend"
                      checked={localWidget.config.showLegend || false}
                      onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
                    />
                    <Label htmlFor="show-legend">Show Legend</Label>
                  </div>
                </>
              )}

              {/* KPI-specific options */}
              {localWidget.type === 'kpi-card' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-trend"
                    checked={localWidget.config.showTrend || false}
                    onCheckedChange={(checked) => updateConfig({ showTrend: checked })}
                  />
                  <Label htmlFor="show-trend">Show Trend</Label>
                </div>
              )}

              {/* Financial ratios options */}
              {localWidget.type === 'financial-ratios' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-benchmarks"
                    checked={localWidget.config.showBenchmarks || false}
                    onCheckedChange={(checked) => updateConfig({ showBenchmarks: checked })}
                  />
                  <Label htmlFor="show-benchmarks">Show Benchmarks</Label>
                </div>
              )}

              {/* Table options */}
              {localWidget.type === 'table' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-headers"
                      checked={localWidget.config.showHeaders || false}
                      onCheckedChange={(checked) => updateConfig({ showHeaders: checked })}
                    />
                    <Label htmlFor="show-headers">Show Headers</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sortable"
                      checked={localWidget.config.sortable || false}
                      onCheckedChange={(checked) => updateConfig({ sortable: checked })}
                    />
                    <Label htmlFor="sortable">Sortable</Label>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="animation"
                  checked={localWidget.config.animation !== false}
                  onCheckedChange={(checked) => updateConfig({ animation: checked })}
                />
                <Label htmlFor="animation">Enable Animations</Label>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data-source-type">Data Source</Label>
                <Select
                  value={localWidget.dataSource.type}
                  onValueChange={(value) => updateLocalWidget({
                    dataSource: {
                      ...localWidget.dataSource,
                      type: value as 'project' | 'calculated' | 'external'
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project Data</SelectItem>
                    <SelectItem value="calculated">Calculated</SelectItem>
                    <SelectItem value="external">External API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {localWidget.dataSource.type === 'calculated' && (
                <div className="space-y-2">
                  <Label htmlFor="formula">Formula</Label>
                  <Textarea
                    id="formula"
                    value={localWidget.dataSource.calculation?.formula || ''}
                    onChange={(e) => updateLocalWidget({
                      dataSource: {
                        ...localWidget.dataSource,
                        calculation: {
                          ...localWidget.dataSource.calculation,
                          formula: e.target.value,
                          variables: {},
                          dependencies: [],
                        }
                      }
                    })}
                    placeholder="Enter calculation formula..."
                    rows={3}
                  />
                </div>
              )}

              {localWidget.dataSource.type === 'project' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="project-id">Project</Label>
                    <Input
                      id="project-id"
                      value={localWidget.dataSource.projectId || ''}
                      onChange={(e) => updateLocalWidget({
                        dataSource: {
                          ...localWidget.dataSource,
                          projectId: e.target.value
                        }
                      })}
                      placeholder="Project ID..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="period-id">Period</Label>
                    <Input
                      id="period-id"
                      value={localWidget.dataSource.periodId || ''}
                      onChange={(e) => updateLocalWidget({
                        dataSource: {
                          ...localWidget.dataSource,
                          periodId: e.target.value
                        }
                      })}
                      placeholder="Period ID..."
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
