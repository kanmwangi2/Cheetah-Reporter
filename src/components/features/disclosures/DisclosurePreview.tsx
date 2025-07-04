import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import type { DisclosureItem, Project } from '../../../types/project';
import { Edit, FileText, Calendar, User, Tag } from 'lucide-react';

interface DisclosurePreviewProps {
  disclosure: DisclosureItem;
  onEdit: () => void;
  projectData: Project;
}

export const DisclosurePreview: React.FC<DisclosurePreviewProps> = ({
  disclosure,
  onEdit,
  projectData,
}) => {
  const renderContent = (content: string): string => {
    // Replace context variables with actual values
    let processedContent = content;

    // Replace common variables
    processedContent = processedContent.replace(/\{\{company_name\}\}/g, projectData.companyName);
    processedContent = processedContent.replace(/\{\{currency\}\}/g, projectData.currency);
    processedContent = processedContent.replace(/\{\{ifrs_standard\}\}/g, projectData.ifrsStandard.toUpperCase());
    
    // Get latest period for reporting date
    const latestPeriod = projectData.periods?.sort(
      (a, b) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime()
    )[0];
    
    if (latestPeriod) {
      processedContent = processedContent.replace(
        /\{\{reporting_date\}\}/g,
        new Date(latestPeriod.reportingDate).toLocaleDateString()
      );
    }

    return processedContent;
  };

  const formatContent = (content: string): React.ReactNode => {
    const processedContent = renderContent(content);
    
    // Simple markdown-like formatting
    const lines = processedContent.split('\n');
    
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('# ')) {
        return (
          <h2 key={index} className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">
            {line.substring(2)}
          </h2>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={index} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-3 mb-2">
            {line.substring(3)}
          </h3>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h4 key={index} className="text-base font-medium text-gray-900 dark:text-gray-100 mt-2 mb-1">
            {line.substring(4)}
          </h4>
        );
      }

      // Bold text
      if (line.includes('**')) {
        const parts = line.split('**');
        const formatted = parts.map((part, partIndex) => 
          partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part
        );
        return (
          <p key={index} className="text-gray-700 dark:text-gray-300 mb-2">
            {formatted}
          </p>
        );
      }

      // Lists
      if (line.startsWith('- ')) {
        return (
          <li key={index} className="text-gray-700 dark:text-gray-300 ml-4 mb-1">
            {line.substring(2)}
          </li>
        );
      }

      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={index} className="text-gray-700 dark:text-gray-300 ml-4 mb-1">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }

      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }

      // Regular paragraphs
      return (
        <p key={index} className="text-gray-700 dark:text-gray-300 mb-2">
          {line}
        </p>
      );
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
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
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {disclosure.title}
            </h2>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(disclosure.priority)}`}>
                {disclosure.priority.charAt(0).toUpperCase() + disclosure.priority.slice(1)} Priority
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(disclosure.status)}`}>
                {disclosure.status.charAt(0).toUpperCase() + disclosure.status.slice(1)}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {disclosure.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              {disclosure.isRequired && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  Required
                </span>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span className="capitalize">{disclosure.type}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{disclosure.metadata.createdBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{disclosure.metadata.lastModified.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                <span>v{disclosure.metadata.version}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>

        {/* Content */}
        <div className="border-t pt-6">
          <div className="prose max-w-none">
            {formatContent(disclosure.content)}
          </div>
        </div>

        {/* Additional Information */}
        {disclosure.metadata.triggers && disclosure.metadata.triggers.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Generation Triggers
            </h4>
            <ul className="space-y-1">
              {disclosure.metadata.triggers.map((trigger, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                  • {trigger}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rule Information */}
        {disclosure.metadata.ruleId && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Generated from rule:
              </span>
              <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono">
                {disclosure.metadata.ruleId}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
