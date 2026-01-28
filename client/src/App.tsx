import { useEffect, useState } from "react";
import { KanbanBoard } from "./components/KanbanBoard";
import type { Task, TaskListResponse } from "./types/task";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

// Default session key for demo purposes
// In production, this would come from URL params or user input
const DEFAULT_SESSION_KEY = "default-session";

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessionKey, setSessionKey] = useState<string>(DEFAULT_SESSION_KEY);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Fetch health status on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  // Fetch tasks from the API
  const fetchTasks = async (key: string) => {
    try {
      const response = await fetch(`/api/v1/sessions/${key}/tasks`);

      if (response.status === 404) {
        // Session doesn't exist yet, return empty tasks
        setTasks([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data: TaskListResponse = await response.json();
      setTasks(data.tasks);
      setLastFetch(new Date());
    } catch (err) {
      console.error("Error fetching tasks:", err);
      // Don't set error state to avoid disrupting the UI
    }
  };

  // Poll for tasks every 2 seconds
  useEffect(() => {
    // Initial fetch
    fetchTasks(sessionKey);

    // Set up polling interval
    const interval = setInterval(() => {
      fetchTasks(sessionKey);
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [sessionKey]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            ClawdBot Task Viewer
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Kanban Board</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="sessionKey" className="text-sm font-medium">
                    Session:
                  </label>
                  <input
                    id="sessionKey"
                    type="text"
                    value={sessionKey}
                    onChange={(e) => setSessionKey(e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                    placeholder="Enter session key"
                  />
                </div>
                {lastFetch && (
                  <span className="text-xs text-muted-foreground">
                    Updated: {lastFetch.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            <KanbanBoard tasks={tasks} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
