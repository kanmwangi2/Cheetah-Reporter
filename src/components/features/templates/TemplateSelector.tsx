import React, { useEffect } from 'react';
import { useTemplateStore } from '../../../store/templateStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import type { ReportTemplate } from '../../../types/project';

interface TemplateSelectorProps {
  selectedTemplate: string | undefined;
  onSelectTemplate: (templateId: string | undefined) => void;
  className?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selectedTemplate, onSelectTemplate, className }) => {
  const { templates, loading, error, fetchTemplates } = useTemplateStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleValueChange = (value: string) => {
    onSelectTemplate(value === 'none' ? undefined : value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="template-selector" className="text-sm font-medium">
        Start from a Template (Optional)
      </label>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Select onValueChange={handleValueChange} value={selectedTemplate || 'none'} disabled={loading || !!error}>
        <SelectTrigger id="template-selector">
          <SelectValue placeholder={loading ? "Loading templates..." : "Select a template"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Start from scratch</SelectItem>
          {templates.map((template: ReportTemplate) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTemplate && templates.find(t => t.id === selectedTemplate) && (
        <p className="text-xs text-muted-foreground">
          {templates.find(t => t.id === selectedTemplate)?.description}
        </p>
      )}
    </div>
  );
};
