import { useEffect, useState, useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus, Session } from "./types/task";
import { TaskDetailDialog } from "./components/TaskDetailDialog";
import { TaskCreateDialog } from "./components/TaskCreateDialog";
import { KanbanColumn } from "./components/KanbanColumn";
import { Header } from "./components/Header";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

// Column configuration for the 5-column Kanban
const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'backlog', title: 'Backlog' },
  { status: 'pending', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'blocked', title: 'Blocked' },
  { status: 'completed', title: 'Done' },
];

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fetch all tasks from all sessions
  const fetchAllTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      
      // First get all sessions
      const sessionsRes = await fetch("/api/v1/sessions");
      if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");
      const sessionsData = await sessionsRes.json();
      const sessions: Session[] = sessionsData.sessions || [];

      // If a session is selected, only fetch tasks for that session
      if (selectedSession) {
        const tasksRes = await fetch(`/api/v1/sessions/${selectedSession}/tasks`);
        if (!tasksRes.ok) throw new Error("Failed to fetch tasks");
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      } else {
        // Fetch tasks from all sessions
        const allTasks: Task[] = [];
        for (const session of sessions) {
          try {
            const tasksRes = await fetch(`/api/v1/sessions/${session.session_key}/tasks`);
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              allTasks.push(...(tasksData.tasks || []));
            }
          } catch {
            console.warn(`Failed to fetch tasks for session ${session.session_key}`);
          }
        }
        setTasks(allTasks);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [selectedSession]);

  // Fetch health status
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  // Fetch tasks on mount and when session changes
  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  // Poll for task updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchAllTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchAllTasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    // Update the selected task and refresh list
    setSelectedTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleTaskCreated = (newTask: Task) => {
    // Add the new task and refresh
    setTasks(prev => [...prev, newTask]);
    fetchAllTasks();
  };

  const handleTaskDeleted = () => {
    fetchAllTasks();
    setDialogOpen(false);
    setSelectedTask(null);
  };

  const handleQuickDelete = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      fetchAllTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/v1/sessions/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      return true;
    } catch (err) {
      console.error('Error updating task status:', err);
      return false;
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside of a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;
    const draggedTask = tasks.find(t => t.id === draggableId);

    if (!draggedTask) return;

    // Cross-column drag: update status via API
    if (sourceStatus !== destStatus) {
      // Optimistic update
      const previousTasks = [...tasks];
      setTasks(prev => prev.map(t => 
        t.id === draggableId ? { ...t, status: destStatus } : t
      ));

      // Call API
      const success = await updateTaskStatus(draggableId, destStatus);
      if (!success) {
        // Rollback on failure
        setTasks(previousTasks);
      }
    }
  };

  // Get tasks for each column, sorted by priority (lower number = higher priority)
  const getColumnTasks = (status: TaskStatus) => {
    return tasks
      .filter(t => t.status === status)
      .sort((a, b) => a.priority - b.priority);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Header
        onTaskSelect={handleTaskClick}
        onRefresh={fetchAllTasks}
        onCreateTask={() => setCreateDialogOpen(true)}
        health={health}
        isLoading={tasksLoading}
        selectedSession={selectedSession}
        onSessionChange={setSelectedSession}
      />

      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            Error: {error}
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(({ status }) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                totalTasks={tasks.length}
                onTaskClick={handleTaskClick}
                onTaskDelete={handleQuickDelete}
              />
            ))}
          </div>
        </DragDropContext>
      </main>

      <TaskDetailDialog
        task={selectedTask}
        allTasks={tasks}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        allTasks={tasks}
      />
    </div>
  );
}

export default App;
