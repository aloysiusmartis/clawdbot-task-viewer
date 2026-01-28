import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';
import { cn } from '../lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  totalTasks: number;
  onTaskClick: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

// Column display configuration
const COLUMN_CONFIG: Record<TaskStatus, { title: string; color: string; bgColor: string }> = {
  backlog: { 
    title: 'Backlog', 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10'
  },
  pending: { 
    title: 'To Do', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10'
  },
  in_progress: { 
    title: 'In Progress', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10'
  },
  blocked: { 
    title: 'Blocked', 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10'
  },
  completed: { 
    title: 'Done', 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  },
};

export function KanbanColumn({
  status,
  tasks,
  totalTasks,
  onTaskClick,
  onTaskDelete,
}: KanbanColumnProps) {
  const count = tasks.length;
  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
  const config = COLUMN_CONFIG[status];
  
  // Calculate total story points (using priority as proxy, or could use a dedicated field)
  const points = tasks.reduce((sum, t) => sum + (t.priority || 0), 0);

  return (
    <div className="flex flex-col h-full w-72 min-w-72 bg-muted/50 rounded-lg border border-border">
      {/* Column Header */}
      <div className={cn("p-3 border-b border-border rounded-t-lg", config.bgColor)}>
        <div className="flex items-center justify-between">
          <h3 className={cn("font-semibold", config.color)}>
            {config.title}
          </h3>
          <span className="text-xs bg-background/50 px-2 py-0.5 rounded-full text-muted-foreground">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {percentage}% • {points} pts
          </span>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={status} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto p-2 transition-colors",
              snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/30 ring-inset"
            )}
          >
            {/* Tasks */}
            {count > 0 ? (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(
                          "transition-all",
                          snapshot.isDragging && "shadow-lg scale-[1.02] z-50 rotate-1"
                        )}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => onTaskClick(task)}
                          onEdit={() => onTaskClick(task)}
                          onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center py-8">
                <div className="text-muted-foreground/50">
                  <p className="text-sm">No tasks</p>
                  <p className="text-xs mt-1">
                    Drag tasks here
                  </p>
                </div>
              </div>
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
