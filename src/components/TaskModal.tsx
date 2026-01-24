import { BoardMember, Task } from "@/types";
import React, { useState, useEffect } from "react";
import { useTaskStore } from "../stores/useTaskStore";

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  members: BoardMember[];
  canModify: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({
  task,
  onClose,
  onUpdate,
  members,
  canModify,
}) => {
  const [name, setName] = useState(task.name || "");
  const [description, setDescription] = useState(task.description || "");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { setTaskAssignees } = useTaskStore();

  const [assignedTo, setAssignedTo] = useState<string[]>(task.assignedTo || []);

  useEffect(() => {
    setAssignedTo(task.assignedTo || []);
  }, [task.id, task.assignedTo]);

  // Initialize deadline with proper format
  useEffect(() => {
    if (task.deadline) {
      const d = new Date(task.deadline);
      // Format date: YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setDeadlineDate(`${year}-${month}-${day}`);

      // Format time: HH:MM (24-hour format)
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      setDeadlineTime(`${hours}:${minutes}`);
    } else {
      setDeadlineDate("");
      setDeadlineTime("");
    }
  }, [task.deadline]);

  const formatTimeForDisplay = (time24h: string) => {
    if (!time24h) return "";
    const [hours, minutes] = time24h.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const updates: Partial<Task> = {};

      // Check if name changed
      if (name !== task.name) {
        updates.name = name;
      }

      // Check if description changed
      if (description !== task.description) {
        updates.description = description;
      }

      // Handle deadline
      if (deadlineDate && deadlineTime) {
        // Combine date and time
        const dateTimeString = `${deadlineDate}T${deadlineTime}:00`;
        updates.deadline = new Date(dateTimeString).toISOString();
      } else if (deadlineDate && !deadlineTime) {
        // Date only (set to end of day)
        const dateTimeString = `${deadlineDate}T23:59:59`;
        updates.deadline = new Date(dateTimeString).toISOString();
      } else if (task.deadline && (!deadlineDate || !deadlineTime)) {
        // Clear deadline if it was set before
        updates.deadline = null;
      }

      const prev = Array.isArray(task.assignedTo) ? task.assignedTo : [];
      const next = assignedTo;

      const same =
        prev.length === next.length && prev.every((id) => next.includes(id));

      // Only call onUpdate if there are actual changes
      if (Object.keys(updates).length > 0) {
        await onUpdate(updates);
      }

      // Handle assignees separately if changed
      if (!same) {
        await setTaskAssignees(task.id, next);
      }

      // Always close the modal
      onClose();
    } catch (error) {
      console.error("Failed to save task:", error);
      // Don't close on error
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMember = (userId: string) => {
    setAssignedTo((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-start bg-gray-50">
          <div className="flex-grow pr-8">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!canModify}
              disabled={!canModify}
              className="text-xl font-bold text-gray-900 mb-1 leading-tight w-full bg-transparent border-none outline-none"
              placeholder="Task name"
            />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                in list{" "}
                <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                  {task.status}
                </span>
              </span>
              <span>•</span>
              <span>
                {task.updatedAt
                  ? new Date(task.updatedAt).toLocaleDateString()
                  : "Unknown date"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
            disabled={isSaving}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                Description
              </h4>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                readOnly={!canModify}
                disabled={!canModify}
                placeholder="Add a more detailed description..."
                className="w-full min-h-[160px] p-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none shadow-inner"
              ></textarea>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                Assigned Members
              </h4>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const label =
                    member.name || member.email || member.userId || "User";
                  const initials = label
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <button
                      key={member.userId}
                      onClick={() => toggleMember(member.userId)}
                      disabled={!canModify}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shadow-sm ${
                        assignedTo.includes(member.userId)
                          ? "bg-blue-600 text-white border-blue-600 scale-105 ring-2 ring-blue-100"
                          : "bg-white text-gray-500 border-gray-200 hover:border-blue-400"
                      }`}
                      title={label}
                    >
                      {initials}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                Deadline
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    readOnly={!canModify}
                    disabled={!canModify}
                    className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer shadow-sm hover:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1">
                    Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      readOnly={!canModify}
                      disabled={!canModify}
                      className="flex-grow p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer shadow-sm hover:border-blue-400"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          {canModify && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-8 py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 ${
                isSaving
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
              }`}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                "Save Details"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
