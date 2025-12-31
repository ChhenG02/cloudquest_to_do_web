
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  DONE = 'done'
}

export type Permission = 'admin' | 'editor' | 'viewer';

export interface BoardMember {
  userId: string;
  name: string;
  email: string;
  permission: Permission;
}

export interface Board {
  id: string;
  name: string;
  type: 'personal' | 'group';
  ownerId: string;
  members: BoardMember[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Task {
  id: string;
  content: string;
  description?: string;
  status: TaskStatus;
  userId: string;
  assignedTo: string[]; // User IDs
  deadline?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}
