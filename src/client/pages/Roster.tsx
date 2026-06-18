import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RosterEntry } from '../../shared/types';
import { RosterCard } from '../components/RosterCard';
import { RosterEditModal } from '../components/RosterEditModal';

export function RosterPage() {
  const [editEntry, setEditEntry] = useState<RosterEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: roster, isLoading, error } = useQuery<RosterEntry[]>({
    queryKey: ['roster'],
    queryFn: () => fetch('/api/roster').then((r) => r.json()),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Roster</h1>
          {roster && (
            <p className="text-gray-500 text-sm mt-1">{roster.length} Pokemon</p>
          )}
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-700 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          + Add Pokemon
        </button>
      </div>

      {isLoading && (
        <div className="text-gray-500 text-center py-12">Loading roster…</div>
      )}

      {error && (
        <div className="text-red-400 text-center py-12">Failed to load roster</div>
      )}

      {roster && roster.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-3">No Pokemon in your roster yet.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Add your first Pokemon
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roster?.map((entry) => (
          <RosterCard key={entry.id} entry={entry} onEdit={setEditEntry} />
        ))}
      </div>

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
