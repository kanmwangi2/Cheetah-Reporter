import React, { useEffect, useState } from 'react';
import { useCommentStore } from '../../../store/commentStore';
import { CommentView } from './CommentView';
import { CommentInput } from './CommentInput';
import type { Comment } from '../../../types/project';

interface CommentThreadProps {
  projectId: string;
  elementId: string;
  onCommentSelect?: (elementId: string) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ projectId, elementId, onCommentSelect }) => {
  const {
    comments,
    subscribe,
    cleanup,
    isLoading,
    error
  } = useCommentStore();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    subscribe(projectId, elementId);
    return () => {
      cleanup();
    };
  }, [projectId, elementId, subscribe, cleanup]);

  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };

  const handleCommentAdded = () => {
    setReplyingTo(null);
  };

  const renderComment = (comment: Comment, allComments: Comment[]) => {
    const replies = allComments.filter(c => c.parentCommentId === comment.id)
                               .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
    return (
      <div key={comment.id} className="pl-4 border-l-2 border-gray-700/50 cursor-pointer hover:bg-slate-800/50 rounded-r-lg" onClick={() => onCommentSelect && onCommentSelect(comment.elementId)}>
        <CommentView projectId={projectId} comment={comment} onReply={() => handleReply(comment.id)} />
        {replyingTo === comment.id && (
          <div className="ml-10 mt-2">
            <CommentInput
              projectId={projectId}
              elementId={elementId}
              threadId={comment.threadId}
              parentCommentId={comment.id}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        )}
        {replies.map(reply => renderComment(reply, allComments))}
      </div>
    );
  };

  const topLevelComments = comments.filter(c => !c.parentCommentId)
                                   .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

  if (isLoading) return <div>Loading comments...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="py-4">
      <h3 className="text-lg font-semibold mb-2">Comments</h3>
      <div className="space-y-4">
        {topLevelComments.map(comment => renderComment(comment, comments))}
      </div>
      <div className="mt-6">
        <CommentInput projectId={projectId} elementId={elementId} onCommentAdded={handleCommentAdded} />
      </div>
    </div>
  );
};
