export interface Session {
  id: string;
  session_key: string;
  name: string;
  project_path: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}
