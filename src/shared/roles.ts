type SlotInput = {
  move1?: string | null;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
  ability?: string | null;
};

const MOVE_ROLES: Record<string, string> = {
  'Trick Room': 'TR Setter',
  'Tailwind': 'Tailwind',
  'Follow Me': 'Redirector',
  'Rage Powder': 'Redirector',
  'Fake Out': 'Fake Out',
  'Wide Guard': 'Wide Guard',
  'Rain Dance': 'Rain',
  'Sunny Day': 'Sun',
  'Sandstorm': 'Sand',
  'Snowscape': 'Snow',
  'Hail': 'Snow',
  'Icy Wind': 'Speed Control',
  'Electroweb': 'Speed Control',
  'Glacial Lance': 'Speed Control',
};

const ABILITY_ROLES: Record<string, string> = {
  'Intimidate': 'Intimidate',
  'Drizzle': 'Rain',
  'Primordial Sea': 'Rain',
  'Drought': 'Sun',
  'Desolate Land': 'Sun',
  'Sand Stream': 'Sand',
  'Snow Warning': 'Snow',
  'Electric Surge': 'Electric Terrain',
  'Grassy Surge': 'Grassy Terrain',
  'Misty Surge': 'Misty Terrain',
  'Psychic Surge': 'Psychic Terrain',
};

export const ROLE_COLORS: Record<string, string> = {
  'TR Setter': 'bg-violet-900/60 border-violet-700 text-violet-300',
  'Tailwind': 'bg-sky-900/60 border-sky-700 text-sky-300',
  'Redirector': 'bg-pink-900/60 border-pink-700 text-pink-300',
  'Fake Out': 'bg-orange-900/60 border-orange-700 text-orange-300',
  'Wide Guard': 'bg-indigo-900/60 border-indigo-700 text-indigo-300',
  'Intimidate': 'bg-red-900/60 border-red-700 text-red-300',
  'Rain': 'bg-blue-900/60 border-blue-700 text-blue-300',
  'Sun': 'bg-yellow-900/60 border-yellow-700 text-yellow-300',
  'Sand': 'bg-amber-900/60 border-amber-700 text-amber-300',
  'Snow': 'bg-cyan-900/60 border-cyan-700 text-cyan-300',
  'Speed Control': 'bg-teal-900/60 border-teal-700 text-teal-300',
  'Electric Terrain': 'bg-yellow-900/60 border-yellow-600 text-yellow-200',
  'Grassy Terrain': 'bg-green-900/60 border-green-700 text-green-300',
  'Misty Terrain': 'bg-rose-900/60 border-rose-700 text-rose-300',
  'Psychic Terrain': 'bg-purple-900/60 border-purple-700 text-purple-300',
};

const DEFAULT_ROLE_COLOR = 'bg-gray-800 border-gray-600 text-gray-400';

export function roleColor(role: string): string {
  return ROLE_COLORS[role] ?? DEFAULT_ROLE_COLOR;
}

export function detectRoles(slot: SlotInput): string[] {
  const roles = new Set<string>();
  for (const move of [slot.move1, slot.move2, slot.move3, slot.move4]) {
    if (move && MOVE_ROLES[move]) roles.add(MOVE_ROLES[move]);
  }
  if (slot.ability && ABILITY_ROLES[slot.ability]) {
    roles.add(ABILITY_ROLES[slot.ability]);
  }
  return [...roles];
}

export function detectTeamRoles(slots: SlotInput[]): string[] {
  const seen = new Set<string>();
  for (const slot of slots) {
    for (const role of detectRoles(slot)) seen.add(role);
  }
  return [...seen];
}
