/**
 * Join codes: six characters from an alphabet with the look-alikes removed
 * (no 0/O, no 1/I/L). The database generates them and enforces the same shape;
 * keep the alphabet in sync with supabase/migrations/20261114000000_init.sql.
 */
export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const VALID = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`);

/**
 * Cleans up what a person typed or pasted: upper-cases, drops spaces and
 * dashes, and maps the characters we never issue to the ones people mean
 * (0 → O is not possible since O is excluded too, so those are dropped).
 */
export function normalizeJoinCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')
    .filter((ch) => JOIN_CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, JOIN_CODE_LENGTH);
}

export function isValidJoinCode(code: string): boolean {
  return VALID.test(code);
}

/** Pulls a code out of a share link such as consecrate://join/K7M2QX. */
export function joinCodeFromUrl(url: string): string | null {
  const match = /\/join\/([A-Za-z0-9]+)/.exec(url);
  if (!match) return null;
  const code = normalizeJoinCode(match[1]);
  return isValidJoinCode(code) ? code : null;
}
