import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Task, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';

interface TaskSearchProps {
  onTaskSelect: (task: Task) => void;
}

export function TaskSearch({ onTaskSelect }: TaskSearchProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<number | ''>('');
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!query.trim() && !status && priority === '') {
      setError('Please enter a search query or select a filter');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (query.trim()) {
        params.append('q', query.trim());
      }

      if (status) {
        params.append('status', status);
      }

      if (priority !== '') {
        params.append('priority', priority.toString());
      }

      params.append('sort', 'updated_at');
      params.append('order', 'DESC');

      const response = await fetch(`/api/v1/sessions/search/query?${params}`);

      if (!response.ok) {
        throw new Error('Failed to search tasks');
      }

      const data = await response.json();
      setResults(data.tasks || []);
      setHasSearched(true);
    } catch (err) {
      console.error('Error searching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to search tasks');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setStatus('');
    setPriority('');
    setResults([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">Search Tasks</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search by subject or description..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-10 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Priorities</option>
                <option value="0">None (0)</option>
                <option value="1">Low (1)</option>
                <option value="2">Medium (2)</option>
                <option value="3">High (3)</option>
                <option value="4">Critical (4)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClear}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </form>
      </section>

      {hasSearched && (
        <section className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">
            Search Results ({results.length})
          </h3>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading results...</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tasks found. Try adjusting your search criteria.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskSelect(task)}
                >
                  <TaskCard
                    task={task}
                    onClick={() => onTaskSelect(task)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
