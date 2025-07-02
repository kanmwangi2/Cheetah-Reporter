import React, { useState, useEffect } from 'react';
import { useTemplateStore } from '../../../store/templateStore';
import { useProjectStore } from '../../../store/projectStore';
import { Button } from '../../ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onSuccess: () => void;
}

export const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({ open, onOpenChange, projectId, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [alert, setAlert] = useState<{ title: string; description: string; variant: 'default' | 'destructive' } | null>(null);
  const { createTemplateFromProject, loading } = useTemplateStore();
  const { projects } = useProjectStore();

  useEffect(() => {
    if (!open) {
      // Reset state when dialog is closed
      setName('');
      setDescription('');
      setAlert(null);
    }
  }, [open]);

  const handleSave = async () => {
    setAlert(null);
    if (!projectId) {
        setAlert({
            title: 'Error',
            description: 'No project selected.',
            variant: 'destructive',
        });
        return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      setAlert({
        title: 'Error',
        description: 'Project not found.',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim()) {
        setAlert({
            title: 'Validation Error',
            description: 'Template name is required.',
            variant: 'destructive',
        });
        return;
    }

    try {
      await createTemplateFromProject(project, name, description);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      setAlert({
        title: 'Error Saving Template',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Project as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {alert && (
            <Alert variant={alert.variant}>
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.description}</AlertDescription>
            </Alert>
          )}
          <Input 
            placeholder="Template Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <Textarea 
            placeholder="Template Description (Optional)" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
