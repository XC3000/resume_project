/**
 * Stable Failure Signature Log Normaliser.
 * Strips timestamps, UUIDs, hex addresses, line numbers, and file paths
 * from a log chunk to produce a stable failure signature string.
 */
export function normaliseLog(log: string): string {
  if (!log) return '';

  let result = log;

  // 1. Strip Timestamps (ISO datetimes, standard SQL datetimes, standalone times)
  result = result.replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g, '');
  result = result.replace(/\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/g, '');

  // 2. Strip UUIDs (Standard 36-char string representation)
  result = result.replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '');

  // 3. Strip Hex addresses / Memory Pointers (e.g. 0x7ffee3b9a240)
  result = result.replace(/\b0x[0-9a-fA-F]+\b/g, '');

  // 4. Strip line and column numbers (e.g. :123:45, :123, line 12, col 4)
  result = result.replace(/:\d+:\d+\b/g, '');
  result = result.replace(/:\d+\b/g, '');
  result = result.replace(/\bline \d+\b/gi, '');
  result = result.replace(/\bcol \d+\b/gi, '');

  // 5. Strip file paths and relative source filenames
  // FIRST: Match relative file paths and filenames (e.g. src/main.ts, app.ts)
  result = result.replace(/\b[\w-./]+\.(?:ts|js|jsx|tsx|py|go|rb|java|cpp|c|h|php|sh|json|yaml|yml|log)\b/gi, '');
  // SECOND: Match absolute Unix paths (e.g. /usr/bin/node, /home/user/app/src/)
  result = result.replace(/\/[\w-./]+/g, '');
  // THIRD: Match absolute Windows paths (e.g. C:\Users\Admin\App\main.ts)
  result = result.replace(/\b[A-Za-z]:\\[\w-.\\]+/g, '');
  // FOURTH: Strip any remaining leftover path slashes from stripped paths
  result = result.replace(/\/+/g, '');

  // 6. Clean up white spaces and punctuation artifacts left by stripping
  // Replace multiple newlines/carriage returns with a single newline
  result = result.replace(/[\r\n]+/g, '\n');
  // Replace multiple spaces/tabs with a single space
  result = result.replace(/[ \t]+/g, ' ');
  // Trim leading/trailing whitespace
  result = result.trim();

  return result;
}
