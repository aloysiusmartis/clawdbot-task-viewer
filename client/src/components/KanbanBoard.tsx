import { Task, TaskStatus } from "../types/task";

interface KanbanBoardProps {
  tasks: Task[];
}

const STATUS_COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: "pending", title: "Pending" },
  { status: "in_progress", title: "In Progress" },
  { status: "completed", title: "Completed" },
];

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {STATUS_COLUMNS.map(({ status, title }) => {
        const statusTasks = getTasksByStatus(status);

        return (
          <div key={status} className="flex flex-col gap-2">
            <div className="rounded-lg bg-muted p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">{title}</h3>
                <span className="rounded-full bg-background px-2 py-1 text-xs font-medium">
                  {statusTasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {statusTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tasks yet
                  </p>
                ) : (
                  statusTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-tight">{task.subject}</h4>
        <span className="shrink-0 text-xs text-muted-foreground">
          #{task.task_number}
        </span>
      </div>

      {task.description && (
        <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}

      {task.active_form && (
        <div className="mb-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
          {task.active_form}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Priority: {task.priority}</span>
        <span title={new Date(task.updated_at).toLocaleString()}>
          {getRelativeTime(task.updated_at)}
        </span>
      </div>
    </div>
  );
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
