import { create } from "zustand";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { TaskStatus } from "@/types";


export interface Task {
  id: string;
  content: string; // UI field
  status: TaskStatus;

  // optional UI fields
  assignedTo: string[];
  description?: string;
  deadline?: string;
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

  // local-only helpers for your current UI
  setTasks: (tasks: Task[]) => void;
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

    // optional: avoid refetch if same board id and already have tasks
    // if (get().boardId === boardId && get().tasks.length > 0) return;

    set({ isLoading: true, error: null, boardId });

    try {
      const response = await axiosInstance.get(`tasks/board/${boardId}`);
      const apiTasks: ApiTask[] = response.data || [];

      const tasks = apiTasks.map(mapApiTaskToUiTask);

      set({
        tasks,
        isLoading: false,
      });
    } catch (error: any) {
      console.error("Fetch tasks error:", error.response?.data || error.message);

      const errorMessage = error.response?.data?.message || "Failed to fetch tasks";
      set({ error: errorMessage, isLoading: false });

      toast.error(errorMessage);
      throw error;
    }
  },

  setTasks: (tasks: Task[]) => set({ tasks }),

  updateTaskStatusLocal: (taskId: string, status: TaskStatus) => {
    const updated = get().tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
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
