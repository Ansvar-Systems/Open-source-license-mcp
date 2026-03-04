/**
 * Sanitize user input for FTS5 queries.
 * Wraps each word in double quotes to prevent FTS5 syntax errors.
 */
export function sanitizeFtsQuery(input: string): string {
  return input
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word}"`)
    .join(' ');
}
