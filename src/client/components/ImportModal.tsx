import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Regulation } from '../../shared/types';

interface Props {
  mode: 'url' | 'paste';
  onClose: () => void;
}

export function ImportModal({ mode, onClose }: Props) {
  const [input, setInput] = useState('');
  const [regulation, setRegulation] = useState('');
  const [teamName, setTeamName] = useState('');
  const [forceImport, setForceImport] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ id: number; regulation: string | null } | null>(null);
  const qc = useQueryClient();

  const { data: regulations } = useQuery<Regulation[]>({
    queryKey: ['regulations'],
    queryFn: () => fetch('/api/meta-teams/regulations').then((r) => r.json()),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        type: mode === 'url' ? 'pokepaste' : 'showdown',
        ...(mode === 'url' ? { url: input } : { paste: input }),
        regulation,
        teamName: teamName || undefined,
        force: forceImport,
      };
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409) {
        setDuplicateInfo({ id: data.duplicateId, regulation: data.duplicateRegulation });
        return null;
      }
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        qc.invalidateQueries({ queryKey: ['meta-teams'] });
        onClose();
      }
    },
  });

  const fieldClass =
    'w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">
          {mode === 'url' ? 'Import from pokepast.es' : 'Import Showdown Paste'}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-3"
        >
          {mode === 'url' ? (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">pokepast.es URL</label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={fieldClass}
                placeholder="https://pokepast.es/0123456789abcdef"
                required
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Showdown Paste</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={`${fieldClass} h-48 resize-none font-mono`}
                placeholder="Paste Showdown team here..."
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Regulation *</label>
            <select
              value={regulation}
              onChange={(e) => setRegulation(e.target.value)}
              className={fieldClass}
              required
            >
              <option value="">Select regulation...</option>
              {regulations?.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Team Name (optional)</label>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Miraidon Rain Team"
            />
          </div>

          {duplicateInfo && (
            <div className="bg-amber-950 border border-amber-700 rounded p-3 text-sm">
              <div className="text-amber-300 font-medium">Duplicate team detected</div>
              <div className="text-amber-400 text-xs mt-1">
                This team already exists (ID #{duplicateInfo.id}
                {duplicateInfo.regulation && ` under ${duplicateInfo.regulation}`}).
              </div>
              <label className="flex items-center gap-2 mt-2 text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceImport}
                  onChange={(e) => setForceImport(e.target.checked)}
                />
                Import anyway
              </label>
            </div>
          )}

          {mutation.error && (
            <div className="text-red-400 text-sm">{String(mutation.error)}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
            >
              {mutation.isPending ? 'Importing…' : 'Import'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded px-4 py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
