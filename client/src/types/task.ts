export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface TaskFile {
  id: string;
  task_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

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
  files?: TaskFile[];
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
