import type { ParsedSlot, ParseResult, ParseWarning } from '../../shared/types';
import { resolveMegaBase } from '../../data/megaForms';

const UA = 'champions-helper/1.0 (personal team builder)';
const SP_MAX_TOTAL = 66;
const SP_MAX_STAT = 32;

function parseSpread(raw: string): string | null {
  const stats = raw.split('/').map((s) => s.trim());
  if (stats.length !== 6) return null;
  const nums = stats.map(Number);
  if (nums.some(isNaN)) return null;
  if (nums.some((n) => n > SP_MAX_STAT)) return null;
  if (nums.reduce((a, b) => a + b, 0) > SP_MAX_TOTAL) return null;
  return nums.join('/');
}

function evToSp(raw: string): string | null {
  // EV format: "252 HP / 4 Atk / 252 Spe" (stat order doesn't matter, we normalize)
  const statMap: Record<string, number> = { HP: 0, Atk: 1, Def: 2, SpA: 3, SpD: 4, Spe: 5 };
  const result = [0, 0, 0, 0, 0, 0];
  const parts = raw.split('/');
  for (const part of parts) {
    const m = part.trim().match(/^(\d+)\s+(\w+)$/);
    if (!m) return null;
    const idx = statMap[m[2]];
    if (idx === undefined) return null;
    result[idx] = Math.floor(Number(m[1]) / 8);
  }
  const sp = result.join('/');
  return parseSpread(sp);
}

export function parseShowdownPaste(text: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const rawBlocks = text.trim().split(/\n{2,}/);
  const slots: ParsedSlot[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i].trim();
    if (!block) continue;

    const lines = block.split('\n').map((l) => l.trim());
    if (lines.length === 0) continue;

    // Parse header: "[Nickname (]Species[)] [@ Item]"
    const headerLine = lines[0];
    let speciesRaw = '';
    let nickname: string | undefined;
    let item: string | undefined;

    const atSplit = headerLine.split(' @ ');
    const nameSection = atSplit[0].trim();
    if (atSplit[1]) item = atSplit[1].trim();

    const nicknameMatch = nameSection.match(/^(.+?)\s*\((.+?)\)$/);
    if (nicknameMatch) {
      nickname = nicknameMatch[1].trim();
      speciesRaw = nicknameMatch[2].trim();
    } else {
      speciesRaw = nameSection.trim();
    }

    const { base: speciesName, item: megaItem } = resolveMegaBase(speciesRaw);
    if (megaItem && !item) item = megaItem;

    let ability = '';
    let nature = '';
    let spSpread = '';
    const moves: string[] = [];
    let spLine = '';
    let hasEv = false;

    for (const line of lines.slice(1)) {
      if (line.startsWith('Ability:')) {
        ability = line.replace('Ability:', '').trim();
      } else if (line.startsWith('EVs:')) {
        hasEv = true;
        spLine = line.replace('EVs:', '').trim();
      } else if (line.startsWith('SPs:')) {
        spLine = line.replace('SPs:', '').trim();
      } else if (line.match(/^[\w\s]+ Nature$/)) {
        nature = line.replace(' Nature', '').trim();
      } else if (line.startsWith('- ')) {
        moves.push(line.slice(2).trim());
      }
      // Level:, Shiny:, IVs: — ignored
    }

    if (hasEv && spLine) {
      const converted = evToSp(spLine);
      if (converted === null) {
        warnings.push({ message: `Block ${i + 1}: could not parse EVs "${spLine}"`, slotIndex: i });
        spSpread = '0/0/0/0/0/0';
      } else {
        spSpread = converted;
      }
    } else if (spLine) {
      const parsed = parseSpread(spLine);
      if (parsed === null) {
        if (spLine.split('/').map(Number).some((n) => n > SP_MAX_STAT)) {
          throw new Error(`Block ${i + 1}: SP stat exceeds max of ${SP_MAX_STAT}: "${spLine}"`);
        }
        const total = spLine.split('/').map(Number).reduce((a, b) => a + b, 0);
        if (total > SP_MAX_TOTAL) {
          throw new Error(`Block ${i + 1}: SP total ${total} exceeds max of ${SP_MAX_TOTAL}`);
        }
        warnings.push({ message: `Block ${i + 1}: could not parse SP spread "${spLine}"`, slotIndex: i });
        spSpread = '0/0/0/0/0/0';
      } else {
        spSpread = parsed;
      }
    } else {
      spSpread = '0/0/0/0/0/0';
    }

    if (!ability) {
      warnings.push({ message: `Block ${i + 1}: no ability found`, slotIndex: i });
      ability = '';
    }
    if (!nature) {
      warnings.push({ message: `Block ${i + 1}: no nature found`, slotIndex: i });
      nature = '';
    }
    if (moves.length < 4) {
      warnings.push({ message: `Block ${i + 1}: only ${moves.length} moves found`, slotIndex: i });
    }

    while (moves.length < 4) moves.push('');

    slots.push({
      speciesName,
      nickname,
      move1: moves[0],
      move2: moves[1],
      move3: moves[2],
      move4: moves[3],
      ability,
      nature,
      spSpread,
      item,
    });
  }

  return {
    slots,
    isPartial: slots.length < 6,
    warnings,
  };
}
