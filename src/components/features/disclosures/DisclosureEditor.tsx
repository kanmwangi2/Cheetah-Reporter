import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Alert } from '../../ui/alert';
import type { DisclosureItem, Project } from '../../../types/project';
import { Save, X, AlertCircle } from 'lucide-react';

interface DisclosureEditorProps {
  disclosure: DisclosureItem;
  onSave: (disclosure: DisclosureItem) => void;
  onCancel: () => void;
  projectData: Project;
}

export const DisclosureEditor: React.FC<DisclosureEditorProps> = ({
  disclosure,
  onSave,
  onCancel,
  projectData,
}) => {
  const [editedDisclosure, setEditedDisclosure] = useState<DisclosureItem>(disclosure);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const hasChanged = JSON.stringify(disclosure) !== JSON.stringify(editedDisclosure);
    setHasChanges(hasChanged);
  }, [disclosure, editedDisclosure]);

  const validateDisclosure = (): string[] => {
    const validationErrors: string[] = [];

    if (!editedDisclosure.title.trim()) {
      validationErrors.push('Title is required');
    }

    if (!editedDisclosure.content.trim()) {
      validationErrors.push('Content is required');
    }

    if (editedDisclosure.title.length > 200) {
      validationErrors.push('Title must be less than 200 characters');
    }

    return validationErrors;
  };

  const handleSave = () => {
    const validationErrors = validateDisclosure();
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updatedDisclosure: DisclosureItem = {
      ...editedDisclosure,
      metadata: {
        ...editedDisclosure.metadata,
        lastModified: new Date(),
        version: editedDisclosure.metadata.version || '1.0',
      },
    };

    onSave(updatedDisclosure);
  };

  const handleFieldChange = <K extends keyof DisclosureItem>(
    field: K,
    value: DisclosureItem[K]
  ) => {
    setEditedDisclosure(prev => ({
      ...prev,
      [field]: value,
    }));
    setErrors([]);
  };

  const getAvailableCategories = () => [
    'general',
    'accounting-policies',
    'significant-judgments',
    'revenue',
    'expenses',
    'assets',
    'liabilities',
    'equity',
    'cash-flows',
    'subsequent-events',
    'commitments',
    'contingencies',
    'related-parties',
    'financial-instruments',
    'taxation',
  ];

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {disclosure.id.startsWith('custom-') ? 'Edit Custom Disclosure' : 'Edit Disclosure'}
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <h4>Please fix the following errors:</h4>
              <ul className="list-disc list-inside mt-2">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </Alert>
        )}

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Title *
          </label>
          <Input
            value={editedDisclosure.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter disclosure title..."
            className="w-full"
          />
        </div>

        {/* Category and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <Select
              value={editedDisclosure.category}
              onValueChange={(value) => handleFieldChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Priority
            </label>
            <Select
              value={editedDisclosure.priority}
              onValueChange={(value: 'high' | 'medium' | 'low') => handleFieldChange('priority', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <Select
              value={editedDisclosure.status}
              onValueChange={(value: 'draft' | 'review' | 'approved' | 'rejected') => 
                handleFieldChange('status', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Required Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="required"
            checked={editedDisclosure.isRequired}
            onChange={(e) => handleFieldChange('isRequired', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="required" className="text-sm text-gray-700 dark:text-gray-300">
            This disclosure is required
          </label>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Content *
          </label>
          <Textarea
            value={editedDisclosure.content}
            onChange={(e) => handleFieldChange('content', e.target.value)}
            placeholder="Enter disclosure content..."
            rows={15}
            className="w-full font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            You can use Markdown formatting. Variables can be referenced using {`{{variable_name}}`} syntax.
          </p>
        </div>

        {/* Context Information */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Available Context Variables
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p><code>{`{{company_name}}`}</code> - {projectData.companyName}</p>
            <p><code>{`{{currency}}`}</code> - {projectData.currency}</p>
            <p><code>{`{{ifrs_standard}}`}</code> - {projectData.ifrsStandard.toUpperCase()}</p>
            <p><code>{`{{reporting_date}}`}</code> - Latest period reporting date</p>
            <p>You can also reference account balances and calculated ratios.</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Metadata
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">Type:</span> {editedDisclosure.type}
            </div>
            <div>
              <span className="font-medium">Created by:</span> {editedDisclosure.metadata.createdBy}
            </div>
            <div>
              <span className="font-medium">Version:</span> {editedDisclosure.metadata.version}
            </div>
            <div>
              <span className="font-medium">Last modified:</span>{' '}
              {editedDisclosure.metadata.lastModified.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
