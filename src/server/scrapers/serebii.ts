import { parse as parseHtml } from 'node-html-parser';

const UA = 'champions-helper/1.0 (personal team builder)';

export async function fetchRegulationSpecies(regulationName: string): Promise<string[]> {
  const slug = regulationName.toLowerCase().replace(/[-\s]/g, '');
  const url = `https://serebii.net/pokemonchampions/rankedbattle/regulation${slug}.shtml`;

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Serebii fetch failed: ${res.status} for regulation ${regulationName}`);

  const html = await res.text();
  const root = parseHtml(html);

  const speciesNames: string[] = [];

  // Serebii lists Pokemon names in .dextable or similar table cells
  const cells = root.querySelectorAll('.dextable td, .fooinfo td, td.fooinfo');
  for (const cell of cells) {
    const text = cell.text.trim();
    if (text && !text.match(/^\d+$/) && text.length > 2) {
      // Normalize to Showdown convention (remove leading #, etc.)
      const cleaned = text.replace(/^#\d+\s+/, '').trim();
      if (cleaned && !speciesNames.includes(cleaned)) {
        speciesNames.push(cleaned);
      }
    }
  }

  // Fallback: look for Pokemon name links
  if (speciesNames.length === 0) {
    const links = root.querySelectorAll('a[href*="pokedex"]');
    for (const link of links) {
      const name = link.text.trim();
      if (name && !speciesNames.includes(name)) {
        speciesNames.push(name);
      }
    }
  }

  return speciesNames;
}
