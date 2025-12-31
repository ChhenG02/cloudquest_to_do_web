
import React, { useState } from 'react';
import { Task, TaskStatus, BoardMember } from '../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  title: string;
  tasks: Task[];
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  targetStatus: TaskStatus;
  members: BoardMember[];
  canModify: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ title, tasks, onUpdateStatus, onDelete, onTaskClick, targetStatus, members, canModify }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!canModify) return;
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canModify) return;
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onUpdateStatus(taskId, targetStatus);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div 
      className={`flex flex-col w-72 flex-shrink-0 bg-[#f1f2f4] rounded-xl transition-all h-full ${isOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="px-4 py-3 flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
        <span className="text-[10px] font-bold bg-white/60 text-gray-500 px-2 py-0.5 rounded-md">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-grow overflow-y-auto px-2 pb-2 space-y-2 custom-scrollbar">
        {tasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onDelete={onDelete} 
            onDragStart={handleDragStart}
            onClick={onTaskClick}
            members={members}
            canModify={canModify}
          />
        ))}
        {tasks.length === 0 && !isOver && (
          <div className="py-6 text-center text-gray-400 text-[10px] uppercase tracking-wider">
            Empty List
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
