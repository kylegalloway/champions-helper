import { parse as parseHtml } from 'node-html-parser';
import { parseShowdownPaste } from './showdown';
import type { ParsedSlot, ParseResult } from '../../shared/types';

const UA = 'champions-helper/1.0 (personal team builder)';
const BASE = 'https://pikalytics.com';

export interface PikalyticsUsageEntry {
  rank: number;
  speciesName: string;
  usagePct: number;
}

export interface PikalyticsBuild {
  speciesName: string;
  moves: string[];
  abilities: string[];
  spreads: Array<{ spread: string; pct: number }>;
  items: string[];
  natures: string[];
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Pikalytics fetch failed: ${res.status} for ${url}`);
  return res.text();
}

export async function fetchUsageList(formatCode: string): Promise<PikalyticsUsageEntry[]> {
  const md = await fetchText(`${BASE}/ai/pokedex/${formatCode}`);
  const entries: PikalyticsUsageEntry[] = [];
  const lineRe = /^(\d+)\.\s+\[(.+?)\]/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(md)) !== null) {
    entries.push({ rank: Number(m[1]), speciesName: m[2], usagePct: 0 });
  }
  return entries;
}

export async function fetchSpeciesBuild(formatCode: string, speciesName: string): Promise<PikalyticsBuild> {
  const slug = speciesName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const md = await fetchText(`${BASE}/ai/pokedex/${formatCode}/${slug}`);

  const extractSection = (header: string): string[] => {
    const re = new RegExp(`## ${header}s?\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = md.match(re);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) =>
        l
          .replace(/^\d+\.\s*/, '')   // "1. "
          .replace(/^-\s*/, '')        // "- "
          .replace(/\s*\([\d.]+%\)\s*$/, '')  // trailing "(45%)"
          .trim()
      )
      .filter(Boolean);
  };

  const spreads = (() => {
    const re = /## Spreads?\n([\s\S]*?)(?=\n##|$)/i;
    const match = md.match(re);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.match(/^\d+[./]/))
      .map((l) => {
        const parts = l.split(/\s+/);
        return { spread: parts[0], pct: 0 };
      });
  })();

  return {
    speciesName,
    moves: extractSection('Moves'),
    abilities: extractSection('Abilities'),
    spreads,
    items: extractSection('Items'),
    natures: extractSection('Natures'),
  };
}

interface RankedData {
  spread: string | null;
  nature: string | null;
}

async function fetchRankedDataForName(formatCode: string, speciesName: string): Promise<RankedData> {
  const slug = speciesName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  try {
    const md = await fetchText(`${BASE}/ai/pokedex/${formatCode}/${slug}`);

    const spreadMatch = md.match(/EV spread of `(\d+\/\d+\/\d+\/\d+\/\d+\/\d+)`/);
    let spread: string | null = null;
    if (spreadMatch) {
      const parts = spreadMatch[1].split('/').map(Number);
      if (parts.length === 6 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 32) && parts.reduce((a, b) => a + b, 0) <= 66) {
        spread = spreadMatch[1];
      }
    }

    const natureMatch = md.match(/## Natures?\n[\s\S]*?(?:^|\n)\d+\.\s*([A-Z][a-z]+)/m);
    const nature = natureMatch ? natureMatch[1] : null;

    return { spread, nature };
  } catch {
    return { spread: null, nature: null };
  }
}

export async function fetchEstimatedRankedData(
  formatCode: string,
  speciesName: string
): Promise<RankedData> {
  const data = await fetchRankedDataForName(formatCode, speciesName);
  if (data.spread !== null || data.nature !== null) return data;

  // Mega forms fall back to base species
  if (speciesName.includes('-Mega')) {
    const baseName = speciesName.replace(/-Mega.*$/, '');
    return fetchRankedDataForName(formatCode, baseName);
  }

  return { spread: null, nature: null };
}

interface PikalyticsTournamentPokemon {
  name: string;
  item?: string;
  ability?: string;
  moves?: Array<{ name: string }>;
}

interface PikalyticsTournamentTeam {
  author?: string;
  ranking?: number;
  record?: string;
  link?: string;
  pokemon: PikalyticsTournamentPokemon[];
}

interface PikalyticsTournamentsData {
  teams?: PikalyticsTournamentTeam[];
}

const REGULATION_FORMAT_CODES: Record<string, string> = {
  'M-A': 'battledataregmas3',
  'M-B': 'battledataregmbs3',
  'M-C': 'battledataregmcs3',
  'M-D': 'battledataregmds3',
  'M-E': 'battledataregmes3',
  'M-F': 'battledataregmfs3',
  'M-G': 'battledataregmgs3',
  'M-H': 'battledataregmhs3',
};

function regulationToFormatCode(regulation: string): string {
  return REGULATION_FORMAT_CODES[regulation] ?? REGULATION_FORMAT_CODES['M-B'];
}

export async function fetchTournamentTeams(slug: string, regulation = 'M-B'): Promise<ParseResult[]> {
  // Try both rk9 and limitless URL patterns
  const urls = [
    `${BASE}/tournaments/rk9/${slug}`,
    `${BASE}/tournaments/limitless/${slug}`,
  ];

  let html = '';
  for (const url of urls) {
    try {
      html = await fetchText(url);
      if (html.length > 10000) break;
    } catch {
      // try next URL
    }
  }

  if (!html) throw new Error(`Could not fetch tournament page for slug: ${slug}`);

  // Extract window.__TOURNAMENTS_DATA__ JSON blob (server-rendered into the page)
  const jsonMatch = html.match(/window\.__TOURNAMENTS_DATA__\s*=\s*(\{[\s\S]*?(?=;\s*(?:window\.|<\/script>)))/);
  if (!jsonMatch) {
    return [];
  }

  let data: PikalyticsTournamentsData;
  try {
    data = JSON.parse(jsonMatch[1]);
  } catch {
    return [];
  }

  const rawTeams = data.teams ?? [];

  // Collect unique species names and fetch estimated ranked data in parallel
  const uniqueSpecies = [...new Set(rawTeams.flatMap((t) => (t.pokemon ?? []).map((p) => p.name)))];
  const rankedMap = new Map<string, RankedData>();
  const formatCode = regulationToFormatCode(regulation);

  // Batch fetches with concurrency limit of 8
  for (let i = 0; i < uniqueSpecies.length; i += 8) {
    const batch = uniqueSpecies.slice(i, i + 8);
    const results = await Promise.all(
      batch.map(async (name) => ({
        name,
        data: await fetchEstimatedRankedData(formatCode, name),
      }))
    );
    for (const { name, data } of results) rankedMap.set(name, data);
  }

  const results: ParseResult[] = [];

  for (const team of rawTeams) {
    if (!team.pokemon || team.pokemon.length === 0) continue;

    const slots = team.pokemon.map((p: PikalyticsTournamentPokemon) => {
      const moves = (p.moves ?? []).map((m) => m.name);
      while (moves.length < 4) moves.push('');
      const ranked = rankedMap.get(p.name);
      return {
        speciesName: p.name,
        move1: moves[0],
        move2: moves[1],
        move3: moves[2],
        move4: moves[3],
        ability: p.ability ?? '',
        nature: ranked?.nature ?? '',
        natureEstimated: ranked?.nature != null,
        spSpread: ranked?.spread ?? '0/0/0/0/0/0',
        spSpreadEstimated: ranked?.spread != null,
        item: p.item ?? undefined,
      };
    });

    const hasEstimate = slots.some((s) => s.spSpreadEstimated || s.natureEstimated);
    const warnings = hasEstimate
      ? [{ message: 'Nature and SP spreads are estimated from ranked battle data' }]
      : [{ message: 'Nature and SP spread not available from Pikalytics for these species' }];

    results.push({
      slots,
      isPartial: slots.length < 6,
      warnings,
      playerName: team.author ?? undefined,
      playerRecord: team.record ?? undefined,
    });
  }

  return results;
}
