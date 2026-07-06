/**
 * The stored data contract (see SPEC.md): the field holds an array of text
 * segments, each a run of characters that is either bold or not.
 *
 * These helpers are pure (no Lexical, no React) so the serialization contract
 * can be reasoned about and tested in isolation. The Lexical ⇄ segment bridge
 * lives in the editor component; here we only deal with plain data.
 */
export type Segment = { text: string; bold: boolean };

/**
 * Enforces the normalized shape the field promises to store:
 *   - segments with empty text are dropped, and
 *   - adjacent segments that share the same `bold` value are merged.
 *
 * Both rules keep the stored array minimal and canonical, so a given rendered
 * text always serializes to exactly one array (stable round-trips, clean diffs).
 */
export function normalizeSegments(segments: Segment[]): Segment[] {
  const result: Segment[] = [];
  for (const { text, bold } of segments) {
    if (text.length === 0) continue;
    const last = result[result.length - 1];
    if (last && last.bold === bold) {
      last.text += text;
    } else {
      result.push({ text, bold });
    }
  }
  return result;
}

/**
 * Serializes segments into the value stored on the DatoCMS `json` field.
 *
 * An empty field stores `null` (not `[]`) so Dato's `required` validation and
 * "is empty" filters behave cleanly. A non-empty field stores the normalized
 * array as a JSON *string* — a `json` field rejects a top-level scalar but
 * accepts a stringified object/array (see the plugin gotchas note).
 */
export function serializeFieldValue(segments: Segment[]): string | null {
  const normalized = normalizeSegments(segments);
  return normalized.length === 0 ? null : JSON.stringify(normalized);
}

/**
 * Parses a stored field value back into normalized segments. Tolerant of any
 * shape Dato might hand back (a JSON string, `null`, or unexpected data): if the
 * value isn't a recognizable segment array it yields an empty list rather than
 * throwing, so a malformed value degrades to an empty editor instead of a crash.
 */
export function parseFieldValue(rawValue: unknown): Segment[] {
  const parsed = coerceToArray(rawValue);
  if (!parsed) return [];

  const segments: Segment[] = [];
  for (const item of parsed) {
    if (item && typeof item === 'object' && 'text' in item) {
      const { text, bold } = item as { text: unknown; bold: unknown };
      if (typeof text === 'string') {
        segments.push({ text, bold: bold === true });
      }
    }
  }
  return normalizeSegments(segments);
}

/**
 * Dato hands JSON fields back as a stringified value, but be liberal: accept an
 * already-parsed array too. Anything else (null, object, malformed JSON) → null.
 */
function coerceToArray(rawValue: unknown): unknown[] | null {
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue !== 'string' || rawValue.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
