/** Max characters of review text shown on browse cards. */
const SNIPPET_MAX = 80;

/**
 * Returns a trimmed ~80-char snippet of a review text for browse cards,
 * or null when there is no usable text.
 */
export function getReviewSnippet(text: string | undefined | null): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length <= SNIPPET_MAX) return trimmed;
  // Cut at the last space before the limit so we don't split a word.
  const slice = trimmed.slice(0, SNIPPET_MAX);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}
