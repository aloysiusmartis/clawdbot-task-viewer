import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  totalTasks: number;
  onTaskClick: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function KanbanColumn({
  status,
  tasks,
  totalTasks,
  onTaskClick,
  onTaskDelete,
}: KanbanColumnProps) {
  const count = tasks.length;
  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
  const columnTitle = status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ').substring(1);

  return (
    <div className="flex flex-col h-full min-w-80 bg-muted rounded-lg border border-border">
      {/* Column Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">
          {columnTitle} ({count})
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {percentage}% of total
        </p>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={status} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-4 transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-card/50 ring-2 ring-primary/50'
                : ''
            }`}
          >
            {/* Tasks */}
            {count > 0 ? (
              <div className="space-y-3">
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
                        className={`transition-all ${
                          snapshot.isDragging
                            ? 'shadow-lg scale-105 z-50'
                            : ''
                        }`}
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
              <div className="h-full flex items-center justify-center text-center">
                <div className="text-muted-foreground">
                  <p className="text-sm">No tasks</p>
                  <p className="text-xs mt-1">
                    Drag tasks here to get started
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
