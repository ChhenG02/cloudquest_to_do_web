
import React from 'react';
import { Task, TaskStatus } from '../types';

interface TaskStatsProps {
  tasks: Task[];
}

const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === TaskStatus.DONE).length;

  return (
    <div className="hidden sm:flex flex-col text-right">
      <div className="text-xs font-bold text-gray-900">{done} of {total} tasks cleared</div>
      <span className="text-[10px] text-gray-500 uppercase font-semibold">Active Board Stats</span>
    </div>
  );
};

export default TaskStats;
