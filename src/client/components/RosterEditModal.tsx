import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RosterEntry } from '../../shared/types';

interface Props {
  entry?: RosterEntry | null;
  onClose: () => void;
}

interface FormState {
  speciesName: string;
  nickname: string;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  ability: string;
  nature: string;
  spSpread: string;
  isHomePokemon: boolean;
}

function toForm(entry?: RosterEntry | null): FormState {
  return {
    speciesName: entry?.speciesName ?? '',
    nickname: entry?.nickname ?? '',
    move1: entry?.move1 ?? '',
    move2: entry?.move2 ?? '',
    move3: entry?.move3 ?? '',
    move4: entry?.move4 ?? '',
    ability: entry?.ability ?? '',
    nature: entry?.nature ?? '',
    spSpread: entry?.spSpread ?? '0/0/0/0/0/0',
    isHomePokemon: entry?.isHomePokemon ?? false,
  };
}

export function RosterEditModal({ entry, onClose }: Props) {
  const [form, setForm] = useState<FormState>(toForm(entry));
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: FormState) => {
      const url = entry ? `/api/roster/${entry.id}` : '/api/roster';
      const method = entry ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/roster/${entry!.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster'] });
      onClose();
    },
  });

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const fieldClass =
    'w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">{entry ? 'Edit Pokemon' : 'Add Pokemon'}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Species</label>
              <input value={form.speciesName} onChange={set('speciesName')} className={fieldClass} required />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nickname</label>
              <input value={form.nickname} onChange={set('nickname')} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Ability</label>
              <input value={form.ability} onChange={set('ability')} className={fieldClass} required />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nature</label>
              <input value={form.nature} onChange={set('nature')} className={fieldClass} required />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">SP Spread (HP/Atk/Def/SpA/SpD/Spe)</label>
            <input
              value={form.spSpread}
              onChange={set('spSpread')}
              className={fieldClass}
              placeholder="0/0/0/0/0/0"
              pattern="\d+/\d+/\d+/\d+/\d+/\d+"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['move1', 'move2', 'move3', 'move4'] as const).map((m, i) => (
              <div key={m}>
                <label className="text-xs text-gray-400 mb-1 block">Move {i + 1}</label>
                <input value={form[m]} onChange={set(m)} className={fieldClass} />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isHomePokemon}
              onChange={set('isHomePokemon')}
              className="rounded"
            />
            Pokemon Home
          </label>

          {mutation.error && (
            <div className="text-red-400 text-sm">{String(mutation.error)}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
            >
              {mutation.isPending ? 'Saving…' : entry ? 'Save' : 'Add'}
            </button>
            {entry && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this Pokemon?')) deleteMutation.mutate();
                }}
                className="bg-red-900 hover:bg-red-800 text-red-300 rounded px-4 py-2 text-sm font-medium transition-colors"
              >
                Delete
              </button>
            )}
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
