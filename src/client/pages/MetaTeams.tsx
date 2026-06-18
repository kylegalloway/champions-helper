import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MetaTeam, Regulation, RosterEntry, ScrapeProgressEvent } from '../../shared/types';
import { MetaTeamCard } from '../components/MetaTeamCard';
import { ImportModal } from '../components/ImportModal';

interface SpeciesFilter {
  species: string;
  mode: 'include' | 'exclude';
}

function PokemonFilterBar({
  filters,
  allSpecies,
  onChange,
}: {
  filters: SpeciesFilter[];
  allSpecies: string[];
  onChange: (filters: SpeciesFilter[]) => void;
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    const active = new Set(filters.map((f) => f.species.toLowerCase()));
    return allSpecies
      .filter((s) => s.toLowerCase().includes(q) && !active.has(s.toLowerCase()))
      .slice(0, 8);
  }, [input, allSpecies, filters]);

  function addFilter(species: string) {
    onChange([...filters, { species, mode: 'include' }]);
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function toggleMode(i: number) {
    onChange(filters.map((f, idx) => idx === i ? { ...f, mode: f.mode === 'include' ? 'exclude' : 'include' } : f));
  }

  function remove(i: number) {
    onChange(filters.filter((_, idx) => idx !== i));
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && suggestions.length > 0) {
      addFilter(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 min-h-[36px]">
      {filters.map((f, i) => (
        <span
          key={f.species}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
            f.mode === 'include'
              ? 'bg-green-900/50 border-green-700 text-green-300'
              : 'bg-red-900/50 border-red-700 text-red-300'
          }`}
        >
          <button onClick={() => toggleMode(i)} title="Click to toggle include/exclude" className="hover:opacity-70">
            {f.mode === 'include' ? '+' : '−'}
          </button>
          {f.species}
          <button onClick={() => remove(i)} className="hover:opacity-70 ml-0.5">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
        onKeyDown={handleKey}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={filters.length === 0 ? 'Filter by Pokémon…' : ''}
        className="flex-1 min-w-24 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-gray-900 border border-gray-700 rounded shadow-lg z-20">
          {suggestions.map((s) => (
            <button
              key={s}
              onMouseDown={() => addFilter(s)}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MetaTeamsPage() {
  const [selectedRegulation, setSelectedRegulation] = useState('');
  const [importMode, setImportMode] = useState<'url' | 'paste' | null>(null);
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [tournamentUrl, setTournamentUrl] = useState('');
  const [scrapeLog, setScrapeLog] = useState<string[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [speciesFilters, setSpeciesFilters] = useState<SpeciesFilter[]>([]);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const qc = useQueryClient();

  const { data: regulations } = useQuery<Regulation[]>({
    queryKey: ['regulations'],
    queryFn: () => fetch('/api/meta-teams/regulations').then((r) => r.json()),
  });

  const { data: teams, isLoading } = useQuery<MetaTeam[]>({
    queryKey: ['meta-teams', selectedRegulation],
    queryFn: () => {
      const url = selectedRegulation
        ? `/api/meta-teams?regulation=${encodeURIComponent(selectedRegulation)}`
        : '/api/meta-teams';
      return fetch(url).then((r) => r.json());
    },
  });

  const { data: roster } = useQuery<RosterEntry[]>({
    queryKey: ['roster'],
    queryFn: () => fetch('/api/roster').then((r) => r.json()),
    enabled: ownedOnly,
  });

  const ownedSpecies = useMemo(() => {
    if (!roster) return null;
    const names = new Set<string>();
    for (const e of roster) {
      names.add(e.speciesName);
      // Mega forms: owning the base form counts
      if (e.speciesName.includes('-Mega')) {
        names.add(e.speciesName.replace(/-Mega.*$/, ''));
      } else {
        // Base form: also covers any mega of it
        names.add(`${e.speciesName}-Mega`);
        names.add(`${e.speciesName}-Mega-X`);
        names.add(`${e.speciesName}-Mega-Y`);
      }
    }
    return names;
  }, [roster]);

  const allSpecies = useMemo(() => {
    if (!teams) return [];
    const names = new Set<string>();
    for (const team of teams) {
      for (const slot of team.slots ?? []) names.add(slot.speciesName);
    }
    return [...names].sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    if (!teams) return teams;
    return teams.filter((team) => {
      const teamSpecies = new Set((team.slots ?? []).map((s) => s.speciesName));
      if (speciesFilters.length > 0) {
        const passesSpecies = speciesFilters.every((f) =>
          f.mode === 'include' ? teamSpecies.has(f.species) : !teamSpecies.has(f.species)
        );
        if (!passesSpecies) return false;
      }
      if (ownedOnly && ownedSpecies) {
        const allOwned = [...teamSpecies].every((s) => ownedSpecies.has(s));
        if (!allOwned) return false;
      }
      return true;
    });
  }, [teams, speciesFilters, ownedOnly, ownedSpecies]);

  async function startScrape() {
    if (!tournamentUrl.trim()) return;
    setIsScraping(true);
    setScrapeLog([]);

    try {
      const res = await fetch('/api/import/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentUrl: tournamentUrl.trim(),
          regulation: selectedRegulation || 'M-B',
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: ScrapeProgressEvent = JSON.parse(line.slice(6));
              setScrapeLog((prev) => [...prev, event.message]);
              if (event.type === 'done' || event.type === 'error') {
                setIsScraping(false);
                qc.invalidateQueries({ queryKey: ['meta-teams'] });
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }
      }
    } catch (err) {
      setScrapeLog((prev) => [...prev, `Error: ${err}`]);
      setIsScraping(false);
    }
  }

  const fieldClass =
    'w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-white mr-auto">Meta Teams</h1>

        <select
          value={selectedRegulation}
          onChange={(e) => setSelectedRegulation(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500"
        >
          <option value="">All Regulations</option>
          {regulations?.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowScrapeModal(true)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm transition-colors"
        >
          Import Tournament
        </button>

        <button
          onClick={() => setImportMode('url')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm transition-colors"
        >
          Import URL
        </button>

        <button
          onClick={() => setImportMode('paste')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm transition-colors"
        >
          Paste Import
        </button>

        <button
          onClick={() => setOwnedOnly((v) => !v)}
          className={`border rounded px-3 py-1.5 text-sm transition-colors ${
            ownedOnly
              ? 'bg-green-800 border-green-600 text-green-200 hover:bg-green-700'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Owned all 6
        </button>
      </div>

      <div className="mb-4">
        <PokemonFilterBar
          filters={speciesFilters}
          allSpecies={allSpecies}
          onChange={setSpeciesFilters}
        />
        {speciesFilters.length > 0 && (
          <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
            <span>
              {filteredTeams?.length ?? 0} of {teams?.length ?? 0} teams match
            </span>
            <button onClick={() => setSpeciesFilters([])} className="hover:text-gray-300 transition-colors">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-gray-500 text-center py-12">Loading teams…</div>
      )}

      {!isLoading && filteredTeams?.length === 0 && (
        <div className="text-center py-12">
          {teams?.length === 0 ? (
            <>
              <p className="text-gray-500 mb-3">No meta teams imported yet.</p>
              <p className="text-gray-600 text-sm">
                Use "Import Tournament" to scrape a Pikalytics tournament page, or "Import URL" /
                "Paste Import" to add individual teams.
              </p>
            </>
          ) : (
            <p className="text-gray-500">No teams match the current filters.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filteredTeams?.map((team) => (
          <MetaTeamCard key={team.id} team={team} />
        ))}
      </div>

      {/* Import Tournament modal */}
      {showScrapeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-1">Import Tournament Teams</h2>
            <p className="text-gray-500 text-xs mb-4">
              Paste a Pikalytics tournament URL (e.g.{' '}
              <span className="font-mono text-gray-400">
                pikalytics.com/tournaments/rk9/some-slug
              </span>
              ). All teams from that page will be imported.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tournament URL or slug</label>
                <input
                  value={tournamentUrl}
                  onChange={(e) => setTournamentUrl(e.target.value)}
                  className={fieldClass}
                  placeholder="https://pikalytics.com/tournaments/rk9/..."
                  disabled={isScraping}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tag under regulation</label>
                <select
                  value={selectedRegulation || 'M-B'}
                  onChange={(e) => setSelectedRegulation(e.target.value)}
                  className={fieldClass}
                  disabled={isScraping}
                >
                  {regulations?.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {scrapeLog.length > 0 && (
                <div className="bg-gray-950 border border-gray-800 rounded p-3 text-xs font-mono text-gray-400 max-h-40 overflow-y-auto">
                  {scrapeLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={startScrape}
                  disabled={isScraping || !tournamentUrl.trim()}
                  className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
                >
                  {isScraping ? 'Scraping…' : 'Import'}
                </button>
                <button
                  onClick={() => {
                    setShowScrapeModal(false);
                    setScrapeLog([]);
                  }}
                  disabled={isScraping}
                  className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded px-4 py-2 text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {importMode && (
        <ImportModal mode={importMode} onClose={() => setImportMode(null)} />
      )}
    </div>
  );
}
