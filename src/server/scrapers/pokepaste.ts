import { parse as parseHtml } from 'node-html-parser';
import { parseShowdownPaste } from './showdown';
import type { ParseResult } from '../../shared/types';

const UA = 'champions-helper/1.0 (personal team builder)';
const POKEPASTE_RE = /^https?:\/\/pokepast\.es\/[0-9a-f]{16}$/;

export function validatePokepasteUrl(url: string): void {
  if (!POKEPASTE_RE.test(url)) {
    throw new Error('Invalid pokepast.es URL. Expected format: https://pokepast.es/<16 hex chars>');
  }
}

export async function fetchPokepaste(url: string): Promise<ParseResult> {
  validatePokepasteUrl(url);

  // Try /json endpoint first
  let pasteText: string | null = null;
  try {
    const jsonRes = await fetch(url + '/json', { headers: { 'User-Agent': UA } });
    if (jsonRes.ok) {
      const json = await jsonRes.json() as { paste?: string };
      if (json.paste) {
        pasteText = json.paste;
      }
    }
  } catch {
    // fall through to HTML scrape
  }

  if (!pasteText) {
    const htmlRes = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!htmlRes.ok) {
      throw new Error(`Failed to fetch pokepast.es: ${htmlRes.status} ${htmlRes.statusText}`);
    }
    const html = await htmlRes.text();
    const root = parseHtml(html);
    const pre = root.querySelector('pre.paste') ?? root.querySelector('pre');
    if (!pre) {
      throw new Error('Could not find paste content on pokepast.es page');
    }
    pasteText = pre.text;
  }

  return parseShowdownPaste(pasteText);
}
