// useBoardStore.ts (FULL MODIFIED - fetch + active board + rename + delete like Dashboard menu)

import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  type?: "personal" | "group";
  members?: any[];
}

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;

  isLoading: boolean;
  error: string | null;

  createBoard: (name: string) => Promise<Board>;
  fetchBoards: () => Promise<void>;
  setActiveBoardId: (boardId: string) => void;

  getActiveBoard: () => Board | undefined;

  // ✅ for dropdown actions
  renameBoard: (boardId: string, name: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  clearError: () => void;
  reset: () => void;
}

const ACTIVE_BOARD_KEY = "activeBoardId";

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: [],
      activeBoardId: null,

      isLoading: false,
      error: null,

      createBoard: async (name: string) => {
        set({ isLoading: true, error: null });

        try {
          const res = await axiosInstance.post("boards", { name });
          const created: Board = res.data;

  
          set({
            boards: [...get().boards, created],

            activeBoardId: created.id,
            isLoading: false,
          });

          localStorage.setItem(ACTIVE_BOARD_KEY, created.id);
          toast.success("Board created");
          return created;
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to create board";
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      fetchBoards: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await axiosInstance.get("boards");
          const boards: Board[] = response.data || [];

          const currentActive = get().activeBoardId;
          const nextActive =
            (currentActive &&
              boards.some((b) => b.id === currentActive) &&
              currentActive) ||
            boards[0]?.id ||
            null;

          set({ boards, activeBoardId: nextActive, isLoading: false });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to fetch boards";
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      setActiveBoardId: (id: string) => {
        localStorage.setItem(ACTIVE_BOARD_KEY, id);
        set({ activeBoardId: id });
      },

      getActiveBoard: () => {
        const { boards, activeBoardId } = get();
        if (!boards.length) return undefined;
        return boards.find((b) => b.id === activeBoardId) ?? boards[0];
      },

      // ✅ Rename board
      // NOTE: endpoint assumed: PUT /boards/:id with { name }
      renameBoard: async (boardId: string, name: string) => {
        set({ isLoading: true, error: null });

        try {
          await axiosInstance.patch(`boards/${boardId}`, { name });

          const updatedBoards = get().boards.map((b) =>
            b.id === boardId ? { ...b, name } : b,
          );

          set({ boards: updatedBoards, isLoading: false });
          toast.success("Board renamed");
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to rename board";
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      // ✅ Delete board
      // NOTE: endpoint assumed: DELETE /boards/:id
      deleteBoard: async (boardId: string) => {
        set({ isLoading: true, error: null });

        try {
          await axiosInstance.delete(`boards/${boardId}`);

          const nextBoards = get().boards.filter((b) => b.id !== boardId);
          const nextActive = nextBoards[0]?.id || null;

          set({
            boards: nextBoards,
            activeBoardId: nextActive,
            isLoading: false,
          });

          toast.success("Board deleted");
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to delete board";
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          boards: [],
          activeBoardId: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "board-storage",
      partialize: (state) => ({
        boards: state.boards,
        activeBoardId: state.activeBoardId,
      }),
    },
  ),
);
