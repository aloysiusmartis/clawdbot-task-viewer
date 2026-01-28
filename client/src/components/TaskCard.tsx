import { Task } from '../types/task';
import { Lock, AlertCircle, Edit2, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Format relative time (e.g., "2m ago")
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  // For older dates, show relative weeks/months
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

// Map priority number to pip color for background
function getPriorityPipColor(priority: number): string {
  const colors = {
    0: 'bg-gray-500',      // P0
    1: 'bg-orange-500',    // P1
    2: 'bg-yellow-500',    // P2
    3: 'bg-blue-500',      // P3
    4: 'bg-red-500',       // P4
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-500';
}

// Get status-specific styling
function getStatusStyling(status: string): string {
  switch (status) {
    case 'pending':
      return 'border-dashed opacity-100';
    case 'in_progress':
      return 'border-solid shadow-[0_0_12px_-3px_rgba(59,130,246,0.5)]';
    case 'completed':
      return 'border-solid opacity-70';
    default:
      return 'border-solid opacity-100';
  }
}

// Get status badge colors
function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-slate-700 text-slate-200';
    case 'in_progress':
      return 'bg-blue-900 text-blue-200';
    case 'completed':
      return 'bg-green-900 text-green-200';
    default:
      return 'bg-slate-700 text-slate-200';
  }
}

export function TaskCard({ task, onClick, onEdit, onDelete }: TaskCardProps) {
  const hasBlockers = task.blocked_by.length > 0;
  const blocksOthers = task.blocks.length > 0;
  const isPending = task.status === 'pending';
  const relativeTime = getRelativeTime(task.created_at);
  const priorityPipColor = getPriorityPipColor(task.priority);
  const statusStyling = getStatusStyling(task.status);
  const statusBadgeColor = getStatusBadgeColor(task.status);

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-lg border-2 border-border bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${statusStyling}`}
    >
      {/* Priority pip - left border accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${priorityPipColor}`} />

      <div className="flex items-start justify-between mb-2 gap-2">
        <h4 className="font-medium text-sm line-clamp-2 flex-1">
          #{task.task_number} {task.subject}
        </h4>
        <div className="flex gap-1 flex-shrink-0">
          {hasBlockers && (
            <div className="flex items-center text-red-500" title={`Blocked by ${task.blocked_by.length} task(s)`}>
              <Lock className="w-4 h-4" />
            </div>
          )}
          {blocksOthers && (
            <div className="flex items-center text-yellow-500" title={`Blocks ${task.blocks.length} task(s)`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs mb-2">
        <span className={`px-2 py-0.5 rounded ${statusBadgeColor}`}>
          {task.status.replace('_', ' ')}
        </span>
        <span className="text-muted-foreground text-xs">
          {relativeTime}
        </span>
      </div>

      {/* Hover actions for pending tasks */}
      {isPending && (
        <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
              title="Edit task"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Blocker/blocks info */}
      {(hasBlockers || blocksOthers) && (
        <span className="text-xs text-muted-foreground">
          {hasBlockers && `🔒 ${task.blocked_by.length}`}
          {hasBlockers && blocksOthers && ' | '}
          {blocksOthers && `⚠️ ${task.blocks.length}`}
        </span>
      )}
    </div>
  );
}
