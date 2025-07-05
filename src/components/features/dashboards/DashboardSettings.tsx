import React, { useState } from 'react';
import type { Dashboard } from '../../../types/dashboard';
import { useDashboardStore } from '../../../store/dashboardStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Settings, Users, Share, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Alert, AlertDescription } from '../../ui/alert';

interface DashboardSettingsProps {
  dashboard: Dashboard;
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  dashboard,
  isOpen,
  onClose,
}) => {
  const { updateDashboard, deleteDashboard, shareDashboard } = useDashboardStore();
  const [localDashboard, setLocalDashboard] = useState<Dashboard>(dashboard);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('viewer');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    try {
      await updateDashboard({
        dashboardId: dashboard.id,
        updates: {
          name: localDashboard.name,
          description: localDashboard.description,
          category: localDashboard.category,
          tags: localDashboard.tags,
          isPublic: localDashboard.isPublic,
          permissions: localDashboard.permissions,
        }
      });
      onClose();
    } catch (error) {
      console.error('Failed to update dashboard:', error);
    }
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      try {
        await deleteDashboard(dashboard.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete dashboard:', error);
      }
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleShare = async () => {
    if (shareEmail) {
      try {
        await shareDashboard(dashboard.id, shareEmail, shareRole);
        setShareEmail('');
        // Refresh dashboard data to show new share
      } catch (error) {
        console.error('Failed to share dashboard:', error);
      }
    }
  };

  const updateLocalDashboard = (updates: Partial<Dashboard>) => {
    setLocalDashboard(prev => ({ ...prev, ...updates }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dashboard Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[60vh] overflow-auto">
            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dashboard-name">Dashboard Name</Label>
                <Input
                  id="dashboard-name"
                  value={localDashboard.name}
                  onChange={(e) => updateLocalDashboard({ name: e.target.value })}
                  placeholder="Dashboard name..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboard-description">Description</Label>
                <Textarea
                  id="dashboard-description"
                  value={localDashboard.description || ''}
                  onChange={(e) => updateLocalDashboard({ description: e.target.value })}
                  placeholder="Dashboard description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboard-category">Category</Label>
                <Select
                  value={localDashboard.category}
                  onValueChange={(value) => updateLocalDashboard({ 
                    category: value as Dashboard['category'] 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboard-tags">Tags (comma-separated)</Label>
                <Input
                  id="dashboard-tags"
                  value={localDashboard.tags.join(', ')}
                  onChange={(e) => updateLocalDashboard({ 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="executive, kpi, monthly..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="dashboard-public"
                  checked={localDashboard.isPublic}
                  onCheckedChange={(checked: boolean) => updateLocalDashboard({ isPublic: checked })}
                />
                <Label htmlFor="dashboard-public">Public Dashboard</Label>
              </div>
            </TabsContent>

            <TabsContent value="sharing" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Share className="h-4 w-4" />
                    Share Dashboard
                  </h4>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter email address..."
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Select value={shareRole} onValueChange={(value) => setShareRole(value as 'editor' | 'viewer')}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleShare} disabled={!shareEmail}>
                        Share
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Current Collaborators
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <div className="font-medium">Owner</div>
                        <div className="text-sm text-muted-foreground">{dashboard.permissions.owner}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">Owner</div>
                    </div>
                    
                    {dashboard.sharedWith?.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Added {user.addedAt.toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground capitalize">{user.role}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Dashboard Information</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>Created: {dashboard.createdAt.toLocaleDateString()}</div>
                    <div>Last Modified: {dashboard.updatedAt.toLocaleDateString()}</div>
                    <div>Widgets: {dashboard.widgets.length}</div>
                    <div>ID: {dashboard.id}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-red-600">Danger Zone</h4>
                  <Alert variant="destructive" className="mb-2">
                    <AlertDescription>
                      Deleting a dashboard is permanent and cannot be undone.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    className="w-full"
                  >
                    {showDeleteConfirm ? 'Confirm Delete Dashboard' : 'Delete Dashboard'}
                  </Button>
                  {showDeleteConfirm && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="w-full mt-2"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
