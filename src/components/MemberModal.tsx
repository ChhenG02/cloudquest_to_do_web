import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Board, BoardMember, BoardRole } from "@/types";
import toast from "react-hot-toast";
import { useBoardStore } from "../stores/useBoardStore";
import { useAuthStore } from "../stores/useAuthStore";

interface MemberModalProps {
  board: Board;
  onClose: () => void;
  currentUserId: string;
}

type SearchUser = { id: string; email: string; username: string };

function getInitial(member: Partial<BoardMember> & { userId?: string }) {
  const base =
    (member.name && member.name.trim()) ||
    (member.email && member.email.trim()) ||
    member.userId ||
    "U";
  return (base[0] || "U").toUpperCase();
}

function getDisplayName(member: Partial<BoardMember> & { userId?: string }) {
  return (
    (member.name && member.name.trim()) ||
    (member.email && member.email.trim()) ||
    member.userId ||
    "Unknown"
  );
}

const ROLE_LABEL: Record<BoardRole, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

const ROLE_DESC: Record<BoardRole, string> = {
  OWNER: "Full access",
  EDITOR: "Can edit and move tasks",
  VIEWER: "Can view only",
};

const MemberModal: React.FC<MemberModalProps> = ({
  board,
  onClose,
  currentUserId,
}) => {
  const isOwner = board.ownerId === currentUserId;

  const user = useAuthStore((s) => s.user);
  const ownerName =
    user?.username || user?.name || user?.email || board.ownerId;
  const ownerEmail = user?.email || board.ownerId;

  const {
    fetchBoardMembers,
    shareBoard,
    updateMemberRole,
    removeMember,
    searchUsers,
  } = useBoardStore();

  // backend members
  const members: BoardMember[] = board.members || [];
  const memberUserIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );

  // search UI (Drive style)
  const [q, setQ] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<BoardRole>("EDITOR");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBoardMembers(board.id).catch(() => {});
  }, [board.id, fetchBoardMembers]);

  // close dropdown on click outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const doSearch = async () => {
    const keyword = q.trim();
    if (!keyword) return;

    setIsSearching(true);
    setIsDropdownOpen(true);

    try {
      const res = await searchUsers(keyword);
      setResults(res || []);
      if (!res?.length) toast("No user found", { icon: "🔎" });
    } catch (e: any) {
      toast.error(e?.message || "Search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addUser = async (userId: string) => {
    const already = memberUserIds.has(userId) || userId === board.ownerId;
    if (already) return;

    setAddingUserId(userId);
    try {
      await shareBoard(board.id, userId, roleToAdd);
      toast.success("Member added");
      setQ("");
      setResults([]);
      setIsDropdownOpen(false);
      await fetchBoardMembers(board.id);
    } catch (e: any) {
      toast.error(e?.message || "Add member failed");
    } finally {
      setAddingUserId(null);
    }
  };

  const changeRole = async (memberUserId: string, role: BoardRole) => {
    if (memberUserId === board.ownerId) return;
    setBusyMemberId(memberUserId);
    try {
      await updateMemberRole(board.id, memberUserId, role);
      toast.success("Role updated");
      await fetchBoardMembers(board.id);
    } catch (e: any) {
      toast.error(e?.message || "Update role failed");
    } finally {
      setBusyMemberId(null);
    }
  };

  const remove = async (memberUserId: string) => {
    if (memberUserId === board.ownerId) return;
    setBusyMemberId(memberUserId);
    try {
      await removeMember(board.id, memberUserId);
      toast.success("Member removed");
      await fetchBoardMembers(board.id);
    } catch (e: any) {
      toast.error(e?.message || "Remove failed");
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drive-like sheet */}
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900">Share</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">
              <span className="font-semibold text-gray-700">{board.name}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Add people (Drive style) */}
          <div className="space-y-2" ref={boxRef}>
            <label className="text-[11px] font-bold text-gray-500">
              Add people (username or email)
            </label>

            <div className="flex gap-2 items-stretch">
              <div className="relative flex-1">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => q.trim() && setIsDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doSearch();
                    if (e.key === "Escape") setIsDropdownOpen(false);
                  }}
                  placeholder="Type a name or email"
                  className="w-full text-sm px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                {/* Dropdown results */}
                {isDropdownOpen && q.trim().length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50 flex items-center justify-between">
                      <span>Search results</span>
                      {isSearching ? (
                        <span className="text-blue-600">Searching...</span>
                      ) : null}
                    </div>

                    {results.length === 0 && !isSearching ? (
                      <div className="px-3 py-3 text-sm text-gray-500">
                        Press <span className="font-semibold">Enter</span> to
                        search
                      </div>
                    ) : (
                      results.map((u) => {
                        const already =
                          memberUserIds.has(u.id) || u.id === board.ownerId;
                        const adding = addingUserId === u.id;

                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => addUser(u.id)}
                            disabled={already || adding}
                            className={[
                              "w-full text-left px-3 py-3 flex items-center justify-between gap-3",
                              already || adding
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-gray-50",
                            ].join(" ")}
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                {(u.username ||
                                  u.email ||
                                  "U")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                  {u.username}
                                </div>
                                <div className="text-[11px] text-gray-500 truncate">
                                  {u.email}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs font-semibold">
                              {already ? (
                                <span className="text-gray-500">Already</span>
                              ) : adding ? (
                                <span className="text-blue-600">Adding…</span>
                              ) : (
                                <span className="text-blue-600">Add</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <select
                value={roleToAdd}
                onChange={(e) => setRoleToAdd(e.target.value as BoardRole)}
                className="text-sm px-3 border rounded-xl bg-white"
                disabled={!isOwner}
                title={
                  !isOwner
                    ? "Only owner can change default role"
                    : "Default role"
                }
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>

              <button
                onClick={doSearch}
                disabled={!q.trim() || isSearching}
                className="px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                Search
              </button>
            </div>

            {!isOwner && (
              <p className="text-[11px] text-gray-500">
                Only the owner can add/remove people or change roles.
              </p>
            )}
          </div>

          {/* People with access */}
          <div className="border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  People with access
                </p>
                <p className="text-[11px] text-gray-500">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
              {members.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                  No members yet.
                </div>
              ) : (
                members.map((m) => {
                  const isMemberOwner = m.role === "OWNER";
                  const busy = busyMemberId === m.userId;

                  return (
                    <div
                      key={m.userId}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                          {(isMemberOwner
                            ? ownerName
                            : getDisplayName(m))[0]?.toUpperCase() || "U"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {isMemberOwner ? ownerName : getDisplayName(m)}
                            </p>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">
                            {isMemberOwner ? ownerEmail : m.email || m.userId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="hidden sm:block text-[11px] text-gray-500 mr-2">
                          {ROLE_DESC[m.role]}
                        </div>

                        <select
                          disabled={!isOwner || isMemberOwner || busy}
                          value={m.role}
                          onChange={(e) =>
                            changeRole(m.userId, e.target.value as BoardRole)
                          }
                          className="text-sm px-3 py-2 border rounded-xl bg-white disabled:opacity-60"
                        >
                          <option value="EDITOR">{ROLE_LABEL.EDITOR}</option>
                          <option value="VIEWER">{ROLE_LABEL.VIEWER}</option>
                        </select>

                        {isOwner && !isMemberOwner && (
                          <button
                            onClick={() => remove(m.userId)}
                            disabled={busy}
                            className="px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl disabled:opacity-60"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer (Drive-ish) */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-[11px] text-gray-500"></p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border text-sm font-semibold hover:bg-gray-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberModal;
