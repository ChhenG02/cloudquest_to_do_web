
import React, { useState } from 'react';
import { Task, User, BoardMember } from '../types';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  members: BoardMember[];
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onUpdate, members }) => {
  const [description, setDescription] = useState(task.description || '');
  const [deadline, setDeadline] = useState(task.deadline || '');

  const handleSave = () => {
    onUpdate({ description, deadline });
    onClose();
  };

  const toggleMember = (userId: string) => {
    const newAssigned = task.assignedTo.includes(userId)
      ? task.assignedTo.filter(id => id !== userId)
      : [...task.assignedTo, userId];
    onUpdate({ assignedTo: newAssigned });
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setDeadline(newVal);
    // Optional: immediate update for responsiveness if preferred
    // onUpdate({ deadline: newVal });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-start bg-gray-50">
          <div className="flex-grow pr-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{task.content}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>in list <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{task.status}</span></span>
              <span>•</span>
              <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                Description
              </h4>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a more detailed description..."
                className="w-full min-h-[160px] p-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none shadow-inner"
              ></textarea>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Assigned Members</h4>
              <div className="flex flex-wrap gap-2">
                {members.map(member => (
                  <button
                    key={member.userId}
                    onClick={() => toggleMember(member.userId)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shadow-sm ${
                      task.assignedTo.includes(member.userId) 
                        ? 'bg-blue-600 text-white border-blue-600 scale-105 ring-2 ring-blue-100' 
                        : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400'
                    }`}
                    title={member.name}
                  >
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Deadline</h4>
              <div className="relative group">
                <div className="flex items-center gap-2 mb-1 text-[10px] text-gray-400 font-medium">
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   Select target date
                </div>
                <input
                  type="date"
                  value={deadline}
                  onChange={handleDeadlineChange}
                  className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer shadow-sm hover:border-blue-400"
                />
              </div>
            </section>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">Save Details</button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
