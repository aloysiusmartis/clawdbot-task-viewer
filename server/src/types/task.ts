export interface Task {
  id: string;
  session_id: string;
  task_number: number;
  subject: string;
  description?: string;
  active_form?: string;
  status: "pending" | "in_progress" | "completed";
  priority: number;
  blocks?: string[];
  blocked_by?: string[];
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface TaskListResponse {
  tasks: Task[];
  sessionKey: string;
}
