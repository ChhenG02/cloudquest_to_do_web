
import React, { useState } from 'react';
import { Board, BoardMember, Permission } from '../types';

interface MemberModalProps {
  board: Board;
  onClose: () => void;
  onUpdateBoard: (updates: Partial<Board>) => void;
  currentUserId: string;
}

const MemberModal: React.FC<MemberModalProps> = ({ board, onClose, onUpdateBoard, currentUserId }) => {
  const [email, setEmail] = useState('');
  const isOwner = board.ownerId === currentUserId;

  const handleAddMember = () => {
    if (!email) return;
    const newMember: BoardMember = {
      userId: Math.random().toString(36).substr(2, 9),
      name: email.split('@')[0],
      email: email,
      permission: 'editor'
    };
    onUpdateBoard({ members: [...board.members, newMember] });
    setEmail('');
  };

  const removeMember = (userId: string) => {
    if (userId === board.ownerId) return;
    onUpdateBoard({ members: board.members.filter(m => m.userId !== userId) });
  };

  const changePermission = (userId: string, permission: Permission) => {
    onUpdateBoard({
      members: board.members.map(m => m.userId === userId ? { ...m, permission } : m)
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Access</h2>
            <p className="text-xs text-gray-500">Board: {board.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {isOwner && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Invite by Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="team@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-grow text-sm px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
                <button onClick={handleAddMember} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Invite</button>
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Members & Roles</label>
            {board.members.map(member => (
              <div key={member.userId} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {member.name} {member.userId === board.ownerId && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded ml-1 font-normal">Owner</span>}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{member.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    disabled={!isOwner || member.userId === board.ownerId}
                    value={member.permission}
                    onChange={(e) => changePermission(member.userId, e.target.value as Permission)}
                    className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-gray-600 hover:text-blue-600 transition-colors py-1"
                  >
                    <option value="admin">Admin (Full)</option>
                    <option value="editor">Editor (Edit)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                  {isOwner && member.userId !== board.ownerId && (
                    <button 
                      onClick={() => removeMember(member.userId)} 
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Remove Member"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 text-[10px] text-gray-400 border-t flex flex-col gap-1">
          <p><strong>Admin:</strong> Can manage members and edit all tasks.</p>
          <p><strong>Editor:</strong> Can edit and move tasks.</p>
          <p><strong>Viewer:</strong> Can only view the board.</p>
        </div>
      </div>
    </div>
  );
};

export default MemberModal;
