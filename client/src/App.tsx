import { useEffect, useState } from "react";
import { Task } from "./types/task";
import { TaskCard } from "./components/TaskCard";
import { TaskDetailDialog } from "./components/TaskDetailDialog";
import { SessionsSidebar } from "./components/SessionsSidebar";
import { TaskSearch } from "./components/TaskSearch";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

// Mock tasks with dependencies for demonstration
const mockTasks: Task[] = [
  {
    id: "task-1",
    session_id: "session-1",
    task_number: 1,
    subject: "Setup database schema",
    description: "Create initial database tables and indexes",
    active_form: null,
    status: "completed",
    priority: 2,
    blocks: ["task-2", "task-3"],
    blocked_by: [],
    metadata: {},
    created_at: "2026-01-27T10:00:00Z",
    updated_at: "2026-01-27T11:00:00Z",
    completed_at: "2026-01-27T11:00:00Z",
  },
  {
    id: "task-2",
    session_id: "session-1",
    task_number: 2,
    subject: "Implement API endpoints",
    description: "Create REST API endpoints for task management",
    active_form: "Implementing API endpoints",
    status: "in_progress",
    priority: 3,
    blocks: ["task-4"],
    blocked_by: ["task-1"],
    metadata: {},
    created_at: "2026-01-27T10:30:00Z",
    updated_at: "2026-01-27T12:00:00Z",
    completed_at: null,
  },
  {
    id: "task-3",
    session_id: "session-1",
    task_number: 3,
    subject: "Add authentication middleware",
    description: "Implement JWT-based authentication",
    active_form: null,
    status: "pending",
    priority: 1,
    blocks: [],
    blocked_by: ["task-1"],
    metadata: {},
    created_at: "2026-01-27T10:45:00Z",
    updated_at: "2026-01-27T10:45:00Z",
    completed_at: null,
  },
  {
    id: "task-4",
    session_id: "session-1",
    task_number: 4,
    subject: "Build frontend UI components",
    description: "Create React components for task visualization",
    active_form: null,
    status: "pending",
    priority: 2,
    blocks: [],
    blocked_by: ["task-2"],
    metadata: {},
    created_at: "2026-01-27T11:00:00Z",
    updated_at: "2026-01-27T11:00:00Z",
    completed_at: null,
  },
  {
    id: "task-5",
    session_id: "session-1",
    task_number: 5,
    subject: "Write unit tests",
    description: "Add test coverage for all components",
    active_form: null,
    status: "pending",
    priority: 1,
    blocks: [],
    blocked_by: [],
    metadata: {},
    created_at: "2026-01-27T11:15:00Z",
    updated_at: "2026-01-27T11:15:00Z",
    completed_at: null,
  },
];

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    // Update the selected task
    setSelectedTask(updatedTask);
  };

  const pendingTasks = mockTasks.filter(t => t.status === 'pending');
  const inProgressTasks = mockTasks.filter(t => t.status === 'in_progress');
  const completedTasks = mockTasks.filter(t => t.status === 'completed');

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
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-3 font-medium">Pending ({pendingTasks.length})</h3>
                <div className="space-y-3">
                  {pendingTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No pending tasks
                    </p>
                  ) : (
                    pendingTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-3 font-medium">In Progress ({inProgressTasks.length})</h3>
                <div className="space-y-3">
                  {inProgressTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active tasks
                    </p>
                  ) : (
                    inProgressTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-3 font-medium">Completed ({completedTasks.length})</h3>
                <div className="space-y-3">
                  {completedTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No completed tasks
                    </p>
                  ) : (
                    completedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <TaskDetailDialog
            task={selectedTask}
            allTasks={mockTasks}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onTaskUpdated={handleTaskUpdated}
          />
        </div>
      </main>
      </div>
    </div>
  );
}

export default App;
