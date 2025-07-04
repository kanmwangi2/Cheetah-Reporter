import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Alert } from '../../ui/alert';
import { useToast } from '../../ui/use-toast';
import { DisclosureEngine, type DisclosureItem, type DisclosureTemplate } from '../../../lib/disclosureEngine';
import { useProjectStore } from '../../../store/projectStore';
import { DisclosureEditor } from './DisclosureEditor';
import { DisclosurePreview } from './DisclosurePreview';
import { DisclosureTemplateSelector } from './DisclosureTemplateSelector';
import { FileText, Plus, Edit, Trash2, Download } from 'lucide-react';

interface DisclosureManagerProps {
  className?: string;
}

export const DisclosureManager: React.FC<DisclosureManagerProps> = ({ className }) => {
  const { currentProject, updateProject } = useProjectStore();
  const { toast } = useToast();
  const [disclosures, setDisclosures] = useState<DisclosureItem[]>([]);
  const [selectedDisclosure, setSelectedDisclosure] = useState<DisclosureItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'generated' | 'custom' | 'templates'>('generated');
  const [searchTerm, setSearchTerm] = useState('');
  const [engine] = useState(() => new DisclosureEngine());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadDisclosures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const loadDisclosures = async () => {
    if (!currentProject) return;

    try {
      // Load existing disclosures from project data
      const existingDisclosures = currentProject.disclosures || [];
      
      // Generate recommended disclosures based on project data
      const period = currentProject.periods[0]; // Use the first period
      const context = {
        project: currentProject,
        period: period || {
          id: 'default',
          reportingDate: new Date(),
          trialBalance: { rawData: [], mappings: {} },
          periodType: 'annual' as const,
          fiscalYear: new Date().getFullYear(),
          fiscalPeriod: 1,
          isComparative: false,
          status: 'draft' as const,
        },
        accounts: period?.trialBalance?.rawData || [],
        financialRatios: {},
      };
      
      const generatedDisclosures = await engine.generateDisclosures(context);
      
      // Merge and deduplicate
      const allDisclosures = [...existingDisclosures];
      generatedDisclosures.forEach(generated => {
        if (!existingDisclosures.find(existing => existing.id === generated.id)) {
          allDisclosures.push(generated);
        }
      });

      setDisclosures(allDisclosures);
    } catch (error) {
      console.error('Error loading disclosures:', error);
      toast({
        title: 'Error',
        description: 'Failed to load disclosures. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const generateDisclosures = async () => {
    if (!currentProject) return;

    setIsGenerating(true);
    try {
      // Create a simple context that works with the engine
      const period = currentProject.periods[0]; // Use the first period
      const context = {
        project: currentProject,
        period: period || {
          id: 'default',
          reportingDate: new Date(),
          trialBalance: { rawData: [], mappings: {} },
          periodType: 'annual' as const,
          fiscalYear: new Date().getFullYear(),
          fiscalPeriod: 1,
          isComparative: false,
          status: 'draft' as const,
        },
        accounts: period?.trialBalance?.rawData || [],
        financialRatios: {},
      };
      
      const generated = await engine.generateDisclosures(context);
      
      // Update project with generated disclosures
      await updateProject(currentProject.id, { disclosures: generated }, 'current-user', 'user@example.com');
      setDisclosures(generated);
      
      toast({
        title: 'Success',
        description: `Generated ${generated.length} disclosure items based on your project data.`,
      });
    } catch (error) {
      console.error('Error generating disclosures:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate disclosures. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const createCustomDisclosure = () => {
    const newDisclosure: DisclosureItem = {
      id: `custom-${Date.now()}`,
      title: 'New Custom Disclosure',
      content: '',
      type: 'custom',
      category: 'general',
      isRequired: false,
      priority: 'medium',
      status: 'draft',
      metadata: {
        lastModified: new Date(),
        createdBy: 'user',
        version: '1.0',
      },
    };

    setSelectedDisclosure(newDisclosure);
    setIsEditing(true);
    setActiveTab('custom');
  };

  const handleDisclosureSelect = (disclosure: DisclosureItem) => {
    setSelectedDisclosure(disclosure);
    setIsEditing(false);
  };

  const handleDisclosureEdit = (disclosure: DisclosureItem) => {
    setSelectedDisclosure(disclosure);
    setIsEditing(true);
  };

  const handleDisclosureSave = async (updatedDisclosure: DisclosureItem) => {
    if (!currentProject) return;

    try {
      const updatedDisclosures = disclosures.map(d =>
        d.id === updatedDisclosure.id ? updatedDisclosure : d
      );

      // If it's a new disclosure, add it to the list
      if (!disclosures.find(d => d.id === updatedDisclosure.id)) {
        updatedDisclosures.push(updatedDisclosure);
      }

      await updateProject(currentProject.id, { disclosures: updatedDisclosures }, 'current-user', 'user@example.com');
      setDisclosures(updatedDisclosures);
      setSelectedDisclosure(updatedDisclosure);
      setIsEditing(false);

      toast({
        title: 'Success',
        description: 'Disclosure saved successfully.',
      });
    } catch (error) {
      console.error('Error saving disclosure:', error);
      toast({
        title: 'Error',
        description: 'Failed to save disclosure. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDisclosureDelete = async (disclosureId: string) => {
    if (!currentProject) return;

    try {
      const updatedDisclosures = disclosures.filter(d => d.id !== disclosureId);
      
      await updateProject(currentProject.id, { disclosures: updatedDisclosures }, 'current-user', 'user@example.com');
      setDisclosures(updatedDisclosures);
      
      if (selectedDisclosure?.id === disclosureId) {
        setSelectedDisclosure(null);
        setIsEditing(false);
      }

      toast({
        title: 'Success',
        description: 'Disclosure deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting disclosure:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete disclosure. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTemplateApply = async (template: DisclosureTemplate) => {
    if (!currentProject) return;

    try {
      const disclosureItem = await engine.applyTemplate(template, currentProject);
      await handleDisclosureSave(disclosureItem);
      
      toast({
        title: 'Success',
        description: `Applied template: ${template.title}`,
      });
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const exportDisclosures = () => {
    try {
      const dataStr = JSON.stringify(disclosures, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `disclosures-${currentProject?.companyName || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Disclosures exported successfully.',
      });
    } catch (error) {
      console.error('Error exporting disclosures:', error);
      toast({
        title: 'Error',
        description: 'Failed to export disclosures.',
        variant: 'destructive',
      });
    }
  };

  const filteredDisclosures = disclosures.filter(disclosure => {
    const matchesSearch = disclosure.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disclosure.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (activeTab) {
      case 'generated':
        return matchesSearch && (disclosure.type === 'generated' || disclosure.type === 'template');
      case 'custom':
        return matchesSearch && disclosure.type === 'custom';
      default:
        return matchesSearch;
    }
  });

  if (!currentProject) {
    return (
      <div className={className}>
        <Alert>
          <FileText className="h-4 w-4" />
          <div>
            <h4>No Project Selected</h4>
            <p>Please select a project to manage disclosures.</p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Disclosure Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Generate and manage financial statement disclosures for {currentProject.companyName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateDisclosures}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate Disclosures'}
          </Button>
          <Button
            onClick={createCustomDisclosure}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Custom Disclosure
          </Button>
          <Button
            onClick={exportDisclosures}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disclosure List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="space-y-4">
              <Input
                placeholder="Search disclosures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="generated">Generated</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="generated" className="space-y-2">
                  {filteredDisclosures.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No generated disclosures found.</p>
                      <Button
                        onClick={generateDisclosures}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={isGenerating}
                      >
                        Generate Now
                      </Button>
                    </div>
                  ) : (
                    filteredDisclosures.map((disclosure) => (
                      <DisclosureListItem
                        key={disclosure.id}
                        disclosure={disclosure}
                        isSelected={selectedDisclosure?.id === disclosure.id}
                        onSelect={() => handleDisclosureSelect(disclosure)}
                        onEdit={() => handleDisclosureEdit(disclosure)}
                        onDelete={() => handleDisclosureDelete(disclosure.id)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="custom" className="space-y-2">
                  {filteredDisclosures.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No custom disclosures found.</p>
                      <Button
                        onClick={createCustomDisclosure}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Create Custom
                      </Button>
                    </div>
                  ) : (
                    filteredDisclosures.map((disclosure) => (
                      <DisclosureListItem
                        key={disclosure.id}
                        disclosure={disclosure}
                        isSelected={selectedDisclosure?.id === disclosure.id}
                        onSelect={() => handleDisclosureSelect(disclosure)}
                        onEdit={() => handleDisclosureEdit(disclosure)}
                        onDelete={() => handleDisclosureDelete(disclosure.id)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="templates">
                  <DisclosureTemplateSelector
                    onTemplateApply={handleTemplateApply}
                    currentProject={currentProject}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>

        {/* Disclosure Editor/Preview */}
        <div className="lg:col-span-2">
          {selectedDisclosure ? (
            isEditing ? (
              <DisclosureEditor
                disclosure={selectedDisclosure}
                onSave={handleDisclosureSave}
                onCancel={() => setIsEditing(false)}
                projectData={currentProject}
              />
            ) : (
              <DisclosurePreview
                disclosure={selectedDisclosure}
                onEdit={() => setIsEditing(true)}
                projectData={currentProject}
              />
            )
          ) : (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                <FileText className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Disclosure Selected</h3>
                <p className="mb-4">
                  Select a disclosure from the list to view or edit it, or create a new custom disclosure.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={generateDisclosures}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Disclosures'}
                  </Button>
                  <Button
                    onClick={createCustomDisclosure}
                    variant="outline"
                  >
                    Create Custom
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

interface DisclosureListItemProps {
  disclosure: DisclosureItem;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const DisclosureListItem: React.FC<DisclosureListItemProps> = ({
  disclosure,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
            {disclosure.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs capitalize ${getPriorityColor(disclosure.priority)}`}>
              {disclosure.priority}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(disclosure.status)}`}>
              {disclosure.status}
            </span>
            {disclosure.isRequired && (
              <span className="text-xs text-red-600 dark:text-red-400">Required</span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 capitalize">
            {disclosure.category}
          </p>
        </div>
        <div className="flex gap-1 ml-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
