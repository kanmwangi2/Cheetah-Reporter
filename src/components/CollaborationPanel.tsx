import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useAuth } from '../contexts/useAuth'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Input } from './ui/Input'
import { Badge } from './ui/badge'
import { Avatar } from './ui/avatar'
import { 
  UserPlus, 
  Users, 
  Mail, 
  Settings, 
  MessageSquare, 
  Clock, 
  Shield,
  GitBranch,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  MessageCircle,
  Workflow,
  ChevronDown,
  MoreHorizontal,
  Timer,
  Calendar,
  Star,
  ThumbsUp,
  Reply,
  AtSign,
  Tag,
  Search,
  RefreshCw
} from 'lucide-react'
import { CollaborationService, type UserPresence, type CollaborativeEdit } from '../lib/collaborationService'
import { WorkflowService, type WorkflowInstance } from '../lib/workflowService'
import { VersionControlService, type DocumentVersion, type Branch } from '../lib/versionControl'
import { 
  subscribeToComments, 
  addReaction, 
  resolveComment,
  type AdvancedComment
} from '../lib/commentService'

interface CollaboratorInvite {
  email: string
  role: 'admin' | 'editor' | 'viewer'
  message?: string
}

interface ConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  conflicts: CollaborativeEdit[]
  onResolve: (resolution: Record<string, 'accept' | 'reject'>) => void
}

const ConflictResolutionDialog: React.FC<ConflictDialogProps> = ({ 
  isOpen, 
  onClose, 
  conflicts, 
  onResolve 
}) => {
  const [resolution, setResolution] = useState<Record<string, 'accept' | 'reject'>>({})

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Resolve Conflicts ({conflicts.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{conflict.operation}</Badge>
                    <span className="text-sm text-gray-600">
                      by {conflict.userName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(conflict.timestamp.toMillis()).toLocaleTimeString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Section:</label>
                    <p className="text-sm text-gray-600">{conflict.sectionId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Changes:</label>
                    <pre className="text-xs bg-gray-100 p-2 rounded">
                      {JSON.stringify(conflict.content, null, 2)}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setResolution({ ...resolution, [conflict.id]: 'accept' })}
                    >
                      Accept This Change
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setResolution({ ...resolution, [conflict.id]: 'reject' })}
                    >
                      Reject This Change
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(resolution)}>
            Apply Resolution
          </Button>
        </div>
      </div>
    </div>
  )
}

export const CollaborationPanel: React.FC = () => {
  const { currentProject } = useProjectStore()
  const { user, userProfile } = useAuth()
  
  // State management
  const [activeTab, setActiveTab] = useState<'presence' | 'comments' | 'workflow' | 'versions' | 'settings'>('presence')
  const [inviteForm, setInviteForm] = useState<CollaboratorInvite>({
    email: '',
    role: 'editor',
    message: ''
  })
  
  // Real-time collaboration state
  const [userPresence, setUserPresence] = useState<UserPresence[]>([])
  const [recentEdits, setRecentEdits] = useState<CollaborativeEdit[]>([])
  const [conflicts, setConflicts] = useState<CollaborativeEdit[]>([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  
  // Comments state
  const [comments, setComments] = useState<AdvancedComment[]>([])
  const [commentFilter, setCommentFilter] = useState<'all' | 'unresolved' | 'mentions'>('unresolved')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Workflow state
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<Array<{
    workflow: WorkflowInstance;
    stageIndex: number;
    stage: { stageName: string; status: string; assignedTo: string[] }; // Simplified type
  }>>([])

  // Version control state
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentBranch, setCurrentBranch] = useState<string>('main')

  // Initialize real-time collaboration
  useEffect(() => {
    if (!currentProject || !user || !userProfile) return

    const initializeCollaboration = async () => {
      // Initialize presence
      await CollaborationService.initializePresence(
        user.uid,
        userProfile.firstName + ' ' + userProfile.lastName,
        userProfile.email,
        currentProject.id,
        'dashboard',
        undefined
      )

      // Subscribe to presence updates
      const unsubscribePresence = CollaborationService.subscribeToPresence(
        currentProject.id,
        setUserPresence
      )

      // Subscribe to collaborative edits
      const unsubscribeEdits = CollaborationService.subscribeToEdits(
        currentProject.id,
        'dashboard',
        (edits) => {
          setRecentEdits(edits)
          // Check for conflicts
          const conflictingEdits = edits.filter(edit => 
            edit.userId !== user.uid && !edit.acknowledged
          )
          if (conflictingEdits.length > 0) {
            setConflicts(conflictingEdits)
          }
        }
      )

      // Subscribe to workflows
      const unsubscribeWorkflows = WorkflowService.subscribeToProjectWorkflows(
        currentProject.id,
        setWorkflows
      )

      // Get pending approvals
      const approvals = await WorkflowService.getUserPendingApprovals(user.uid)
      setPendingApprovals(approvals)

      return () => {
        unsubscribePresence()
        unsubscribeEdits()
        unsubscribeWorkflows()
        CollaborationService.cleanup()
      }
    }

    const cleanup = initializeCollaboration()
    return () => {
      cleanup.then(fn => fn && fn())
    }
  }, [currentProject, user, userProfile])

  // Subscribe to comments
  useEffect(() => {
    if (!currentProject) return

    const unsubscribe = subscribeToComments(
      currentProject.id,
      null, // All comments
      {
        includeResolved: commentFilter === 'all',
        orderBy: 'createdAt'
      },
      setComments
    )

    return unsubscribe
  }, [currentProject, commentFilter])

  // Load version history
  useEffect(() => {
    if (!currentProject) return

    const loadVersions = async () => {
      try {
        const versionHistory = await VersionControlService.getVersionHistory(
          currentProject.id,
          currentBranch
        )
        setVersions(versionHistory)

        const branchList = await VersionControlService.getBranches(currentProject.id)
        setBranches(branchList)
      } catch (error) {
        console.error('Error loading versions:', error)
      }
    }

    loadVersions()
  }, [currentProject, currentBranch])

  const handleInviteCollaborator = async () => {
    if (!currentProject || !inviteForm.email) return
    
    try {
      // TODO: Implement actual invitation logic
      console.log('Inviting collaborator:', inviteForm)
      setInviteForm({ email: '', role: 'editor', message: '' })
      // Show success notification
    } catch (error) {
      console.error('Error inviting collaborator:', error)
    }
  }

  const handleResolveConflicts = async (resolution: Record<string, 'accept' | 'reject'>) => {
    try {
      // Apply conflict resolution
      for (const conflict of conflicts) {
        const action = resolution[conflict.id]
        if (action === 'accept') {
          await CollaborationService.acknowledgeEdit(conflict.id)
        }
        // TODO: Implement rejection logic
      }
      setConflicts([])
      setShowConflictDialog(false)
    } catch (error) {
      console.error('Error resolving conflicts:', error)
    }
  }

  const handleCommentReaction = async (commentId: string, emoji: string) => {
    if (!currentProject || !user) return
    
    try {
      await addReaction(currentProject.id, commentId, emoji, user.uid)
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const handleResolveComment = async (commentId: string) => {
    if (!currentProject || !user) return
    
    try {
      await resolveComment(currentProject.id, commentId, user.uid)
    } catch (error) {
      console.error('Error resolving comment:', error)
    }
  }

  const formatTimeAgo = (date: Date | { seconds: number; nanoseconds: number }) => {
    const now = new Date()
    const timestamp = date instanceof Date ? date : new Date(date.seconds * 1000)
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const filteredComments = comments.filter(comment => {
    if (searchQuery && !comment.text.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    switch (commentFilter) {
      case 'unresolved':
        return !comment.isResolved
      case 'mentions':
        return comment.mentions?.includes(user?.uid || '') || false
      default:
        return true
    }
  })

  const renderPresenceTab = () => (
    <div className="space-y-4">
      {/* Conflict Resolution */}
      {conflicts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Conflicts Detected</span>
              </div>
              <Badge variant="outline" className="text-orange-700">
                {conflicts.length} conflicts
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-3">
              Multiple users have made conflicting changes. Please review and resolve.
            </p>
            <Button 
              size="sm" 
              onClick={() => setShowConflictDialog(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Resolve Conflicts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users ({userPresence.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userPresence.map(presence => (
              <div key={presence.userId} className="flex items-center gap-3 p-2 rounded-lg border">
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <img 
                      src={presence.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${presence.userName}`}
                      alt={presence.userName}
                    />
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    presence.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{presence.userName}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {presence.currentAction === 'editing' ? (
                      <Edit className="h-3 w-3" />
                    ) : presence.currentAction === 'commenting' ? (
                      <MessageCircle className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                    <span>{presence.sectionId}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(presence.lastSeen)}</span>
                  </div>
                </div>
                <Badge variant="outline">
                  {presence.currentAction || 'viewing'}
                </Badge>
              </div>
            ))}
            
            {userPresence.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No other users currently active</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEdits.slice(0, 10).map(edit => (
              <div key={edit.id} className="flex items-start gap-3 p-2 rounded border">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-800">
                    {edit.userName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{edit.userName}</span>
                    <span className="text-gray-600 ml-1">
                      {edit.operation} {edit.sectionId}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(edit.timestamp)}
                  </div>
                </div>
                <Badge variant="outline">
                  {edit.operation}
                </Badge>
              </div>
            ))}
            
            {recentEdits.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Collaborators */}
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
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'editor' | 'viewer' })}
                className="w-full p-2 border rounded-md"
              >
                <option value="viewer">Viewer - Can view reports only</option>
                <option value="editor">Editor - Can edit and comment</option>
                <option value="admin">Admin - Full access including settings</option>
              </select>
            </div>
            <Button onClick={handleInviteCollaborator} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCommentsTab = () => (
    <div className="space-y-4">
      {/* Comment Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search comments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'unresolved', 'mentions'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={commentFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommentFilter(filter)}
                >
                  {filter === 'all' && <MessageSquare className="h-4 w-4 mr-1" />}
                  {filter === 'unresolved' && <AlertCircle className="h-4 w-4 mr-1" />}
                  {filter === 'mentions' && <AtSign className="h-4 w-4 mr-1" />}
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-3">
        {filteredComments.map(comment => (
          <Card key={comment.id} className={comment.isResolved ? 'opacity-75' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <img 
                    src={comment.userAvatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.userName}`}
                    alt={comment.userName}
                  />
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                    {comment.priority && comment.priority !== 'normal' && (
                      <Badge 
                        variant="outline" 
                        className={comment.priority === 'high' ? 'border-red-200 text-red-700' : 'border-orange-200 text-orange-700'}
                      >
                        {comment.priority}
                      </Badge>
                    )}
                    {comment.isResolved && (
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">{comment.text}</p>
                  
                  {comment.tags && comment.tags.length > 0 && (
                    <div className="flex gap-1 mb-3">
                      {comment.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Reactions */}
                  {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {Object.entries(comment.reactions).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          onClick={() => handleCommentReaction(comment.id, emoji)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full border text-xs hover:bg-gray-50"
                        >
                          <span>{emoji}</span>
                          <span>{userIds.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Comment Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCommentReaction(comment.id, '👍')}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Like
                    </Button>
                    {!comment.isResolved && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleResolveComment(comment.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Thread count */}
                  {comment.threadCount && comment.threadCount > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {comment.threadCount} {comment.threadCount === 1 ? 'reply' : 'replies'}
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredComments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments found</p>
            <p className="text-sm">Comments and discussions will appear here</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderWorkflowTab = () => (
    <div className="space-y-4">
      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Timer className="h-5 w-5" />
              Pending Your Approval ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map(approval => (
                <div key={approval.workflow.id} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{approval.workflow.title}</span>
                    <Badge variant="outline">
                      Stage {approval.stageIndex + 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {approval.stage.stageName}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline">
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Active Workflows ({workflows.filter(w => w.status === 'in_progress').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflows.filter(w => w.status === 'in_progress').map(workflow => (
              <div key={workflow.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{workflow.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {workflow.priority}
                    </Badge>
                    <Badge className={
                      workflow.status === 'approved' ? 'bg-green-100 text-green-800' :
                      workflow.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {workflow.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>Started {formatTimeAgo(workflow.initiatedAt)}</span>
                  <span>•</span>
                  <span>Stage {workflow.currentStage + 1} of {workflow.metadata.totalStages}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(workflow.metadata.completedStages / workflow.metadata.totalStages) * 100}%` 
                    }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Current: {workflow.stages[workflow.currentStage]?.stageName}
                  </span>
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
            
            {workflows.filter(w => w.status === 'in_progress').length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Workflow className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active workflows</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderVersionsTab = () => (
    <div className="space-y-4">
      {/* Branch Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="text-sm font-medium">Branch:</span>
            </div>
            <select
              value={currentBranch}
              onChange={(e) => setCurrentBranch(e.target.value)}
              className="px-3 py-1 border rounded"
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.name}>
                  {branch.displayName || branch.name}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline">
              <GitBranch className="h-4 w-4 mr-1" />
              New Branch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History ({versions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div key={version.id} className="border rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">
                      v{version.versionNumber}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{version.commitMessage}</span>
                      {version.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          <Star className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{version.author.userName}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(version.timestamp)}</span>
                      <span>•</span>
                      <span>{version.metadata.changeCount} changes</span>
                    </div>
                    {version.metadata.isSnapshot && (
                      <Badge variant="outline" className="text-purple-700 border-purple-200">
                        Snapshot
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {index > 0 && (
                      <Button size="sm" variant="ghost">
                        Compare
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {versions.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No version history</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Collaboration Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: 'Real-time collaboration',
                description: 'Enable live editing and presence indicators',
                defaultChecked: true
              },
              {
                title: 'Conflict detection',
                description: 'Automatically detect and help resolve editing conflicts',
                defaultChecked: true
              },
              {
                title: 'Comment notifications',
                description: 'Send notifications for new comments and mentions',
                defaultChecked: true
              },
              {
                title: 'Workflow approvals',
                description: 'Require approval for major changes',
                defaultChecked: false
              },
              {
                title: 'Version snapshots',
                description: 'Automatically create version snapshots',
                defaultChecked: true
              }
            ].map((setting, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{setting.title}</div>
                  <div className="text-sm text-gray-600">{setting.description}</div>
                </div>
                <input 
                  type="checkbox" 
                  defaultChecked={setting.defaultChecked}
                  className="toggle" 
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (!currentProject) {
    return (
      <div className="p-6">
        <p className="text-gray-500">No project selected</p>
      </div>
    )
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Enhanced Collaboration</h1>
                <p className="text-sm text-gray-600">
                  Real-time collaboration, workflows, and version control for {currentProject.companyName}
                </p>
              </div>
            </div>
            {conflicts.length > 0 && (
              <Button 
                variant="outline" 
                className="border-orange-300 text-orange-700"
                onClick={() => setShowConflictDialog(true)}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {conflicts.length} Conflicts
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-white">
          <div className="flex">
            {[
              { id: 'presence', label: 'Live Activity', icon: Users },
              { id: 'comments', label: 'Comments', icon: MessageSquare },
              { id: 'workflow', label: 'Workflows', icon: Workflow },
              { id: 'versions', label: 'Versions', icon: History },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'presence' | 'comments' | 'workflow' | 'versions' | 'settings')}
                  className={`
                    px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                    ${activeTab === tab.id 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {/* Badge for notifications */}
                  {tab.id === 'comments' && filteredComments.filter(c => !c.isResolved).length > 0 && (
                    <Badge variant="outline">
                      {filteredComments.filter(c => !c.isResolved).length}
                    </Badge>
                  )}
                  {tab.id === 'workflow' && pendingApprovals.length > 0 && (
                    <Badge variant="outline">
                      {pendingApprovals.length}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'presence' && renderPresenceTab()}
          {activeTab === 'comments' && renderCommentsTab()}
          {activeTab === 'workflow' && renderWorkflowTab()}
          {activeTab === 'versions' && renderVersionsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        conflicts={conflicts}
        onResolve={handleResolveConflicts}
      />
    </>
  )
}
