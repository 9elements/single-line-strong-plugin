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
 *     *other* mark is absorbed into them,
 *   - whitespace at the leading/trailing edge of a *marked* run is pushed out
 *     onto the neighbouring unmarked run, and
 *   - leading whitespace is trimmed off the first segment and trailing
 *     whitespace off the last segment.
 *
 * The absorption rule reflects that a space's mark is visually meaningless: e.g.
 * `"jetzt"(mark) + " "(plain) + "mein"(mark)` should collapse into a single
 * marked `"jetzt mein"` rather than three segments split by an unmarked space.
 *
 * The edge-shift rule keeps marked runs tight so a bold word doesn't swallow the
 * adjoining space: `"This is"(plain) + " Bold"(mark)` becomes
 * `"This is "(plain) + "Bold"(mark)`, which renders `This is <strong>Bold</strong>`
 * rather than `This is<strong> Bold</strong>`. Interior spaces inside a bold
 * phrase (e.g. a bold `"two words"`) are untouched.
 *
 * Trimming touches only the two outer edges of the whole text, so interior
 * whitespace between differently-marked runs is preserved (the concatenated text
 * keeps its spaces); only leading/trailing whitespace of the field is dropped.
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
  const absorbed: Segment[] = [];
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
    absorbed.push(current);
  }

  // Third pass: push whitespace out of the edges of marked runs onto their
  // unmarked neighbours, so a bold run never begins or ends with a space (that
  // space belongs visually to the surrounding plain text). Leading whitespace
  // moves to the end of the previous run; trailing whitespace to the start of the
  // next. Because marks strictly alternate here, that neighbour is always
  // unmarked. Whitespace with no neighbour to receive it sits at the field edge
  // and is handled by the trim pass below. Interior whitespace is left intact.
  const shifted: Segment[] = absorbed.map((s) => ({ ...s }));
  for (let i = 0; i < shifted.length; i += 1) {
    const seg = shifted[i];
    if (!seg.mark) continue;

    const lead = seg.value.match(/^\s+/)?.[0] ?? '';
    if (lead && i > 0) {
      seg.value = seg.value.slice(lead.length);
      shifted[i - 1].value += lead;
    }

    const trail = seg.value.match(/\s+$/)?.[0] ?? '';
    if (trail && i < shifted.length - 1) {
      seg.value = seg.value.slice(0, seg.value.length - trail.length);
      shifted[i + 1].value = trail + shifted[i + 1].value;
    }
  }

  // Fourth pass: trim only the outer edges — leading whitespace off the first run
  // and trailing whitespace off the last run — leaving interior whitespace
  // intact. Drop any run that becomes empty, and re-merge runs left adjacent with
  // the same mark (dropping an emptied edge run can create such adjacency).
  const result: Segment[] = [];
  for (let i = 0; i < shifted.length; i += 1) {
    let value = shifted[i].value;
    if (i === 0) value = value.trimStart();
    if (i === shifted.length - 1) value = value.trimEnd();
    if (value.length === 0) continue;
    const { mark } = shifted[i];
    const last = result[result.length - 1];
    if (last && last.mark === mark) {
      last.value += value;
    } else {
      result.push({ value, mark });
    }
  }
  return result;
}

/** The stored object shape: the segment array plus a plain-text mirror. */
export type FieldValue = { segments: Segment[]; raw: string };

/**
 * The plain-text projection of a segment array: every segment's text
 * concatenated, with all marks dropped. Since the input is normalized, this is
 * already edge-trimmed with canonical interior spacing — usable as-is for slugs,
 * meta tags, or anywhere the marked-up structure isn't wanted.
 */
export function rawText(segments: Segment[]): string {
  return segments.map((s) => s.value).join('');
}

/**
 * Serializes segments into the value stored on the DatoCMS `json` field.
 *
 * An empty field stores `null` (not `[]`) so Dato's `required` validation and
 * "is empty" filters behave cleanly. A non-empty field stores an object with the
 * normalized `segments` array plus a `raw` plain-text mirror (see {@link rawText}),
 * serialized as a JSON *string* — a `json` field rejects a top-level scalar but
 * accepts a stringified object/array (see the plugin gotchas note).
 */
export function serializeFieldValue(segments: Segment[]): string | null {
  const normalized = normalizeSegments(segments);
  if (normalized.length === 0) return null;
  const value: FieldValue = { segments: normalized, raw: rawText(normalized) };
  return JSON.stringify(value);
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
 * Dato hands JSON fields back as a stringified value, but be liberal about what
 * we accept and about how deeply parsed it already is:
 *   - the current shape: an object `{ segments: [...], raw }` (the `raw` mirror is
 *     re-derived on write, so we read only `segments`),
 *   - a bare array `[...]` — the legacy shape stored before `raw` was added,
 * either as a JSON string or already parsed. Anything else → null.
 */
function coerceToArray(rawValue: unknown): unknown[] | null {
  const parsed =
    typeof rawValue === 'string'
      ? tryParseJson(rawValue)
      : rawValue;

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && 'segments' in parsed) {
    const { segments } = parsed as { segments: unknown };
    return Array.isArray(segments) ? segments : null;
  }
  return null;
}

function tryParseJson(value: string): unknown {
  if (value.length === 0) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
