import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { BoardMember, BoardRole } from "@/types";

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  type?: "personal" | "team";
  members?: any[];
}

type UserSearchResult = {
  id: string;
  email: string;
  username: string;
};

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

  fetchBoardMembers: (boardId: string) => Promise<BoardMember[]>;
  searchUsers: (q: string) => Promise<UserSearchResult[]>;
  shareBoard: (
    boardId: string,
    userId: string,
    role: BoardRole,
  ) => Promise<void>;
  updateMemberRole: (
    boardId: string,
    memberUserId: string,
    role: BoardRole,
  ) => Promise<void>;
  removeMember: (boardId: string, memberUserId: string) => Promise<void>;

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
        const res = await axiosInstance.get("boards");
        const incoming = res.data; // boards from backend (likely no members)

        set((state) => {
          const prevById = new Map(state.boards.map((b) => [b.id, b]));

          const merged = incoming.map((b: any) => {
            const prev = prevById.get(b.id);
            // ✅ keep cached members if backend doesn't send members
            const members = b.members ?? prev?.members ?? [];
            return { ...prev, ...b, members };
          });

          // if you also store activeBoard separately, merge there too
          return { boards: merged };
        });
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
            b.id === boardId ? { ...b, name } : b,
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
            (get().activeBoardId === boardId
              ? nextBoards[0]?.id
              : get().activeBoardId) ||
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

      fetchBoardMembers: async (boardId: string) => {
        // 1) get board members (only userId + role)
        const res = await axiosInstance.get(`boards/${boardId}/members`);
        const rawMembers = res.data as { userId: string; role: BoardRole }[];

        // 2) fetch user profiles from auth service
        const ids = Array.from(new Set(rawMembers.map((m) => m.userId)));

        // ✅ If you have batch endpoint (recommended)
        let users: { id: string; email?: string; username?: string }[] = [];
        try {
          const ures = await axiosInstance.post(`auth/users/batch`, { ids });
          users = ures.data;
        } catch {
          // fallback: try single fetch per id (only if you have GET auth/users/:id)
          users = await Promise.all(
            ids.map(async (id) => {
              try {
                const u = await axiosInstance.get(`auth/users/${id}`);
                return u.data;
              } catch {
                return { id };
              }
            }),
          );
        }

        const userMap = new Map(users.map((u) => [u.id, u]));

        // 3) merge into enriched members
        const enriched = rawMembers.map((m) => {
          const u = userMap.get(m.userId);
          return {
            userId: m.userId,
            role: m.role,
            name: u?.username, // show username as name
            email: u?.email,
          };
        });

        // 4) save into the board in state
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId ? { ...b, members: enriched } : b,
          ),
        }));

        return enriched;
      },

      searchUsers: async (q: string): Promise<UserSearchResult[]> => {
        const res = await axiosInstance.get(`auth/users/search`, {
          params: { q },
        });
        return res.data;
      },

      shareBoard: async (boardId: string, userId: string, role: BoardRole) => {
        await axiosInstance.post(`boards/${boardId}/share`, { userId, role });
        await get().fetchBoardMembers(boardId);
      },

      updateMemberRole: async (
        boardId: string,
        memberUserId: string,
        role: BoardRole,
      ) => {
        await axiosInstance.patch(`boards/${boardId}/members/${memberUserId}`, {
          role,
        });
        await get().fetchBoardMembers(boardId);
      },

      removeMember: async (boardId: string, memberUserId: string) => {
        await axiosInstance.delete(`boards/${boardId}/members/${memberUserId}`);
        await get().fetchBoardMembers(boardId);
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
    },
  ),
);
