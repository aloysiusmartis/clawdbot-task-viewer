export type TaskStatus = "pending" | "in_progress" | "completed";

export interface Task {
  id: string;
  session_id: string;
  task_number: number;
  subject: string;
  description?: string;
  active_form?: string;
  status: TaskStatus;
  priority: number;
  blocks?: string[];
  blocked_by?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TaskListResponse {
  sessionKey: string;
  tasks: Task[];
}
