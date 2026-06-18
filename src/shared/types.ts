export interface Species {
  id: number;
  name: string;
  pokiApiUrl?: string | null;
}

export interface RosterEntry {
  id: number;
  speciesId: number;
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

export interface Regulation {
  id: number;
  name: string;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface MetaTeam {
  id: number;
  name?: string | null;
  source: string;
  sourceUrl?: string | null;
  regulationId?: number | null;
  regulationName?: string | null;
  isPartial: boolean;
  contentHash?: string | null;
  createdAt: string;
  slots?: MetaTeamSlot[];
}

export interface MetaTeamSlot {
  id: number;
  teamId: number;
  slot: number;
  speciesId: number;
  speciesName: string;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  ability: string;
  nature: string;
  spSpread: string;
  spSpreadEstimated: boolean;
  natureEstimated: boolean;
  item?: string | null;
}

export type MatchTier = 'EXACT' | 'ADJUSTABLE' | 'UNOWNED';

export interface MatchSlot {
  slot: number;
  targetSlot: MetaTeamSlot;
  tier: MatchTier;
  matchedEntry?: RosterEntry;
  vpCost: number;
  alternates: RosterEntry[];
}

export interface MatchResult {
  teamId: number;
  slots: MatchSlot[];
  totalVpCost: number;
}

export interface ParsedSlot {
  speciesName: string;
  nickname?: string;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  ability: string;
  nature: string;
  spSpread: string;
  spSpreadEstimated?: boolean;
  natureEstimated?: boolean;
  item?: string;
}

export interface ParseWarning {
  message: string;
  slotIndex?: number;
}

export interface ParseResult {
  slots: ParsedSlot[];
  isPartial: boolean;
  warnings: ParseWarning[];
}

export interface ImportRequest {
  type: 'pokepaste' | 'showdown';
  url?: string;
  paste?: string;
  regulation: string;
  teamName?: string;
}

export interface ImportPreview {
  parseResult: ParseResult;
  duplicateHash?: string;
  duplicateRegulation?: string;
}

export interface ScrapeProgressEvent {
  type: 'progress' | 'done' | 'error';
  message: string;
  count?: number;
}
