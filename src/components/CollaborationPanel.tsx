import React, { useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Input } from './ui/Input'
import { UserPlus, Users, Mail, Settings, MessageSquare, Clock, Shield } from 'lucide-react'

interface CollaboratorInvite {
  email: string
  role: 'admin' | 'editor' | 'viewer'
  message?: string
}

interface Comment {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: Date
  section: string
  resolved: boolean
}

export const CollaborationPanel: React.FC = () => {
  const { currentProject, updateProject } = useProjectStore()
  const [inviteForm, setInviteForm] = useState<CollaboratorInvite>({
    email: '',
    role: 'editor',
    message: ''
  })
  const [comments] = useState<Comment[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'Sarah Johnson',
      content: 'Please review the depreciation calculation for PPE. The rates seem inconsistent with prior year.',
      timestamp: new Date('2025-01-15T10:30:00'),
      section: 'Statement of Financial Position',
      resolved: false
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Mike Chen',
      content: 'Revenue recognition policy needs clarification for the new subscription model.',
      timestamp: new Date('2025-01-14T15:45:00'),
      section: 'Notes to Financial Statements',
      resolved: false
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'Emily Davis',
      content: 'Cash flow from operations looks good. Great improvement from last quarter.',
      timestamp: new Date('2025-01-13T09:15:00'),
      section: 'Statement of Cash Flows',
      resolved: true
    }
  ])

  const [activeTab, setActiveTab] = useState<'collaborators' | 'comments' | 'permissions'>('collaborators')

  const handleInviteCollaborator = () => {
    if (!currentProject || !inviteForm.email) return

    // TODO: Implement actual invitation logic with email service
    console.log('Inviting collaborator:', inviteForm)
    
    // Simulate adding collaborator to project
    updateProject(currentProject.id, {
      collaborators: {
        ...currentProject.collaborators,
        [inviteForm.email]: inviteForm.role
      }
    })

    // Reset form
    setInviteForm({ email: '', role: 'editor', message: '' })
    
    // Show success message (in real app, this would be a toast notification)
    alert(`Invitation sent to ${inviteForm.email}`)
  }

  const removeCollaborator = (userId: string) => {
    if (!currentProject) return

    const { [userId]: removed, ...remainingCollaborators } = currentProject.collaborators
    updateProject(currentProject.id, {
      collaborators: remainingCollaborators
    })
  }

  const updateCollaboratorRole = (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!currentProject) return

    updateProject(currentProject.id, {
      collaborators: {
        ...currentProject.collaborators,
        [userId]: newRole
      }
    })
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'editor': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderCollaboratorsTab = () => (
    <div className="space-y-6">
      {/* Invite New Collaborator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Collaborator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="viewer">Viewer - Can view reports only</option>
                <option value="editor">Editor - Can edit and comment</option>
                <option value="admin">Admin - Full access including settings</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Personal Message (Optional)</label>
              <textarea
                placeholder="Add a personal message to the invitation..."
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                className="w-full p-2 border rounded-md resize-none"
                rows={3}
              />
            </div>
            <Button onClick={handleInviteCollaborator} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Collaborators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Collaborators ({Object.keys(currentProject?.collaborators || {}).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(currentProject?.collaborators || {}).map(([userId, role]) => (
              <div key={userId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-800">
                      {userId.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{userId}</div>
                    <div className="text-sm text-muted-foreground">
                      Last active: 2 hours ago
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(role)}`}>
                    {role}
                  </span>
                  <select
                    value={role}
                    onChange={(e) => updateCollaboratorRole(userId, e.target.value as any)}
                    className="text-sm border rounded p-1"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCollaborator(userId)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {Object.keys(currentProject?.collaborators || {}).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No collaborators yet</p>
                <p className="text-sm">Invite team members to collaborate on this project</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCommentsTab = () => (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card key={comment.id} className={`${comment.resolved ? 'opacity-75' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-green-800">
                    {comment.userName.charAt(0)}
                  </span>
                </div>
                <span className="font-medium text-sm">{comment.userName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(comment.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {comment.section}
                </span>
                {comment.resolved && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Resolved
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-3">{comment.content}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Reply
              </Button>
              {!comment.resolved && (
                <Button variant="outline" size="sm">
                  Mark Resolved
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {comments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No comments yet</p>
          <p className="text-sm">Comments and discussions will appear here</p>
        </div>
      )}
    </div>
  )

  const renderPermissionsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Project Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Require approval for changes</div>
                <div className="text-sm text-muted-foreground">
                  All changes must be approved by an admin before taking effect
                </div>
              </div>
              <input type="checkbox" className="toggle" />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Enable version history</div>
                <div className="text-sm text-muted-foreground">
                  Keep a detailed history of all changes made to the project
                </div>
              </div>
              <input type="checkbox" className="toggle" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Lock finalized statements</div>
                <div className="text-sm text-muted-foreground">
                  Prevent editing once statements are marked as final
                </div>
              </div>
              <input type="checkbox" className="toggle" />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Email notifications</div>
                <div className="text-sm text-muted-foreground">
                  Send email updates when comments or changes are made
                </div>
              </div>
              <input type="checkbox" className="toggle" defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Admin Access</div>
              <div className="text-xs text-muted-foreground mb-2">
                Can manage collaborators, change settings, approve changes, and delete project
              </div>
              <div className="text-sm">
                Current admins: {Object.entries(currentProject?.collaborators || {})
                  .filter(([, role]) => role === 'admin').length}
              </div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Editor Access</div>
              <div className="text-xs text-muted-foreground mb-2">
                Can edit statements, add comments, and export reports
              </div>
              <div className="text-sm">
                Current editors: {Object.entries(currentProject?.collaborators || {})
                  .filter(([, role]) => role === 'editor').length}
              </div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Viewer Access</div>
              <div className="text-xs text-muted-foreground mb-2">
                Can view statements and add comments only
              </div>
              <div className="text-sm">
                Current viewers: {Object.entries(currentProject?.collaborators || {})
                  .filter(([, role]) => role === 'viewer').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (!currentProject) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Collaboration</h1>
            <p className="text-sm text-muted-foreground">
              Manage team access and communication for {currentProject.companyName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Activity Log
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Project Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-card">
        <div className="flex">
          {[
            { id: 'collaborators', label: 'Collaborators', icon: Users },
            { id: 'comments', label: 'Comments & Reviews', icon: MessageSquare },
            { id: 'permissions', label: 'Permissions', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                  ${activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'collaborators' && renderCollaboratorsTab()}
        {activeTab === 'comments' && renderCommentsTab()}
        {activeTab === 'permissions' && renderPermissionsTab()}
      </div>
    </div>
  )
}
