import { create } from "zustand";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import type { TaskStatus } from "@/types";

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  assignedTo: string[];
  description?: string;
  deadline?: string;
  userId?: string;
  updatedAt?: string;
  boardId?: string;
}

interface ApiTask {
  id: string;
  boardId: string;
  name: string;
  description?: string;
  deadline?: string;
  status: TaskStatus;
  updatedAt?: string;
  assignedTo?: string[];
}

interface TaskState {
  tasks: Task[];
  boardId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchTasksByBoard: (boardId: string) => Promise<void>;
  createTask: (boardId: string, name: string) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  fetchTaskAssignees: (taskId: string) => Promise<string[]>;
  setTaskAssignees: (taskId: string, userIds: string[]) => Promise<string[]>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  reorderColumn: (
    boardId: string,
    status: TaskStatus,
    orderedTaskIds: string[],
  ) => Promise<void>;

  setTasks: (tasks: Task[]) => void;
  addTaskLocal: (task: Task) => void;
  updateTaskStatusLocal: (taskId: string, status: TaskStatus) => void;
  clearError: () => void;
  reset: () => void;
}

function mapApiTaskToUiTask(t: ApiTask): Task {
  return {
    id: t.id,
    name: t.name,
    status: t.status,
    assignedTo: t.assignedTo || [],
    description: t.description,
    deadline: t.deadline,
    boardId: t.boardId,
    updatedAt: t.updatedAt,
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
      await Promise.all(
        tasks.map(async (t) => {
          try {
            const res = await axiosInstance.get(`tasks/${t.id}/assignees`);
            const ids = (res.data || []).map((a: any) => a.userId) as string[];

            set((state) => ({
              tasks: state.tasks.map((x) =>
                x.id === t.id ? { ...x, assignedTo: ids } : x,
              ),
            }));
          } catch {
            // ignore assignee fetch per-task if it fails
          }
        }),
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Failed to fetch tasks";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  createTask: async (boardId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Task name is required");

    set({ isLoading: true, error: null });

    try {
      const res = await axiosInstance.post("tasks", {
        boardId,
        name: trimmed,
      });

      const apiTask: ApiTask = res.data;
      const uiTask = mapApiTaskToUiTask(apiTask);

      set({ tasks: [uiTask, ...get().tasks], isLoading: false });
      return uiTask;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Failed to create task";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
  set({ isLoading: true, error: null });

  try {
    // Prepare payload for API - now includes assignedTo
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined)
      payload.description = updates.description;
    if (updates.deadline !== undefined) payload.deadline = updates.deadline;
    if (updates.assignedTo !== undefined) payload.assignedTo = updates.assignedTo;

    console.log("Sending update payload:", payload);

    const res = await axiosInstance.patch(`tasks/${taskId}`, payload);
    const updatedApiTask: ApiTask = res.data;
    
    // Get current task to preserve assignees if not in response
    const currentTask = get().tasks.find(t => t.id === taskId);
    
    // Create updated task, preserving assignedTo from current task if not in API response
    const updatedUiTask: Task = {
      id: updatedApiTask.id,
      name: updatedApiTask.name,
      status: updatedApiTask.status,
      assignedTo: updatedApiTask.assignedTo || currentTask?.assignedTo || [],
      description: updatedApiTask.description,
      deadline: updatedApiTask.deadline,
      boardId: updatedApiTask.boardId,
      updatedAt: updatedApiTask.updatedAt,
    };

    // Update local state
    const next = get().tasks.map((t) =>
      t.id === taskId ? { ...t, ...updatedUiTask } : t,
    );

    set({ tasks: next, isLoading: false });
    return updatedUiTask;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || "Failed to update task";
    set({ error: errorMessage, isLoading: false });
    toast.error(errorMessage);
    throw error;
  }
},

  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    set({ isLoading: true, error: null });

    try {
      await axiosInstance.patch(`tasks/${taskId}/status`, { status });

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

  deleteTask: async (taskId: string) => {
    set({ isLoading: true, error: null });

    try {
      await axiosInstance.delete(`tasks/${taskId}`);

      const next = get().tasks.filter((t) => t.id !== taskId);
      set({ tasks: next, isLoading: false });
      toast.success("Task deleted");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Failed to delete task";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  fetchTaskAssignees: async (taskId: string) => {
    try {
      const res = await axiosInstance.get(`tasks/${taskId}/assignees`);
      const assignees: { userId: string }[] = res.data || [];
      const userIds = assignees.map((a) => a.userId);

      // update task in store
      set({
        tasks: get().tasks.map((t) =>
          t.id === taskId ? { ...t, assignedTo: userIds } : t,
        ),
      });

      return userIds;
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to load assignees";
      toast.error(msg);
      throw error;
    }
  },

  setTaskAssignees: async (taskId: string, userIds: string[]) => {
    try {
      await axiosInstance.patch(`tasks/${taskId}/assignees`, { userIds });

      // update immediately in UI
      set({
        tasks: get().tasks.map((t) =>
          t.id === taskId ? { ...t, assignedTo: userIds } : t,
        ),
      });

      return userIds;
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Failed to update assignees";
      toast.error(msg);
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
