
import React from 'react';
import { Board, User } from '../types';

interface SidebarProps {
  boards: Board[];
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
  onAddBoard: () => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  boards, 
  activeBoardId, 
  onSelectBoard, 
  onAddBoard, 
  currentUser,
  onLogout
}) => {
  return (
    <div className="w-64 bg-gray-900 text-gray-300 flex flex-col h-full border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">Q</div>
          <span className="font-bold text-white tracking-tight text-lg">CloudQuest</span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
        <div className="px-3 py-4 flex justify-between items-center">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Workspace Boards</h4>
          <button 
            onClick={onAddBoard} 
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-md"
            title="Create New Board"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          {boards.map(board => (
            <div
              key={board.id}
              onClick={() => onSelectBoard(board.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                activeBoardId === board.id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3 flex-grow min-w-0">
                <div className={`w-2 h-2 rounded-full ${activeBoardId === board.id ? 'bg-white' : 'bg-gray-600 group-hover:bg-blue-400'}`}></div>
                <span className="truncate block font-medium">{board.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-gray-800 bg-gray-900/50">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-red-900/10 hover:bg-red-900/30 text-red-400 rounded-lg text-xs font-bold transition-all border border-red-500/10 hover:border-red-500/30 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
