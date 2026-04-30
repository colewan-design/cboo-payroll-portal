import { setCache, getCache } from './cache';
import { API_BASE_URL } from '@/constants/api';

const MANUAL_CACHE_KEY = 'bsu_employee_manual_v1';
const MANUAL_URL = `${API_BASE_URL}/BSU-CBOO-Employee-Manual.md`;
const MAX_SECTION_CHARS = 500;
const MIN_SCORE = 2; // require at least 2 keyword hits before injecting

// Fetch once, cache for 24h (cache.ts TTL)
export async function fetchManual(): Promise<string | null> {
  const cached = await getCache<string>(MANUAL_CACHE_KEY);
  if (cached) return cached;
  try {
    const res = await fetch(MANUAL_URL);
    if (!res.ok) return null;
    const text = await res.text();
    await setCache(MANUAL_CACHE_KEY, text);
    return text;
  } catch {
    return null;
  }
}

// Split by headings, score each section against the query, return best match
export function extractRelevantSection(manual: string, query: string): string | null {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3);
  if (!words.length) return null;

  const sections = manual.split(/\n(?=#{1,3} )/);
  let best = { text: '', score: 0 };

  for (const section of sections) {
    const lower = section.toLowerCase();
    const score = words.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
    if (score > best.score) best = { text: section, score };
  }

  if (best.score < MIN_SCORE) return null;
  return best.text.slice(0, MAX_SECTION_CHARS).trim();
}
