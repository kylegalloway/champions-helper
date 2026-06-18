import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { MetaTeam, MetaTeamSlot, Regulation, RosterEntry, ScrapeProgressEvent } from '../../shared/types';
import { vpCost, isExactMatch } from '../../shared/vpCost';
import { MetaTeamCard } from '../components/MetaTeamCard';
import { ImportModal } from '../components/ImportModal';

function computeTeamVpCost(slots: MetaTeamSlot[], rosterBySpecies: Map<string, RosterEntry[]>): number {
  let total = 0;
  for (const slot of slots) {
    let owned = rosterBySpecies.get(slot.speciesName) ?? [];
    if (owned.length === 0 && slot.speciesName.includes('-Mega')) {
      owned = rosterBySpecies.get(slot.speciesName.replace(/-Mega.*$/, '')) ?? [];
    }
    if (owned.length === 0) continue;
    let best = Infinity;
    for (const entry of owned) {
      if (isExactMatch(entry, slot)) { best = 0; break; }
      const c = vpCost(entry, slot);
      if (c < best) best = c;
    }
    total += best === Infinity ? 0 : best;
  }
  return total;
}

function CoreSpeciesBar({
  core,
  allSpecies,
  onChange,
}: {
  core: string[];
  allSpecies: string[];
  onChange: (core: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    const active = new Set(core.map((s) => s.toLowerCase()));
    return allSpecies
      .filter((s) => s.toLowerCase().includes(q) && !active.has(s.toLowerCase()))
      .slice(0, 8);
  }, [input, allSpecies, core]);

  function add(species: string) {
    if (core.length >= 4) return;
    onChange([...core, species]);
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && suggestions.length > 0) add(suggestions[0]);
    else if (e.key === 'Escape') setShowSuggestions(false);
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2 bg-gray-800/60 border border-amber-900/50 rounded px-3 py-1.5 min-h-[36px]">
      <span className="text-xs text-amber-600 font-medium shrink-0">Core:</span>
      {core.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-900/40 border-amber-700 text-amber-300"
        >
          {s}
          <button onClick={() => onChange(core.filter((x) => x !== s))} className="hover:opacity-70 ml-0.5">×</button>
        </span>
      ))}
      {core.length < 4 && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKey}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={core.length === 0 ? 'Add up to 4 Pokémon to build around…' : ''}
          className="flex-1 min-w-32 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
        />
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-gray-900 border border-gray-700 rounded shadow-lg z-20">
          {suggestions.map((s) => (
            <button
              key={s}
              onMouseDown={() => add(s)}
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
  const [sortByVp, setSortByVp] = useState(false);
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [coreSpecies, setCoreSpecies] = useState<string[]>([]);
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
    enabled: ownedOnly || coreSpecies.length > 0,
  });

  const selectedRegulationObj = regulations?.find((r) => r.name === selectedRegulation);

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const url = selectedRegulation
        ? `/api/meta-teams?regulation=${encodeURIComponent(selectedRegulation)}`
        : '/api/meta-teams';
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      return json as { deleted: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meta-teams'] });
      
      alert(`Deleted ${data.deleted} team${data.deleted === 1 ? '' : 's'}.`);
    },
    onError: (err: Error) => alert(`Delete failed: ${err.message}`),
  });

  const seedSpeciesMutation = useMutation({
    mutationFn: async (regId: number) => {
      const res = await fetch(`/api/meta-teams/regulations/${regId}/seed-species`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Seed failed');
      return json as { added: number; total: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['regulations'] });
      qc.invalidateQueries({ queryKey: ['meta-teams'] });
      alert(`Seeded ${data.added} new species (${data.total} total) from Serebii.`);
    },
    onError: (err: Error) => {
      alert(`Seed failed: ${err.message}`);
    },
  });

  const { rosterBySpecies, ownedSpecies } = useMemo(() => {
    if (!roster) return { rosterBySpecies: new Map<string, RosterEntry[]>(), ownedSpecies: null };
    const bySpecies = new Map<string, RosterEntry[]>();
    const names = new Set<string>();
    for (const e of roster) {
      const list = bySpecies.get(e.speciesName) ?? [];
      list.push(e);
      bySpecies.set(e.speciesName, list);
      names.add(e.speciesName);
      if (e.speciesName.includes('-Mega')) {
        names.add(e.speciesName.replace(/-Mega.*$/, ''));
      } else {
        names.add(`${e.speciesName}-Mega`);
        names.add(`${e.speciesName}-Mega-X`);
        names.add(`${e.speciesName}-Mega-Y`);
      }
    }
    return { rosterBySpecies: bySpecies, ownedSpecies: names };
  }, [roster]);

  const allSpecies = useMemo(() => {
    if (!teams) return [];
    const names = new Set<string>();
    for (const team of teams) {
      for (const slot of team.slots ?? []) names.add(slot.speciesName);
    }
    return [...names].sort();
  }, [teams]);

  const { filteredTeams, teamVpCosts } = useMemo(() => {
    if (!teams) return { filteredTeams: undefined, teamVpCosts: new Map<number, number>() };

    const costs = new Map<number, number>();
    const canComputeVp = (ownedOnly || coreSpecies.length > 0) && roster && rosterBySpecies.size > 0;

    const filtered = teams.filter((team) => {
      const teamSpecies = new Set((team.slots ?? []).map((s) => s.speciesName));
      if (speciesFilters.length > 0) {
        const passesSpecies = speciesFilters.every((f) =>
          f.mode === 'include' ? teamSpecies.has(f.species) : !teamSpecies.has(f.species)
        );
        if (!passesSpecies) return false;
      }
      if (coreSpecies.length > 0) {
        if (!coreSpecies.every((s) => teamSpecies.has(s))) return false;
      }
      if (ownedOnly && ownedSpecies) {
        const allOwned = [...teamSpecies].every((s) => ownedSpecies.has(s));
        if (!allOwned) return false;
      }
      if (canComputeVp && team.slots) {
        costs.set(team.id, computeTeamVpCost(team.slots, rosterBySpecies));
      }
      return true;
    });

    let sorted = sortByVp && costs.size > 0
      ? [...filtered].sort((a, b) => (costs.get(a.id) ?? 0) - (costs.get(b.id) ?? 0))
      : filtered;

    if (uniqueOnly) {
      const seen = new Set<string>();
      sorted = sorted.filter((t) => {
        if (!t.contentHash || seen.has(t.contentHash)) return false;
        seen.add(t.contentHash);
        return true;
      });
    }

    return { filteredTeams: sorted, teamVpCosts: costs };
  }, [teams, speciesFilters, coreSpecies, ownedOnly, ownedSpecies, sortByVp, uniqueOnly, roster, rosterBySpecies]);

  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    count: filteredTeams?.length ?? 0,
    estimateSize: () => 130,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

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
          onChange={(e) => { setSelectedRegulation(e.target.value); }}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500"
        >
          <option value="">All Regulations</option>
          {regulations?.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}{r.speciesCount ? ` (${r.speciesCount} species)` : ''}
            </option>
          ))}
        </select>

        {selectedRegulationObj && (
          <button
            onClick={() => {
              if (confirm(`Fetch legal species for ${selectedRegulationObj.name} from Serebii? This may take a moment.`)) {
                seedSpeciesMutation.mutate(selectedRegulationObj.id);
              }
            }}
            disabled={seedSpeciesMutation.isPending}
            title="Fetch legal species list from Serebii to enable legality checking"
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm transition-colors"
          >
            {seedSpeciesMutation.isPending ? 'Seeding…' : `Seed Species`}
          </button>
        )}

        <button
          onClick={() => {
            const scope = selectedRegulation ? `all "${selectedRegulation}" teams` : 'ALL teams';
            const count = filteredTeams?.length ?? teams?.length ?? 0;
            if (confirm(`Delete ${scope} (${count} total)? This cannot be undone.`)) {
              deleteAllMutation.mutate();
            }
          }}
          disabled={deleteAllMutation.isPending || (teams?.length ?? 0) === 0}
          className="bg-red-950 hover:bg-red-900 disabled:opacity-40 text-red-400 border border-red-900 rounded px-3 py-1.5 text-sm transition-colors"
        >
          {deleteAllMutation.isPending ? 'Deleting…' : 'Delete all'}
        </button>

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
          onClick={() => { setUniqueOnly((v) => !v); }}
          className={`border rounded px-3 py-1.5 text-sm transition-colors ${
            uniqueOnly
              ? 'bg-blue-900 border-blue-700 text-blue-200 hover:bg-blue-800'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Unique teams
        </button>

        <button
          onClick={() => { setOwnedOnly((v) => !v); }}
          className={`border rounded px-3 py-1.5 text-sm transition-colors ${
            ownedOnly
              ? 'bg-green-800 border-green-600 text-green-200 hover:bg-green-700'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Owned all 6
        </button>

        {ownedOnly && (
          <button
            onClick={() => { setSortByVp((v) => !v); }}
            className={`border rounded px-3 py-1.5 text-sm transition-colors ${
              sortByVp
                ? 'bg-amber-900 border-amber-700 text-amber-200 hover:bg-amber-800'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Sort by VP cost
          </button>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <CoreSpeciesBar
          core={coreSpecies}
          allSpecies={allSpecies}
          onChange={setCoreSpecies}
        />
        <PokemonFilterBar
          filters={speciesFilters}
          allSpecies={allSpecies}
          onChange={(f) => { setSpeciesFilters(f); }}
        />
        {(speciesFilters.length > 0 || coreSpecies.length > 0) && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {filteredTeams?.length ?? 0} of {teams?.length ?? 0} teams match
            </span>
            <button
              onClick={() => { setSpeciesFilters([]); setCoreSpecies([]); }}
              className="hover:text-gray-300 transition-colors"
            >
              Clear all filters
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

      <div
        ref={listRef}
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const team = filteredTeams![vItem.index];
          return (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vItem.start - virtualizer.options.scrollMargin}px)` }}
            >
              <div className="pb-3">
                <MetaTeamCard
                  team={team}
                  estimatedVpCost={teamVpCosts.has(team.id) ? teamVpCosts.get(team.id) : undefined}
                />
              </div>
            </div>
          );
        })}
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
                  onChange={(e) => { setSelectedRegulation(e.target.value); }}
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
