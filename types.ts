// types.ts

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

// Your UI Task (used by TaskItem/TaskList right now)
export interface Task {
  id: string;
  content: string;          // UI uses "content"
  status: TaskStatus;
  // optional fields used in UI components:
  description?: string;
  deadline?: string;
  assignedTo: string[];
  userId?: string;
  createdAt?: string;
}

// API task
export interface ApiTask {
  id: string;
  boardId: string;
  name: string;
  status: TaskStatus;
}

// Board from your API
export interface Board {
  id: string;
  name: string;
  ownerId: string;

  // Optional fields your old UI referenced; safe to keep optional
  type?: 'personal' | 'group';
  members?: BoardMember[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
}

export interface BoardMember {
  userId: string;
  name: string;
  email: string;
  role: BoardRole;
}

export type BoardRole = "OWNER" | "EDITOR" | "VIEWER";

// export type Permission = 'admin' | 'editor' | 'viewer';