import { useEffect, useState } from 'react';
import { Task, Session } from '../types/task';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus } from 'lucide-react';

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: (task: Task) => void;
  allTasks: Task[];
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  onTaskCreated,
  allTasks,
}: TaskCreateDialogProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Fetch sessions when dialog opens
  useEffect(() => {
    if (open) {
      fetchSessions();
    }
  }, [open]);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await fetch('/api/v1/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
      // Auto-select first session
      if (data.sessions && data.sessions.length > 0) {
        setSelectedSession(data.sessions[0]);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const generateTaskNumber = (): number => {
    // Find the max task_number in all tasks and add 1
    if (allTasks.length === 0) return 1;
    const maxNumber = Math.max(...allTasks.map(t => t.task_number));
    return maxNumber + 1;
  };

  const handleCreate = async () => {
    // Validation
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!selectedSession) {
      setError('Please select a session');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const taskNumber = generateTaskNumber();

      // Create task
      const response = await fetch(`/api/v1/sessions/${selectedSession.session_key}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_number: taskNumber,
          subject: subject.trim(),
          description: description.trim() || null,
          priority: parseInt(String(priority), 10),
          status: 'pending',
          metadata: { source: 'user' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create task');
      }

      const data = await response.json();
      const newTask: Task = data.task;

      // Handle file upload if a file was selected
      if (fileInput) {
        const formData = new FormData();
        formData.append('file', fileInput);

        const uploadResponse = await fetch(`/api/v1/tasks/${newTask.id}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          console.warn('File upload failed, but task was created');
        }
      }

      // Reset form
      setSubject('');
      setDescription('');
      setPriority(0);
      setFileInput(null);

      onTaskCreated(newTask);
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Create New Task
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
                Session <span className="text-red-500">*</span>
              </label>
              {sessionsLoading ? (
                <div className="px-3 py-2 border border-gray-300 rounded-md text-gray-500 text-sm">
                  Loading sessions...
                </div>
              ) : (
                <select
                  value={selectedSession?.id || ''}
                  onChange={(e) => {
                    const session = sessions.find(s => s.id === e.target.value);
                    setSelectedSession(session || null);
                  }}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Select a session...</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name || session.session_key}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter task subject"
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
                placeholder="Enter task description (optional)"
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

              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Attach file</span>
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

            <div className="border-t pt-4 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
              >
                {isLoading ? 'Creating...' : 'Create Task'}
              </button>
              <button
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
