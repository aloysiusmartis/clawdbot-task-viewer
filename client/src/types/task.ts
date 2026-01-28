export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  session_id: string;
  task_number: number;
  subject: string;
  description: string | null;
  active_form: string | null;
  status: TaskStatus;
  priority: number;
  blocks: string[];
  blocked_by: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Session {
  id: string;
  session_key: string;
  name: string | null;
  project_path: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}
