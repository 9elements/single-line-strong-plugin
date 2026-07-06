/**
 * The stored data contract (see SPEC.md): the field holds an array of text
 * segments, each a run of characters that is either bold or not.
 *
 * These helpers are pure (no Lexical, no React) so the serialization contract
 * can be reasoned about and tested in isolation. The Lexical ⇄ segment bridge
 * lives in the editor component; here we only deal with plain data.
 */
export type Segment = { value: string; mark: boolean };

/**
 * Enforces the normalized shape the field promises to store:
 *   - segments with empty text are dropped,
 *   - adjacent segments that share the same `mark` value are merged, and
 *   - a lone single-space segment sitting between two segments that share the
 *     *other* mark is absorbed into them.
 *
 * The last rule reflects that a space's mark is visually meaningless: e.g.
 * `"jetzt"(mark) + " "(plain) + "mein"(mark)` should collapse into a single
 * marked `"jetzt mein"` rather than three segments split by an unmarked space.
 *
 * These rules keep the stored array minimal and canonical, so a given rendered
 * text always serializes to exactly one array (stable round-trips, clean diffs).
 */
export function normalizeSegments(segments: Segment[]): Segment[] {
  // First pass: drop empty runs and merge adjacent runs that share a mark. This
  // yields an array whose marks strictly alternate.
  const merged: Segment[] = [];
  for (const { value, mark } of segments) {
    if (value.length === 0) continue;
    const last = merged[merged.length - 1];
    if (last && last.mark === mark) {
      last.value += value;
    } else {
      merged.push({ value, mark });
    }
  }

  // Second pass: absorb a lone single-space run into the runs around it when
  // those neighbors share a mark (guaranteed to be the opposite mark, since the
  // marks alternate after the first pass). Absorbing keeps going so a chain like
  // `mark " " mark " " mark` collapses into one run.
  const result: Segment[] = [];
  for (let i = 0; i < merged.length; i += 1) {
    const current = { ...merged[i] };
    while (
      i + 2 < merged.length &&
      merged[i + 1].value === ' ' &&
      merged[i + 2].mark === current.mark
    ) {
      current.value += merged[i + 1].value + merged[i + 2].value;
      i += 2;
    }
    result.push(current);
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
    if (item && typeof item === 'object' && 'value' in item) {
      const { value, mark } = item as { value: unknown; mark: unknown };
      if (typeof value === 'string') {
        segments.push({ value, mark: mark === true });
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
