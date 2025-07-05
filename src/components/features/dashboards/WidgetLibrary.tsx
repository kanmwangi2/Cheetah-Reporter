import React, { useState } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import type { WidgetLibraryItem, WidgetType } from '../../../types/dashboard';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Plus, 
  Search,
  TrendingUp,
  BarChart3,
  PieChart,
  Table,
  LineChart,
  Calculator
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface WidgetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ isOpen, onClose }) => {
  const { widgetLibrary, addWidget } = useDashboardStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Widgets', count: widgetLibrary.length },
    { id: 'metrics', name: 'Metrics', count: widgetLibrary.filter(w => w.category === 'metrics').length },
    { id: 'charts', name: 'Charts', count: widgetLibrary.filter(w => w.category === 'charts').length },
    { id: 'financial', name: 'Financial', count: widgetLibrary.filter(w => w.category === 'financial').length },
    { id: 'tables', name: 'Tables', count: widgetLibrary.filter(w => w.category === 'tables').length },
  ];

  const getWidgetIcon = (type: WidgetType) => {
    switch (type) {
      case 'kpi-card':
      case 'trend-indicator':
        return <TrendingUp className="h-5 w-5" />;
      case 'bar-chart':
      case 'line-chart':
      case 'area-chart':
        return <BarChart3 className="h-5 w-5" />;
      case 'pie-chart':
      case 'donut-chart':
        return <PieChart className="h-5 w-5" />;
      case 'table':
        return <Table className="h-5 w-5" />;
      case 'financial-ratios':
        return <Calculator className="h-5 w-5" />;
      default:
        return <LineChart className="h-5 w-5" />;
    }
  };

  const filteredWidgets = widgetLibrary.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddWidget = async (widgetItem: WidgetLibraryItem) => {
    const newWidget = {
      type: widgetItem.type,
      title: widgetItem.name,
      position: {
        x: 0,
        y: 0,
        w: widgetItem.defaultSize.w,
        h: widgetItem.defaultSize.h,
      },
      size: {
        minW: widgetItem.defaultSize.w,
        minH: widgetItem.defaultSize.h,
      },
      config: widgetItem.defaultConfig,
      dataSource: {
        type: 'calculated' as const,
        calculation: {
          formula: 'DEFAULT_DATA()',
          variables: {},
          dependencies: [],
        },
      },
      isVisible: true,
    };

    try {
      await addWidget(newWidget);
      onClose();
    } catch (error) {
      console.error('Failed to add widget:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Widget Library
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1">
            <TabsList className="grid w-full grid-cols-5">
              {categories.map(category => (
                <TabsTrigger key={category.id} value={category.id} className="text-xs">
                  {category.name} ({category.count})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4 flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWidgets.map((widget) => (
                  <Card key={widget.type} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getWidgetIcon(widget.type)}
                          <CardTitle className="text-sm">{widget.name}</CardTitle>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddWidget(widget)}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs mb-3">
                        {widget.description}
                      </CardDescription>
                      
                      {/* Preview */}
                      <div className="bg-muted/50 rounded p-2 mb-3 h-16 flex items-center justify-center">
                        <div className="text-xs text-muted-foreground text-center">
                          <div>{getWidgetIcon(widget.type)}</div>
                          <div className="mt-1">Preview</div>
                        </div>
                      </div>

                      {/* Data Requirements */}
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          Data Requirements:
                        </div>
                        {widget.dataRequirements.slice(0, 2).map((req, index) => (
                          <div key={index} className="text-xs text-muted-foreground">
                            • {req.field} ({req.type})
                            {req.required && <span className="text-red-500">*</span>}
                          </div>
                        ))}
                        {widget.dataRequirements.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{widget.dataRequirements.length - 2} more...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    No widgets found matching your criteria.
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
