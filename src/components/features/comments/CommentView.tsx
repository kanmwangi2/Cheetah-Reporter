import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '../../../types/project';
import { useAuth } from '../../../contexts/AuthContext';
import { useCommentStore } from '../../../store/commentStore';
import { Button } from '../../ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Textarea } from '../../ui/textarea';

interface CommentViewProps {
  projectId: string;
  comment: Comment;
  onReply: () => void;
}

export const CommentView: React.FC<CommentViewProps> = ({ projectId, comment, onReply }) => {
  const { user } = useAuth();
  const { updateComment, deleteComment } = useCommentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);

  const canEdit = user?.uid === comment.userId && !comment.isDeleted;

  const handleResolve = () => {
    const newStatus = comment.status === 'open' ? 'resolved' : 'open';
    updateComment(projectId, comment.id, { status: newStatus });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteComment(projectId, comment.id);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(comment.text);
  };

  const handleSaveEdit = () => {
    if (editedText.trim() === '' || editedText.trim() === comment.text) {
      handleCancelEdit();
      return;
    }
    updateComment(projectId, comment.id, { text: editedText.trim() });
    setIsEditing(false);
  };

  const formattedDate = comment.createdAt instanceof Date 
    ? formatDistanceToNow(comment.createdAt, { addSuffix: true })
    : comment.createdAt?.seconds 
      ? formatDistanceToNow(new Date(comment.createdAt.seconds * 1000), { addSuffix: true })
      : 'Just now';

  return (
    <div className="flex items-start space-x-3 py-3">
      <Avatar className="w-8 h-8">
        <AvatarImage src={comment.userAvatarUrl} />
        <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-sm">{comment.userName}</span>
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>
        {isEditing ? (
          <div className="mt-2">
            <Textarea 
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="text-sm"
              rows={3}
            />
            <div className="flex items-center justify-end space-x-2 mt-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
            <div className="flex items-center space-x-3 mt-2 text-xs">
              {!comment.isDeleted && <Button variant="ghost" size="sm" onClick={onReply}>Reply</Button>}
              {canEdit && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={handleResolve}>
                    {comment.status === 'open' ? 'Resolve' : 'Re-open'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-400">
                    Delete
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
