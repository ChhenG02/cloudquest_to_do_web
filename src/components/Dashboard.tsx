import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import TaskList from "./TaskList";
import TaskModal from "./TaskModal";
import MemberModal from "./MemberModal";
import ConfirmModal from "./ConfirmModal";

import { useAuthStore } from "../stores/useAuthStore";
import { useBoardStore } from "../stores/useBoardStore";
import { useTaskStore } from "../stores/useTaskStore";

import type { Board, Task, BoardMember, TaskStatus } from "@/types";
import toast from "react-hot-toast";

// ✅ TaskStatus is a type, so we use runtime strings:
const STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const satisfies Record<string, TaskStatus>;

const Dashboard: React.FC = () => {
  const { user: currentUser } = useAuthStore();

  const {
    boards,
    activeBoardId,
    setActiveBoardId,
    fetchBoards,
    getActiveBoard,
    renameBoard,
    deleteBoard,
  } = useBoardStore();

  const {
    tasks,
    fetchTasksByBoard,

    updateTaskStatus,
    reorderColumn,

    // keep same "updateTask" behavior but local for now:

    // OPTIONAL: if you already added addTask/deleteTask/updateTaskContent in store later,
    // you can wire them here. For now we keep local-only like your current backend has only GET.

    isLoading: tasksLoading,
    error: tasksError,
  } = useTaskStore();

  // UI states (same as old)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [newTaskContent, setNewTaskContent] = useState("");

  const handleReorderSameColumn = async (
    status: TaskStatus,
    orderedIds: string[],
  ) => {
    if (!activeBoardId) return;

    // ✅ update local UI first
    const idToTask = new Map(tasks.map((t) => [t.id, t]));
    const reordered = orderedIds
      .map((id) => idToTask.get(id))
      .filter(Boolean) as Task[];

    const others = tasks.filter((t) => t.status !== status);
    useTaskStore.getState().setTasks([...others, ...reordered]);

    // ✅ persist to backend
    await reorderColumn(activeBoardId, status, orderedIds);
  };

  const [confirmTaskDelete, setConfirmTaskDelete] = useState<Task | null>(null);
  const [confirmBoardDelete, setConfirmBoardDelete] = useState<Board | null>(
    null,
  );

  const menuRef = useRef<HTMLDivElement>(null);

  const activeBoard = getActiveBoard();
  const members: BoardMember[] = activeBoard?.members || [];

  const isOwnerById = activeBoard?.ownerId === currentUser?.id;

  const userRole =
    members.find((m) => m.userId === currentUser?.id)?.role ??
    (isOwnerById ? "OWNER" : "VIEWER");

  const canModify = userRole === "OWNER" || userRole === "EDITOR";
  const isOwner = userRole === "OWNER";

  // Completion (same as old)
  const totalTasks = tasks.length;
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === STATUS.DONE).length,
    [tasks],
  );
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // 1) Fetch boards once logged in
  useEffect(() => {
    if (!currentUser?.id) return;

    // clear old account UI immediately, then refetch
    useBoardStore.getState().reset();
    useTaskStore.getState().reset();

    fetchBoards();
  }, [currentUser?.id]);

  // 2) Fetch tasks for active board
  useEffect(() => {
    if (!activeBoardId) return;
    fetchTasksByBoard(activeBoardId);
  }, [activeBoardId, fetchTasksByBoard]);

  // 3) Close board menu click outside (same as old)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowBoardMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4) Keep rename input synced with active board
  useEffect(() => {
    setRenameValue(activeBoard?.name || "");
  }, [activeBoard?.name]);

  // ====== Actions (keep same function names/behavior) ======

  const handleRenameBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBoardId) return;

    const name = renameValue.trim();
    if (!name) {
      setIsRenaming(false);
      setShowBoardMenu(false);
      return;
    }

    try {
      await renameBoard(activeBoardId, name);
    } catch {
      // toast already shown in store
    }

    setIsRenaming(false);
    setShowBoardMenu(false);
  };

  const handleDeleteBoard = async (board: Board) => {
    try {
      await deleteBoard(board.id);
    } catch {
      // toast already shown in store
    }

    setConfirmBoardDelete(null);
    setShowBoardMenu(false);
  };

  const {
    createTask,
    updateTask: updateTaskInStore,
    deleteTask: deleteTaskInStore,
  } = useTaskStore();
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim() || !canModify) return;
    if (!activeBoardId) {
      toast.error("Please select a board first");
      return;
    }

    try {
      await createTask(activeBoardId, newTaskContent);
      setNewTaskContent("");
    } catch {}
  };

  // Keep same updateTask behavior (for modal update)
  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      console.log("Updating task:", id, updates);

      // If status update, use updateTaskStatus
      if (updates.status) {
        await updateTaskStatus(id, updates.status);
      }

      // If other fields, use the new updateTask method
      if (
        updates.name ||
        updates.description ||
        updates.deadline ||
        updates.assignedTo
      ) {
        await updateTaskInStore(id, updates);
      }

      if (selectedTask?.id === id) {
        setSelectedTask({ ...selectedTask, ...updates });
      }

      return true; // Success
    } catch (error: any) {
      console.error("Failed to update task:", error);
      toast.error(error.message || "Failed to update task");
      throw error; // Re-throw to be caught by TaskModal
    }
  };

  const deleteTask = async (task: Task) => {
    try {
      await deleteTaskInStore(task.id);
      setConfirmTaskDelete(null);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const startRename = () => {
    setRenameValue(activeBoard?.name || "");
    setIsRenaming(true);
    setShowBoardMenu(false);
  };

  if (!currentUser) return null;

  return (
    <div className="h-screen flex bg-[#f8fafc] overflow-hidden relative">
      {/* Sidebar should use store (your newer Sidebar version) */}
      <Sidebar />

      <main className="flex-grow flex flex-col min-w-0">
        <header className="px-6 py-4 bg-white border-b flex justify-between items-center shadow-sm relative">
          <div className="flex items-center gap-4">
            <div className="relative" ref={menuRef}>
              {isRenaming ? (
                <form
                  onSubmit={handleRenameBoard}
                  className="flex items-center gap-2"
                >
                  <input
                    autoFocus
                    className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => setIsRenaming(false)}
                  />
                </form>
              ) : (
                <button
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1 -ml-3 rounded-lg transition-colors group"
                >
                  <h1 className="text-xl font-bold text-gray-900">
                    {activeBoard?.name ||
                      (boards.length ? "Loading..." : "No boards")}
                  </h1>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      showBoardMenu ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              )}

              {showBoardMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Board Settings
                    </p>
                  </div>

                  {isOwner && (
                    <button
                      onClick={startRename}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      Rename Board
                    </button>
                  )}
                  {/* 
                   {showMemberModal && activeBoard && (
        <MemberModal 
          board={activeBoard} 
          onClose={() => setShowMemberModal(false)} 
          onUpdateBoard={(updates) => {
             const updated = boards.map(b => b.id === activeBoardId ? { ...b, ...updates } : b);
             persist(updated, tasks);
          }} 
          currentUserId={currentUser.id}
        />
      )} */}

                  {isOwner && (
                    <button
                      onClick={() => {
                        setShowMemberModal(true);
                        setShowBoardMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Manage Access
                    </button>
                  )}

                  <div className="border-t my-1"></div>

                  {isOwner && activeBoard && (
                    <button
                      onClick={() => {
                        setConfirmBoardDelete(activeBoard);
                        setShowBoardMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete Board
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* member avatars like old */}
            <div className="flex -space-x-1.5 ml-2">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-700 hover:z-10 cursor-help transition-all"
                  title={`${m.name} (${m.role})`}
                >
                  {m.name[0]}
                </div>
              ))}
            </div>
          </div>

          {/* right user section (same as old) */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900 leading-tight">
                {currentUser.name || currentUser.username}
              </div>
              <div className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">
                {currentUser.email}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-sm font-bold text-white shadow-md">
              {(currentUser.name || currentUser.username)[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Add task row like old */}
        {canModify && (
          <div className="px-6 py-3 border-b bg-white/50">
            <form onSubmit={handleAddTask} className="flex max-w-lg gap-2">
              <input
                type="text"
                placeholder="Add a new task ..."
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                className="flex-grow text-xs px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Add Task
              </button>
            </form>
          </div>
        )}

        {/* columns */}
        <div className="flex-grow overflow-x-auto overflow-y-hidden px-6 py-6 custom-scrollbar">
          <div className="flex gap-4 h-full items-start">
            <TaskList
              title="To Do"
              tasks={tasks.filter((t) => t.status === STATUS.TODO)}
              onUpdateStatus={async (id, status) => {
                await updateTaskStatus(id, status);
                if (activeBoardId) await fetchTasksByBoard(activeBoardId);
              }}
              onReorderSameColumn={handleReorderSameColumn}
              onDelete={(id) => {
                const t = tasks.find((task) => task.id === id);
                if (t) setConfirmTaskDelete(t);
              }}
              onTaskClick={setSelectedTask}
              targetStatus={STATUS.TODO}
              members={members}
              canModify={canModify}
            />

            <TaskList
              title="In Progress"
              tasks={tasks.filter((t) => t.status === STATUS.IN_PROGRESS)}
              onUpdateStatus={async (id, status) => {
                await updateTaskStatus(id, status);
                if (activeBoardId) await fetchTasksByBoard(activeBoardId);
              }}
              onDelete={(id) => {
                const t = tasks.find((task) => task.id === id);
                if (t) setConfirmTaskDelete(t);
              }}
              onTaskClick={setSelectedTask}
              targetStatus={STATUS.IN_PROGRESS}
              members={members}
              canModify={canModify}
            />

            <TaskList
              title="Done"
              tasks={tasks.filter((t) => t.status === STATUS.DONE)}
              onUpdateStatus={async (id, status) => {
                await updateTaskStatus(id, status);
                if (activeBoardId) await fetchTasksByBoard(activeBoardId);
              }}
              onDelete={(id) => {
                const t = tasks.find((task) => task.id === id);
                if (t) setConfirmTaskDelete(t);
              }}
              onTaskClick={setSelectedTask}
              targetStatus={STATUS.DONE}
              members={members}
              canModify={canModify}
            />
          </div>
        </div>
      </main>

      {/* Floating Task Progress (same as old) */}
      <div className="fixed bottom-6 right-6 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-2 min-w-[200px] z-[40]">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-900">
            Total Completion
          </span>
          <span className="text-xs font-bold text-blue-600">
            {completionRate}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {tasksError && (
        <div className="fixed bottom-6 left-6 text-xs text-red-500">
          {tasksError}
        </div>
      )}

      {/* Task modal (same) */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => updateTask(selectedTask.id, updates)}
          members={members}
        />
      )}

      {/* Member modal (same UI, backend update not wired unless you have API) */}
      {showMemberModal && activeBoard && (
        <MemberModal
          board={activeBoard}
          onClose={() => setShowMemberModal(false)}
          onUpdateBoard={(updates) => {
            // Local-only update for now:
            // If you have endpoint, tell me and I'll connect it.
            const nextBoards = boards.map((b) =>
              b.id === activeBoard.id ? { ...b, ...updates } : b,
            );
            // You need a setter action in board store if you want to persist locally:
            // easiest: re-fetch boards after saving on backend.
            toast.success("Updated (local)");
            useBoardStore.setState({ boards: nextBoards } as any);
          }}
          currentUserId={currentUser.id}
        />
      )}

      {/* Confirm modals (same) */}
      {confirmTaskDelete && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to permanently delete the task "${confirmTaskDelete.name}"?`} // Changed from content to name
          onConfirm={() => deleteTask(confirmTaskDelete)}
          onCancel={() => setConfirmTaskDelete(null)}
        />
      )}

      {confirmBoardDelete && (
        <ConfirmModal
          title="Delete Board"
          message={`Are you sure you want to delete the board "${confirmBoardDelete.name}"? This will remove all associated tasks and access for other members.`}
          onConfirm={() => handleDeleteBoard(confirmBoardDelete)}
          onCancel={() => setConfirmBoardDelete(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
