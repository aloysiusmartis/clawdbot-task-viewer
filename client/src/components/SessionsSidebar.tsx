import { useEffect, useState } from 'react';
import { Session } from '../types/session';

interface SessionsSidebarProps {
  onSessionSelect?: (session: Session) => void;
}

export function SessionsSidebar({ onSessionSelect }: SessionsSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/v1/sessions');
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const data = await response.json();
        setSessions(data.sessions);
        setError(null);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();

    // Refresh sessions every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const isRecentlyActive = (lastActivityAt: string): boolean => {
    const lastActivity = new Date(lastActivityAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastActivity > oneHourAgo;
  };

  return (
    <aside className="w-64 border-r bg-card">
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold text-foreground">Active Sessions</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading sessions...</div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">{error}</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No active sessions</div>
          ) : (
            <ul className="space-y-2 p-4">
              {sessions.map(session => (
                <li key={session.id}>
                  <button
                    onClick={() => onSessionSelect?.(session)}
                    className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {session.name || session.session_key}
                      </div>
                      {session.project_path && (
                        <div className="text-xs text-muted-foreground truncate">
                          {session.project_path}
                        </div>
                      )}
                    </div>
                    {isRecentlyActive(session.last_activity_at) && (
                      <div
                        className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500"
                        title="Recently active (within last hour)"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
