import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCommentStore } from '../../../store/commentStore';
import { Button } from '../../ui/Button';
import { Textarea } from '../../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';

interface CommentInputProps {
  projectId: string;
  elementId: string;
  threadId?: string; // For replies
  parentCommentId?: string; // For replies
  onCommentAdded?: () => void;
}

export const CommentInput: React.FC<CommentInputProps> = ({ projectId, elementId, threadId, parentCommentId, onCommentAdded }) => {
  const [text, setText] = useState('');
  const { user } = useAuth();
  const { addComment } = useCommentStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    const newComment = {
      text,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userAvatarUrl: user.photoURL || undefined,
      elementId,
      status: 'open' as const,
      threadId: threadId || new Date().getTime().toString(), // Simplistic thread ID generation
      parentCommentId,
    };

    await addComment(projectId, newComment);
    setText('');
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-start space-x-3 mt-4">
        <Avatar className="w-8 h-8">
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback>{user.displayName?.charAt(0) || 'A'}</AvatarFallback>
        </Avatar>
        <form onSubmit={handleSubmit} className="flex-1">
            <Textarea
                value={text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                placeholder={parentCommentId ? 'Write a reply...' : 'Add a comment...'}
                className="w-full bg-muted-foreground/10 border-gray-600 focus:ring-ring"
                rows={2}
            />
            <div className="flex justify-end mt-2">
                <Button type="submit" size="sm" disabled={!text.trim()}>
                    {parentCommentId ? 'Reply' : 'Comment'}
                </Button>
            </div>
        </form>
    </div>
  );
};
