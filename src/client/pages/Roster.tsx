import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RosterEntry } from '../../shared/types';
import { RosterCard } from '../components/RosterCard';
import { RosterEditModal } from '../components/RosterEditModal';
import { Pagination } from '../components/Pagination';

const PAGE_SIZE = 24;

export function RosterPage() {
  const [editEntry, setEditEntry] = useState<RosterEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: roster, isLoading, error } = useQuery<RosterEntry[]>({
    queryKey: ['roster'],
    queryFn: () => fetch('/api/roster').then((r) => r.json()),
  });

  const filtered = useMemo(() => {
    if (!roster) return [];
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (e) =>
        e.speciesName.toLowerCase().includes(q) ||
        e.nickname.toLowerCase().includes(q)
    );
  }, [roster, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Roster</h1>
          {roster && (
            <p className="text-gray-500 text-sm mt-1">
              {filtered.length !== roster.length
                ? `${filtered.length} of ${roster.length} Pokémon`
                : `${roster.length} Pokémon`}
            </p>
          )}
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-700 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add Pokemon
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by name or nickname…"
        className="w-full mb-4 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
      />

      {isLoading && (
        <div className="text-gray-500 text-center py-12">Loading roster…</div>
      )}

      {error && (
        <div className="text-red-400 text-center py-12">Failed to load roster</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          {roster?.length === 0 ? (
            <>
              <p className="text-gray-500 mb-3">No Pokemon in your roster yet.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Add your first Pokemon
              </button>
            </>
          ) : (
            <p className="text-gray-500">No Pokémon match "{search}"</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageItems.map((entry) => (
          <RosterCard key={entry.id} entry={entry} onEdit={setEditEntry} />
        ))}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />

      {(isCreating || editEntry) && (
        <RosterEditModal
          entry={editEntry}
          onClose={() => {
            setEditEntry(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}
