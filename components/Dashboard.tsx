
import React, { useState, useEffect, useRef } from 'react';
import { User, Task, TaskStatus, Board } from '../types';
import Sidebar from './Sidebar';
import TaskList from './TaskList';
import TaskStats from './TaskStats';
import TaskModal from './TaskModal';
import MemberModal from './MemberModal';
import ConfirmModal from './ConfirmModal';

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [confirmTaskDelete, setConfirmTaskDelete] = useState<Task | null>(null);
  const [confirmBoardDelete, setConfirmBoardDelete] = useState<Board | null>(null);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];
  const userPermission = activeBoard?.members.find(m => m.userId === currentUser.id)?.permission || 'viewer';
  const canModify = userPermission === 'admin' || userPermission === 'editor';
  const isOwner = activeBoard?.ownerId === currentUser.id;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  useEffect(() => {
    const savedBoards = localStorage.getItem(`boards_${currentUser.id}`);
    const savedTasks = localStorage.getItem(`tasks_global_${currentUser.id}`);
    
    if (savedBoards && savedTasks) {
      const b = JSON.parse(savedBoards);
      setBoards(b);
      setTasks(JSON.parse(savedTasks));
      setActiveBoardId(b[0]?.id || '');
    } else {
      const initialBoards: Board[] = [
        { 
          id: 'b1', name: 'Product Roadmap', type: 'personal', ownerId: currentUser.id, 
          members: [{ userId: currentUser.id, name: currentUser.name, email: currentUser.email, permission: 'admin' }] 
        },
        { 
          id: 'b2', name: 'Frontend Refactor', type: 'group', ownerId: currentUser.id, 
          members: [
            { userId: currentUser.id, name: currentUser.name, email: currentUser.email, permission: 'admin' },
            { userId: 'u2', name: 'Sarah Chen', email: 'sarah@dev.io', permission: 'editor' }
          ] 
        }
      ];
      const initialTasks: Task[] = [
        { id: '1', content: 'Design Gateway API', status: TaskStatus.TODO, userId: currentUser.id, assignedTo: [currentUser.id], createdAt: new Date().toISOString() },
        { id: '2', content: 'Dockerize Auth Service', status: TaskStatus.IN_PROGRESS, userId: currentUser.id, assignedTo: ['u2'], createdAt: new Date().toISOString() }
      ];
      setBoards(initialBoards);
      setTasks(initialTasks);
      setActiveBoardId('b1');
      localStorage.setItem(`boards_${currentUser.id}`, JSON.stringify(initialBoards));
      localStorage.setItem(`tasks_global_${currentUser.id}`, JSON.stringify(initialTasks));
    }
  }, [currentUser.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowBoardMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const persist = (b: Board[], t: Task[]) => {
    setBoards(b);
    setTasks(t);
    localStorage.setItem(`boards_${currentUser.id}`, JSON.stringify(b));
    localStorage.setItem(`tasks_global_${currentUser.id}`, JSON.stringify(t));
  };

  const handleAddBoard = () => {
    const newBoard: Board = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Untitled Board',
      type: 'personal',
      ownerId: currentUser.id,
      members: [{ userId: currentUser.id, name: currentUser.name, email: currentUser.email, permission: 'admin' }]
    };
    persist([...boards, newBoard], tasks);
    setActiveBoardId(newBoard.id);
  };

  const handleRenameBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim()) {
      const updated = boards.map(b => b.id === activeBoardId ? { ...b, name: renameValue } : b);
      persist(updated, tasks);
    }
    setIsRenaming(false);
    setShowBoardMenu(false);
  };

  const handleDeleteBoard = (board: Board) => {
    const updated = boards.filter(b => b.id !== board.id);
    const newActiveId = updated.length > 0 ? updated[0].id : '';
    persist(updated, tasks);
    setActiveBoardId(newActiveId);
    setConfirmBoardDelete(null);
    setShowBoardMenu(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim() || !canModify) return;
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      content: newTaskContent,
      status: TaskStatus.TODO,
      userId: currentUser.id,
      assignedTo: [],
      createdAt: new Date().toISOString(),
    };
    persist(boards, [newTask, ...tasks]);
    setNewTaskContent('');
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    persist(boards, newTasks);
    if (selectedTask?.id === id) setSelectedTask({ ...selectedTask, ...updates });
  };

  const deleteTask = (task: Task) => {
    persist(boards, tasks.filter(t => t.id !== task.id));
    setConfirmTaskDelete(null);
  };

  const startRename = () => {
    setRenameValue(activeBoard?.name || '');
    setIsRenaming(true);
    setShowBoardMenu(false);
  };

  return (
    <div className="h-screen flex bg-[#f8fafc] overflow-hidden relative">
      <Sidebar 
        boards={boards} 
        activeBoardId={activeBoardId} 
        onSelectBoard={setActiveBoardId} 
        onAddBoard={handleAddBoard}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      <main className="flex-grow flex flex-col min-w-0">
        <header className="px-6 py-4 bg-white border-b flex justify-between items-center shadow-sm relative">
          <div className="flex items-center gap-4">
            <div className="relative" ref={menuRef}>
              {isRenaming ? (
                <form onSubmit={handleRenameBoard} className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => setIsRenaming(false)}
                  />
                </form>
              ) : (
                <button 
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1 -ml-3 rounded-lg transition-colors group"
                >
                  <h1 className="text-xl font-bold text-gray-900">{activeBoard?.name}</h1>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showBoardMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}

              {showBoardMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Board Settings</p>
                  </div>
                  {isOwner && (
                    <button 
                      onClick={startRename}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      Rename Board
                    </button>
                  )}
                  {isOwner && (
                    <button 
                      onClick={() => { setShowMemberModal(true); setShowBoardMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      Manage Access
                    </button>
                  )}
                  <div className="border-t my-1"></div>
                  {isOwner && (
                    <button 
                      onClick={() => { setConfirmBoardDelete(activeBoard); setShowBoardMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete Board
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex -space-x-1.5 ml-2">
               {activeBoard?.members.map(m => (
                 <div key={m.userId} className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-700 hover:z-10 cursor-help transition-all" title={`${m.name} (${m.permission})`}>
                   {m.name[0]}
                 </div>
               ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right">
               <div className="text-sm font-bold text-gray-900 leading-tight">{currentUser.name}</div>
               <div className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{currentUser.email}</div>
             </div>
             <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-sm font-bold text-white shadow-md">
                {currentUser.name[0].toUpperCase()}
             </div>
          </div>
        </header>

        {canModify && (
          <div className="px-6 py-3 border-b bg-white/50">
             <form onSubmit={handleAddTask} className="flex max-w-lg gap-2">
                <input
                  type="text"
                  placeholder="Draft a new task..."
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  className="flex-grow text-xs px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">Add Task</button>
             </form>
          </div>
        )}

        <div className="flex-grow overflow-x-auto overflow-y-hidden px-6 py-6 custom-scrollbar">
          <div className="flex gap-4 h-full items-start">
            <TaskList 
              title="To Do" 
              tasks={tasks.filter(t => t.status === TaskStatus.TODO)} 
              onUpdateStatus={(id, status) => updateTask(id, { status })} 
              onDelete={(id) => {
                const t = tasks.find(task => task.id === id);
                if (t) setConfirmTaskDelete(t);
              }}
              onTaskClick={setSelectedTask}
              targetStatus={TaskStatus.TODO}
              members={activeBoard?.members || []}
              canModify={canModify}
            />
            <TaskList 
              title="In Progress" 
              tasks={tasks.filter(t => t.status === TaskStatus.IN_PROGRESS)} 
              onUpdateStatus={(id, status) => updateTask(id, { status })} 
              onDelete={(id) => {
                const t = tasks.find(task => task.id === id);
                if (t) setConfirmTaskDelete(t);
              }}
              onTaskClick={setSelectedTask}
              targetStatus={TaskStatus.IN_PROGRESS}
              members={activeBoard?.members || []}
              canModify={canModify}
            />
            <TaskList 
              title="Done" 
              tasks={tasks.filter(t => t.status === TaskStatus.DONE)} 
              onUpdateStatus={(id, status) => updateTask(id, { status })} 
              onDelete={(id) => {
                const t = tasks.find(task => task.id === id);
                if (t) setConfirmTaskDelete(t);
              }}
              onTaskClick={setSelectedTask}
              targetStatus={TaskStatus.DONE}
              members={activeBoard?.members || []}
              canModify={canModify}
            />
          </div>
        </div>
      </main>

      {/* Floating Task Progress */}
      <div className="fixed bottom-6 right-6 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-2 min-w-[200px] z-[40]">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-900">Total Completion</span>
          <span className="text-xs font-bold text-blue-600">{completionRate}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
      </div>

      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={(updates) => updateTask(selectedTask.id, updates)}
          members={activeBoard?.members || []}
        />
      )}

      {showMemberModal && activeBoard && (
        <MemberModal 
          board={activeBoard} 
          onClose={() => setShowMemberModal(false)} 
          onUpdateBoard={(updates) => {
             const updated = boards.map(b => b.id === activeBoardId ? { ...b, ...updates } : b);
             persist(updated, tasks);
          }} 
          currentUserId={currentUser.id}
        />
      )}

      {confirmTaskDelete && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to permanently delete the task "${confirmTaskDelete.content}"?`}
          onConfirm={() => deleteTask(confirmTaskDelete)}
          onCancel={() => setConfirmTaskDelete(null)}
        />
      )}

      {confirmBoardDelete && (
        <ConfirmModal
          title="Delete Board"
          message={`Are you sure you want to delete the board "${confirmBoardDelete.name}"? This will remove all associated tasks and access for other members.`}
          onConfirm={() => handleDeleteBoard(confirmBoardDelete)}
          onCancel={() => setConfirmBoardDelete(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
