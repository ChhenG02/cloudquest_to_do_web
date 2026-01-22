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

  // separate loading flags
  isFetchingBoards: boolean;
  isCreatingBoard: boolean;
  isRenamingBoard: boolean;
  isDeletingBoard: boolean;

  error: string | null;

  createBoard: (name: string) => Promise<Board>;
  fetchBoards: () => Promise<void>;
  setActiveBoardId: (boardId: string) => void;

  getActiveBoard: () => Board | undefined;

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

      isFetchingBoards: false,
      isCreatingBoard: false,
      isRenamingBoard: false,
      isDeletingBoard: false,

      error: null,

      // ✅ Create board
      createBoard: async (name: string) => {
        set({ isCreatingBoard: true, error: null });

        try {
          const res = await axiosInstance.post("boards", { name });
          const created: Board = res.data;

          set({
            boards: [...get().boards, created], // bottom (match backend)
            activeBoardId: created.id,
            isCreatingBoard: false,
          });

          localStorage.setItem(ACTIVE_BOARD_KEY, created.id);
          toast.success("Board created");
          return created;
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to create board";

          set({ error: errorMessage, isCreatingBoard: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      // ✅ Fetch boards
      fetchBoards: async () => {
        set({ isFetchingBoards: true, error: null });

        try {
          const res = await axiosInstance.get("boards");
          const boards: Board[] = res.data || [];

          const savedActive = localStorage.getItem(ACTIVE_BOARD_KEY);

          // choose active: savedActive -> currentActive -> first
          const currentActive = get().activeBoardId;
          const nextActive =
            (savedActive && boards.some((b) => b.id === savedActive) && savedActive) ||
            (currentActive && boards.some((b) => b.id === currentActive) && currentActive) ||
            boards[0]?.id ||
            null;

          set({
            boards,
            activeBoardId: nextActive,
            isFetchingBoards: false,
          });

          if (nextActive) localStorage.setItem(ACTIVE_BOARD_KEY, nextActive);
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to fetch boards";

          set({ error: errorMessage, isFetchingBoards: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      // ✅ Set active board
      setActiveBoardId: (id: string) => {
        localStorage.setItem(ACTIVE_BOARD_KEY, id);
        set({ activeBoardId: id });
      },

      // ✅ Active board helper
      getActiveBoard: () => {
        const { boards, activeBoardId } = get();
        if (!boards.length) return undefined;
        return boards.find((b) => b.id === activeBoardId) ?? boards[0];
      },

      // ✅ Rename board
      renameBoard: async (boardId: string, name: string) => {
        set({ isRenamingBoard: true, error: null });

        try {
          await axiosInstance.patch(`boards/${boardId}`, { name });

          const updatedBoards = get().boards.map((b) =>
            b.id === boardId ? { ...b, name } : b
          );

          set({ boards: updatedBoards, isRenamingBoard: false });
          toast.success("Board renamed");
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to rename board";

          set({ error: errorMessage, isRenamingBoard: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      // ✅ Delete board
      deleteBoard: async (boardId: string) => {
        set({ isDeletingBoard: true, error: null });

        try {
          await axiosInstance.delete(`boards/${boardId}`);

          const nextBoards = get().boards.filter((b) => b.id !== boardId);

          // pick next active safely
          const nextActive =
            (get().activeBoardId === boardId ? nextBoards[0]?.id : get().activeBoardId) ||
            nextBoards[0]?.id ||
            null;

          set({
            boards: nextBoards,
            activeBoardId: nextActive,
            isDeletingBoard: false,
          });

          if (nextActive) localStorage.setItem(ACTIVE_BOARD_KEY, nextActive);
          else localStorage.removeItem(ACTIVE_BOARD_KEY);

          toast.success("Board deleted");
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || "Failed to delete board";

          set({ error: errorMessage, isDeletingBoard: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          boards: [],
          activeBoardId: null,
          isFetchingBoards: false,
          isCreatingBoard: false,
          isRenamingBoard: false,
          isDeletingBoard: false,
          error: null,
        }),
    }),
    {
      name: "board-storage",
      partialize: (state) => ({
        boards: state.boards,
        activeBoardId: state.activeBoardId,
      }),
    }
  )
);
