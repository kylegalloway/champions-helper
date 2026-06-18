interface Props {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, onPage }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors text-gray-300"
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-500 px-2">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors text-gray-300"
      >
        Next →
      </button>
    </div>
  );
}
