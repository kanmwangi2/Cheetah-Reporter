import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { ScrollArea } from '../../ui/scroll-area';
import { CommentThread } from './CommentThread';
import { useCommentStore } from '../../../store/commentStore';

interface CommentSidebarProps {
  projectId: string;
  onClose: () => void;
}

export const CommentSidebar: React.FC<CommentSidebarProps> = ({ projectId, onClose }) => {
  const { activeThreadId } = useCommentStore();

  if (!activeThreadId) return null;

  const handleCommentSelect = (elementId: string) => {
    const element = document.getElementById(`comment-anchor-${elementId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-semibold">Comments for {activeThreadId}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <CommentThread 
            projectId={projectId} 
            elementId={activeThreadId} 
            onCommentSelect={() => handleCommentSelect(activeThreadId)} 
          />
        </div>
      </ScrollArea>
    </div>
  );
};
