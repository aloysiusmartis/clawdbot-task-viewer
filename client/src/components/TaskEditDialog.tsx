import { useState } from 'react';
import { Task, TaskFile } from '../types/task';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Trash2, Plus } from 'lucide-react';

interface TaskEditDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  files: TaskFile[];
  onFilesUpdated: (files: TaskFile[]) => void;
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  onTaskDeleted,
  files,
  onFilesUpdated,
}: TaskEditDialogProps) {
  const [subject, setSubject] = useState(task.subject);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Update task
      const response = await fetch(`/api/v1/sessions/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim() || null,
          priority: parseInt(String(priority), 10),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const data = await response.json();
      const updatedTask: Task = data.task;
      onTaskUpdated(updatedTask);

      // Handle file upload if a file was selected
      if (fileInput) {
        const formData = new FormData();
        formData.append('file', fileInput);

        const uploadResponse = await fetch(`/api/v1/tasks/${task.id}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        const filesData = await uploadResponse.json();
        onFilesUpdated(filesData.files || []);
        setFileInput(null);
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Error saving task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      const updatedFiles = files.filter(f => f.id !== fileId);
      onFilesUpdated(updatedFiles);
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/sessions/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      onOpenChange(false);
      // Notify parent that task was deleted
      if (onTaskDeleted) {
        onTaskDeleted(task.id);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Edit Task #{task.task_number}
          </Dialog.Title>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>

          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value={0}>None (0)</option>
                <option value={1}>Low (1)</option>
                <option value={2}>Medium (2)</option>
                <option value={3}>High (3)</option>
                <option value={4}>Critical (4)</option>
              </select>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                File Attachments
              </h3>

              {files.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 font-medium">Current files:</p>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded border border-gray-200 bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-gray-500">
                          {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(1)} KB` : 'Unknown size'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={isLoading || isDeleting}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add file</span>
                  <input
                    type="file"
                    onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                    disabled={isLoading}
                    className="hidden"
                  />
                </label>
                {fileInput && (
                  <p className="text-xs text-green-600">
                    Ready to upload: {fileInput.name}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading || isDeleting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading || isDeleting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>

              <button
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
