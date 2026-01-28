// Database model types

export interface Session {
  id: string;
  session_key: string;
  name: string | null;
  project_path: string | null;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

export interface Task {
  id: string;
  session_id: string;
  task_number: number;
  subject: string;
  description: string | null;
  active_form: string | null;
  status: string;
  priority: number;
  blocks: string[];
  blocked_by: string[];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface TaskFile {
  id: string;
  task_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  file_path: string;
  created_at: Date;
}
