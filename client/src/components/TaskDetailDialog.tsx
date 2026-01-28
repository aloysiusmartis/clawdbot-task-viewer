import { useState, useEffect } from 'react';
import { Task, TaskFile } from '../types/task';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Lock, AlertCircle, FileText, Edit2 } from 'lucide-react';
import { TaskEditDialog } from './TaskEditDialog';

interface TaskDetailDialogProps {
  task: Task | null;
  allTasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetailDialog({ task, allTasks, open, onOpenChange, onTaskUpdated, onTaskDeleted }: TaskDetailDialogProps) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (open && task) {
      fetchFiles();
    }
  }, [open, task?.id]);

  const fetchFiles = async () => {
    if (!task) return;

    setFilesLoading(true);
    setFilesError(null);

    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/files`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setFilesError('Failed to load file attachments');
    } finally {
      setFilesLoading(false);
    }
  };

  if (!task) return null;

  const getTaskById = (id: string) => allTasks.find(t => t.id === id);

  const handleTaskUpdated = (updatedTask: Task) => {
    if (onTaskUpdated) {
      onTaskUpdated(updatedTask);
    }
    // Refresh files after task update
    fetchFiles();
  };

  const handleFilesUpdated = (updatedFiles: TaskFile[]) => {
    setFiles(updatedFiles);
  };

  const blockedByTasks = task.blocked_by.map(id => getTaskById(id)).filter(Boolean) as Task[];
  const blocksTasks = task.blocks.map(id => getTaskById(id)).filter(Boolean) as Task[];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
          <Dialog.Title className="text-xl font-semibold">
            Task #{task.task_number}: {task.subject}
          </Dialog.Title>
          {task.status === 'pending' && (
            <button
              onClick={() => setEditDialogOpen(true)}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
              title="Edit pending task"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

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
              <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                File Attachments
              </h3>
              {filesLoading ? (
                <p className="text-sm text-gray-500">Loading files...</p>
              ) : filesError ? (
                <p className="text-sm text-red-600">{filesError}</p>
              ) : files.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No file attachments</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={`/api/v1/tasks/${task.id}/files/${file.id}`}
                      className="flex items-center gap-2 p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm text-blue-600 hover:text-blue-800"
                      download
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-gray-500">
                          {file.content_type || 'application/octet-stream'}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

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

      {task.status === 'pending' && (
        <TaskEditDialog
          task={task}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={onTaskDeleted}
          files={files}
          onFilesUpdated={handleFilesUpdated}
        />
      )}
    </Dialog.Root>
  );
}
