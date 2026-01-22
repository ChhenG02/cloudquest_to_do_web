import React from "react";
import type { BoardMember, Task, TaskStatus } from "@/types";

const DONE: TaskStatus = "DONE";

interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onClick: (task: Task) => void;
  members: BoardMember[];
  canModify: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onDelete,
  onDragStart,
  onClick,
  members,
  canModify,
}) => {
  const assignedMembers = members.filter((m) =>
    task.assignedTo.includes(m.userId),
  );

  const isOverdue =
    task.deadline && new Date(task.deadline) < new Date() && task.status !== DONE;

  return (
    <div
      draggable={canModify}
      onClick={() => onClick(task)}
      onDragStart={(e) => {
        if (!canModify) return;

        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.setData("fromStatus", task.status); // ✅ keep
        e.dataTransfer.effectAllowed = "move";

        onDragStart(e, task.id);
      }}
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group relative ${
        canModify ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <p className="text-sm text-gray-700 leading-tight break-words pr-6 font-medium">
          {task.content}
        </p>

        {canModify && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete task"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {task.deadline && (
            <div
              className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isOverdue ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
              }`}
            >
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {new Date(task.deadline).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}

          {task.description && (
            <svg
              className="w-3 h-3 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          )}
        </div>

        <div className="flex -space-x-1.5">
          {assignedMembers.map((m) => (
            <div
              key={m.userId}
              className="w-5 h-5 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[8px] font-bold text-blue-600"
              title={m.name}
            >
              {m.name[0]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
