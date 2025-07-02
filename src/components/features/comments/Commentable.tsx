import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useCommentStore } from '../../../store/commentStore';
import { cn } from '../../../lib/utils';

interface CommentableProps {
  children: React.ReactNode;
  elementId: string;
}

export const Commentable: React.FC<CommentableProps> = ({ children, elementId }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { comments, setActiveThreadId, activeThreadId } = useCommentStore();

  const commentCount = comments.filter(c => c.elementId === elementId && !c.parentCommentId).length;
  const isActive = activeThreadId === elementId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveThreadId(elementId);
  };

  return (
    <div
      id={`comment-anchor-${elementId}`}
      className={cn(
        "relative group border-2 p-1 rounded transition-all duration-300",
        isActive ? 'border-blue-500 bg-blue-500/10' : 'border-transparent',
        !isActive && isHovered ? 'border-yellow-400' : 'border-transparent'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {(isHovered || commentCount > 0 || isActive) && (
        <button
          onClick={handleClick}
          className={cn(
            'absolute top-0 right-0 -mt-3 -mr-3 p-1 rounded-full bg-yellow-400 text-black transition-all focus:outline-none shadow-lg',
            {
              'opacity-100 scale-100': isHovered || commentCount > 0 || isActive,
              'opacity-0 scale-75': !isHovered && commentCount === 0 && !isActive,
              'ring-2 ring-offset-2 ring-blue-500': isActive, // Highlight if active
            }
          )}
          aria-label={`View comments for this item`}
        >
          {commentCount > 0 ? (
            <span className="flex items-center justify-center h-5 w-5 text-xs font-bold">
              {commentCount}
            </span>
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
};
