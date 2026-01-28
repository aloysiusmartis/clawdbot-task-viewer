import { useEffect, useState, useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Task, Session } from "./types/task";
import { TaskDetailDialog } from "./components/TaskDetailDialog";
import { TaskCreateDialog } from "./components/TaskCreateDialog";
import { SessionsSidebar } from "./components/SessionsSidebar";
import { TaskSearch } from "./components/TaskSearch";
import { KanbanColumn } from "./components/KanbanColumn";
import { Plus, RefreshCw } from "lucide-react";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedSession, _setSelectedSession] = useState<string | null>(null);

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

  const handleDragEnd = (result: DropResult) => {
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

    // Reorder tasks within the same column (for now)
    // Full cross-column drag-drop would require status update via API
    if (destination.droppableId === source.droppableId) {
      const status = source.droppableId as 'pending' | 'in_progress' | 'completed';
      const columnTasks = tasks.filter(t => t.status === status);
      const draggedTask = columnTasks.find(t => t.id === draggableId);

      if (draggedTask) {
        const newTasks = columnTasks.filter(t => t.id !== draggableId);
        newTasks.splice(destination.index, 0, draggedTask);

        const updatedTasks = tasks.map(t => {
          if (t.status === status) {
            return { ...t };
          }
          return t;
        });

        setTasks(updatedTasks);
      }
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            ClawdBot Task Viewer
          </h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SessionsSidebar />

        <main className="flex-1 overflow-y-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Tasks</h2>
              {tasksLoading && (
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAllTasks()}
                className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm"
                title="Refresh tasks"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            </div>
          </div>
          <TaskSearch onTaskSelect={handleTaskClick} />

          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">System Status</h2>
            {error ? (
              <p className="text-destructive">Error: {error}</p>
            ) : health ? (
              <div className="space-y-2">
                <p>
                  Status:{" "}
                  <span
                    className={
                      health.status === "healthy"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {health.status}
                  </span>
                </p>
                <p>Database: {health.services.database}</p>
                <p>Redis: {health.services.redis}</p>
                <p className="text-sm text-muted-foreground">
                  Last checked: {health.timestamp}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Loading...</p>
            )}
          </section>

          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Kanban Board</h2>
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-3 gap-4 h-96">
                <KanbanColumn
                  status="pending"
                  tasks={pendingTasks}
                  totalTasks={tasks.length}
                  onTaskClick={handleTaskClick}
                />
                <KanbanColumn
                  status="in_progress"
                  tasks={inProgressTasks}
                  totalTasks={tasks.length}
                  onTaskClick={handleTaskClick}
                />
                <KanbanColumn
                  status="completed"
                  tasks={completedTasks}
                  totalTasks={tasks.length}
                  onTaskClick={handleTaskClick}
                />
              </div>
            </DragDropContext>
          </section>

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
      </main>
      </div>
    </div>
  );
}

export default App;
