import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import type { Project } from '../../../types/project';
import type { DisclosureTemplate as EngineTemplate } from '../../../lib/disclosureEngine';
import { FileText, Plus, Search } from 'lucide-react';

interface DisclosureTemplateSelectorProps {
  onTemplateApply: (template: EngineTemplate) => void;
  currentProject: Project;
}

export const DisclosureTemplateSelector: React.FC<DisclosureTemplateSelectorProps> = ({
  onTemplateApply,
}) => {
  const [templates, setTemplates] = useState<EngineTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EngineTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStandard, setSelectedStandard] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.sections.some(section =>
          section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          section.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (selectedCategory !== 'all') {
      // Simple category filtering based on template ID
      filtered = filtered.filter(template =>
        template.id.includes(selectedCategory)
      );
    }

    setFilteredTemplates(filtered);
  };

  useEffect(() => {
    filterTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, searchTerm, selectedCategory, selectedStandard]);

  const loadTemplates = () => {
    // Sample disclosure templates
    const sampleTemplates: EngineTemplate[] = [
      {
        id: 'accounting-policies-basis',
        title: 'Basis of Preparation',
        sections: [
          {
            id: 'compliance',
            title: 'Statement of Compliance',
            content: 'The financial statements have been prepared in accordance with {{ifrs_standard}} International Financial Reporting Standards.',
          }
        ],
        variables: [
          {
            name: 'ifrs_standard',
            type: 'text',
            source: 'metadata',
            required: true
          }
        ],
        formatting: {
          numbered: true,
          bulleted: false,
          tabular: false
        }
      }
    ];

    setTemplates(sampleTemplates);
  };

  const getTemplateCategories = () => [
    { value: 'all', label: 'All Categories' },
    { value: 'accounting', label: 'Accounting Policies' },
    { value: 'revenue', label: 'Revenue' },
  ];

  const getStandardOptions = () => [
    { value: 'all', label: 'All Standards' },
    { value: 'full', label: 'Full IFRS' },
    { value: 'sme', label: 'IFRS for SMEs' },
  ];

  const handleTemplateSelect = (template: EngineTemplate) => {
    onTemplateApply(template);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {getTemplateCategories().map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStandard} onValueChange={setSelectedStandard}>
            <SelectTrigger>
              <SelectValue placeholder="Standard" />
            </SelectTrigger>
            <SelectContent>
              {getStandardOptions().map((standard) => (
                <SelectItem key={standard.value} value={standard.value}>
                  {standard.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Template List */}
      <div className="space-y-2">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>No templates found matching your criteria.</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() => handleTemplateSelect(template)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: EngineTemplate;
  onSelect: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
}) => {
  const getVariableCount = () => {
    return template.variables.length;
  };

  const getSectionCount = () => {
    return template.sections.length;
  };

  return (
    <Card className="p-4 cursor-pointer transition-colors hover:border-blue-300 dark:hover:border-blue-600">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            {template.title}
          </h4>
          
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span>{getSectionCount()} sections</span>
            <span>{getVariableCount()} variables</span>
            {template.formatting.numbered && <span>Numbered</span>}
            {template.formatting.bulleted && <span>Bulleted</span>}
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {template.sections[0]?.content.substring(0, 120)}...
          </p>
        </div>

        <Button
          onClick={onSelect}
          size="sm"
          className="ml-4 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Apply
        </Button>
      </div>
    </Card>
  );
};
