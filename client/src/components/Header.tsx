import { useState, useEffect, useRef } from 'react';
import { Search, X, RefreshCw, Plus, ChevronDown, Check } from 'lucide-react';
import type { Task } from '../types/task';
import type { Session } from '../types/session';
import { cn } from '../lib/utils';

interface HeaderProps {
  onTaskSelect: (task: Task) => void;
  onRefresh: () => void;
  onCreateTask: () => void;
  health: {
    status: string;
    services: {
      database: string;
      redis: string;
    };
  } | null;
  isLoading?: boolean;
  selectedSession: string | null;
  onSessionChange: (sessionKey: string | null) => void;
}

// Health LED component
function HealthLED({ service, status }: { service: string; status: string }) {
  const isHealthy = status === 'ok' || status === 'healthy';

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          'w-2 h-2 rounded-full transition-opacity',
          isHealthy
            ? 'bg-green-500 animate-pulse'
            : 'bg-red-500 animate-pulse'
        )}
      />
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {service}
      </span>
    </div>
  );
}

// Search dropdown component
function HeaderSearch({ onTaskSelect }: { onTaskSelect: (task: Task) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);

    try {
      const params = new URLSearchParams();
      params.append('q', value.trim());
      params.append('sort', 'updated_at');
      params.append('order', 'DESC');

      const response = await fetch(`/api/v1/sessions/search/query?${params}`);

      if (response.ok) {
        const data = await response.json();
        setResults((data.tasks || []).slice(0, 5)); // Limit to 5 results
      }
    } catch (err) {
      console.error('Error searching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = (task: Task) => {
    onTaskSelect(task);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-xs">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={query}
          onChange={handleSearch}
          onFocus={() => query && setShowResults(true)}
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-2 text-center text-sm text-muted-foreground">
              No tasks found
            </div>
          ) : (
            <ul className="divide-y">
              {results.map((task) => (
                <li key={task.id}>
                  <button
                    onClick={() => handleTaskSelect(task)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex flex-col gap-0.5"
                  >
                    <div className="font-medium truncate">{task.subject}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {task.description}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Session filter dropdown component
interface SessionDropdownProps {
  selectedSession: string | null;
  onSessionChange: (sessionKey: string | null) => void;
}

function SessionDropdown({ selectedSession, onSessionChange }: SessionDropdownProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/v1/sessions');
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const data = await response.json();
        setSessions(data.sessions || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch sessions'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isRecentlyActive = (lastActivityAt: string): boolean => {
    const lastActivity = new Date(lastActivityAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastActivity > oneHourAgo;
  };

  const handleSelect = (sessionKey: string | null) => {
    onSessionChange(sessionKey);
    setIsOpen(false);
  };

  const selectedSessionData = sessions.find(s => s.session_key === selectedSession);
  const displayName = selectedSessionData 
    ? (selectedSessionData.name || selectedSessionData.session_key.slice(0, 8) + '...')
    : 'All Sessions';

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background hover:bg-accent text-sm transition-colors min-w-32",
          selectedSession ? "border-primary/50" : "border-input"
        )}
      >
        <span className="truncate max-w-24">{displayName}</span>
        <span className="text-xs text-muted-foreground">
          ({sessions.length})
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-72 bg-card border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Loading sessions...
            </div>
          ) : error ? (
            <div className="p-3 text-center text-sm text-destructive">
              {error}
            </div>
          ) : (
            <ul className="divide-y">
              {/* All Sessions option */}
              <li>
                <button 
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2",
                    !selectedSession && "bg-accent"
                  )}
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      All Sessions
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Show tasks from all sessions
                    </div>
                  </div>
                  {!selectedSession && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              </li>
              
              {sessions.length === 0 ? (
                <li className="p-3 text-center text-sm text-muted-foreground">
                  No active sessions
                </li>
              ) : (
                sessions.map((session) => (
                  <li key={session.id}>
                    <button 
                      onClick={() => handleSelect(session.session_key)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2",
                        selectedSession === session.session_key && "bg-accent"
                      )}
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isRecentlyActive(session.last_activity_at) && (
                          <div
                            className="w-2 h-2 rounded-full bg-green-500"
                            title="Recently active (within last hour)"
                          />
                        )}
                        {selectedSession === session.session_key && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function Header({
  onTaskSelect,
  onRefresh,
  onCreateTask,
  health,
  isLoading,
  selectedSession,
  onSessionChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="h-16 px-4 py-2 flex items-center justify-between gap-4">
        {/* Logo and title */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-bold text-foreground whitespace-nowrap">
            ClawdBot
          </h1>
        </div>

        {/* Search bar */}
        <HeaderSearch onTaskSelect={onTaskSelect} />

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Health LEDs */}
          {health && (
            <div className="flex items-center gap-3 pl-2 border-l border-border">
              <HealthLED
                service="DB"
                status={health.services.database}
              />
              <HealthLED
                service="Redis"
                status={health.services.redis}
              />
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center justify-center p-1.5 border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={cn('w-4 h-4', isLoading && 'animate-spin')}
            />
          </button>

          {/* Sessions filter dropdown */}
          <SessionDropdown 
            selectedSession={selectedSession}
            onSessionChange={onSessionChange}
          />

          {/* New Task button */}
          <button
            onClick={onCreateTask}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
            title="Create new task"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>
    </header>
  );
}
