import { create } from "zustand";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import type { TaskStatus } from "@/types";

export interface Task {
  id: string;
  content: string; // UI field
  status: TaskStatus;

  // optional UI fields
  assignedTo: string[];
  description?: string;
  deadline?: string;
  userId?: string;
  createdAt?: string;
}

interface ApiTask {
  id: string;
  boardId: string;
  name: string; // API field
  status: TaskStatus;
}

interface TaskState {
  tasks: Task[];
  boardId: string | null;

  isLoading: boolean;
  error: string | null;

  fetchTasksByBoard: (boardId: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  reorderColumn: (
    boardId: string,
    status: TaskStatus,
    orderedTaskIds: string[],
  ) => Promise<void>;

  // ✅ NEW: create task on backend
  createTask: (boardId: string, name: string) => Promise<Task>;

  // local helpers
  setTasks: (tasks: Task[]) => void;
  addTaskLocal: (task: Task) => void;
  updateTaskStatusLocal: (taskId: string, status: TaskStatus) => void;

  clearError: () => void;
  reset: () => void;
}

function mapApiTaskToUiTask(t: ApiTask): Task {
  return {
    id: t.id,
    content: t.name, // IMPORTANT: map name -> content
    status: t.status,
    assignedTo: [],
  };
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  boardId: null,

  isLoading: false,
  error: null,

  fetchTasksByBoard: async (boardId: string) => {
    if (!boardId) {
      set({ tasks: [], boardId: null });
      return;
    }

    set({ isLoading: true, error: null, boardId });

    try {
      const response = await axiosInstance.get(`tasks/board/${boardId}`);
      const apiTasks: ApiTask[] = response.data || [];
      const tasks = apiTasks.map(mapApiTaskToUiTask);

      set({ tasks, isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Failed to fetch tasks";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  // ✅ NEW: create on backend then update state
  createTask: async (boardId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Task name is required");

    set({ isLoading: true, error: null });

    try {
      const res = await axiosInstance.post("tasks", {
        boardId,
        name: trimmed,
      });

      // Expect: { id, boardId, name, status } OR same fields
      const apiTask: ApiTask = res.data;

      const uiTask = mapApiTaskToUiTask(apiTask);

      // Put new task on top
      set({ tasks: [uiTask, ...get().tasks], isLoading: false });

      toast.success("Task created");
      return uiTask;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Failed to create task";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    set({ isLoading: true, error: null });

    try {
      await axiosInstance.patch(`tasks/${taskId}/status`, { status });

      // optimistic update in UI
      const next = get().tasks.map((t) =>
        t.id === taskId ? { ...t, status } : t,
      );
      set({ tasks: next, isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Failed to update status";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  reorderColumn: async (
    boardId: string,
    status: TaskStatus,
    orderedTaskIds: string[],
  ) => {
    if (!boardId || !orderedTaskIds?.length) return;

    try {
      await axiosInstance.patch(`tasks/board/${boardId}/reorder`, {
        status,
        orderedTaskIds,
      });
    } catch (error: any) {
      // don't block UI if reorder fails, but show message
      const errorMessage =
        error?.response?.data?.message || "Failed to save order";
      toast.error(errorMessage);
      throw error;
    }
  },

  setTasks: (tasks: Task[]) => set({ tasks }),

  addTaskLocal: (task: Task) => set({ tasks: [task, ...get().tasks] }),

  updateTaskStatusLocal: (taskId: string, status: TaskStatus) => {
    const updated = get().tasks.map((t) =>
      t.id === taskId ? { ...t, status } : t,
    );
    set({ tasks: updated });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      tasks: [],
      boardId: null,
      isLoading: false,
      error: null,
    }),
}));
