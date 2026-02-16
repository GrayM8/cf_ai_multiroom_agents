interface ExportModalProps {
  data: string;
  onClose: () => void;
}

export function ExportModal({ data, onClose }: ExportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[90%] max-w-lg rounded-lg bg-zinc-900 p-4 border border-zinc-700" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Room Export</h3>
        <textarea
          readOnly
          value={data}
          className="h-64 w-full resize-none rounded bg-zinc-800 p-3 font-mono text-xs text-zinc-300 outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(data)}
            className="rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600"
          >
            Copy
          </button>
          <button onClick={onClose} className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
