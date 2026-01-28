import { Task } from '../types/task';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Lock, AlertCircle } from 'lucide-react';

interface TaskDetailDialogProps {
  task: Task | null;
  allTasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ task, allTasks, open, onOpenChange }: TaskDetailDialogProps) {
  if (!task) return null;

  const getTaskById = (id: string) => allTasks.find(t => t.id === id);

  const blockedByTasks = task.blocked_by.map(id => getTaskById(id)).filter(Boolean) as Task[];
  const blocksTasks = task.blocks.map(id => getTaskById(id)).filter(Boolean) as Task[];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Task #{task.task_number}: {task.subject}
          </Dialog.Title>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Description</h3>
              <p className="text-sm">{task.description || 'No description provided'}</p>
            </div>

            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Status</h3>
              <span className={`inline-block px-2 py-1 rounded text-sm ${
                task.status === 'completed' ? 'bg-green-100 text-green-700' :
                task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>

            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Priority</h3>
              <p className="text-sm">Level {task.priority}</p>
            </div>

            {blockedByTasks.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-sm mb-2 flex items-center gap-2 text-red-600">
                  <Lock className="w-4 h-4" />
                  Blocked By ({blockedByTasks.length})
                </h3>
                <div className="space-y-2">
                  {blockedByTasks.map((blockerTask) => (
                    <div key={blockerTask.id} className="rounded border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-medium">
                        #{blockerTask.task_number} {blockerTask.subject}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Status: <span className="capitalize">{blockerTask.status.replace('_', ' ')}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blocksTasks.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-sm mb-2 flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="w-4 h-4" />
                  Blocks ({blocksTasks.length})
                </h3>
                <div className="space-y-2">
                  {blocksTasks.map((blockedTask) => (
                    <div key={blockedTask.id} className="rounded border border-yellow-200 bg-yellow-50 p-3">
                      <p className="text-sm font-medium">
                        #{blockedTask.task_number} {blockedTask.subject}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Status: <span className="capitalize">{blockedTask.status.replace('_', ' ')}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blockedByTasks.length === 0 && blocksTasks.length === 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 italic">
                  This task has no dependencies.
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-medium text-sm text-gray-500 mb-1">Created</h3>
              <p className="text-sm">{new Date(task.created_at).toLocaleString()}</p>
            </div>

            {task.completed_at && (
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-1">Completed</h3>
                <p className="text-sm">{new Date(task.completed_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
