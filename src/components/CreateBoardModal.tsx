import React, { useEffect, useRef, useState } from "react";

interface CreateBoardModalProps {
  title?: string;
  defaultName?: string;
  isSubmitting?: boolean;
  onCreate: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  title = "Create Board",
  defaultName = "",
  isSubmitting = false,
  onCreate,
  onCancel,
}) => {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus + select text
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Board name is required.");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    await onCreate(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && onCancel()}
      />
      <div className="relative bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") onCancel();
          }}
          disabled={isSubmitting}
          className={`w-full px-3 py-2 text-sm rounded-lg border outline-none text-gray-900 placeholder:text-gray-400 ${
            error ? "border-red-500" : "border-gray-300"
          } focus:ring-2 focus:ring-blue-500`}
          placeholder="e.g. Untitled Board"
        />

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBoardModal;
