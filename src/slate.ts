/**
 * Maps a structured_text field's in-form value to and from {@link Segment}s —
 * the one place that knows that value's shape. Pure: no Lexical, no React.
 *
 * Inside the form, the value is the DatoCMS editor's own Slate-flavoured shape,
 * NOT dast:
 *
 *   [{ type: 'paragraph', children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }] }]
 *
 * A bare array of blocks; `text` rather than `value`; a mark is a boolean key on
 * the leaf rather than an entry in a `marks` array. Dast — `{ schema, document }`
 * with `span` nodes — is what the CMA and GraphQL return, and writing it into the
 * form is rejected. Parsing still accepts it, since an import may supply it.
 *
 * DatoCMS does not document this shape. It was established during the spike by
 * having the native editor store a bold word and reading back what it wrote (see
 * SPIKE.md), so treat it as something that could change: every assumption about
 * it lives here, and the tests in `slate.test.ts` are the alarm if it does.
 *
 * A fully bold line is written as one marked leaf, which is exactly what the native
 * editor stores for it — checked against a live field. (An early spike run suggested
 * a single marked leaf did not persist; that was an artifact of the stub's broken
 * read path, not of DatoCMS.)
 */
import { normalizeSegments, type Segment } from './segments';

/** One leaf of the stored value: a stretch of text, `strong` when bold. Plain leaves carry no `strong` key. */
export type SlateLeaf = { text: string; strong?: true };

/** What {@link serializeSlateValue} writes: a single paragraph holding one leaf per segment. */
export type SlateValue = { type: 'paragraph'; children: SlateLeaf[] }[];

/**
 * Reads whatever the form (or an import) hands back into normalized segments.
 *
 * Tolerant by design: `null`, a string or any other unrecognizable value yields an
 * empty list rather than throwing, so a malformed value degrades to an empty editor
 * instead of a crash. Beyond the plain shape it also accepts:
 *   - several paragraphs, flattened onto one line and joined by a single space;
 *   - text nested in headings, links and lists, which the editor cannot show;
 *   - marks other than strong, which are dropped;
 *   - the dast wrapper the CMA and GraphQL return.
 */
export function parseSlateValue(raw: unknown): Segment[] {
  const line: Segment[] = [];
  for (const block of topLevelBlocks(raw)) {
    const segments = collectSegments(block);
    // A paragraph with no visible text contributes nothing, not even a separator.
    if (segments.every((s) => s.value.trim() === '')) continue;

    // Paragraphs become one line, joined by a plain space — unless one side
    // already supplies the whitespace, which would otherwise be doubled.
    const suppliesSpace =
      line.length === 0 ||
      /\s$/.test(line[line.length - 1].value) ||
      /^\s/.test(segments[0].value);
    if (!suppliesSpace) line.push({ value: ' ', mark: false });
    line.push(...segments);
  }
  return normalizeSegments(line);
}

/**
 * Writes segments as the single-paragraph value the form holds, one leaf per
 * segment, as the native editor does. Normalizes first, so one text always has
 * exactly one stored form.
 *
 * An empty field yields `null` rather than an empty paragraph, so DatoCMS's
 * `required` validation and "is empty" filters see it as empty.
 */
export function serializeSlateValue(segments: Segment[]): SlateValue | null {
  const normalized = normalizeSegments(segments);
  if (normalized.length === 0) return null;

  const leaves = normalized.map(
    (s): SlateLeaf => (s.mark ? { text: s.value, strong: true } : { text: s.value }),
  );
  return [{ type: 'paragraph', children: leaves }];
}

/**
 * What, if anything, to write back when the editor reports `segments` for a field
 * whose form value is `stored`. `undefined` means nothing; `{ value }` is a write,
 * and `value` may be `null` when the field was cleared.
 *
 * The editor reports its content once when a record opens, as if it had changed.
 * Writing that back would mark the record dirty, and would rewrite a value nobody
 * edited — including one that was only normalized for display, such as an import
 * with two paragraphs. So a report that matches what is already stored, once both
 * are in canonical form, is not a change. Only a real edit writes, and only then
 * is the normalized form persisted.
 */
export function valueToWrite(
  stored: unknown,
  segments: Segment[],
): { value: SlateValue | null } | undefined {
  const next = serializeSlateValue(segments);
  const current = serializeSlateValue(parseSlateValue(stored));
  if (JSON.stringify(next) === JSON.stringify(current)) return undefined;
  return { value: next };
}

/** The form's own value is a bare array of blocks; dast wraps the same in `document`. */
function topLevelBlocks(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const children = (raw as { document?: { children?: unknown } } | null)?.document
    ?.children;
  return Array.isArray(children) ? children : [];
}

/**
 * Every segment of text under `node`, in order, whatever it is nested in — a
 * heading, a link, a list — since the editor can show none of that structure.
 * Anything with neither text nor children (an embedded block, say) contributes
 * nothing.
 */
function collectSegments(node: unknown): Segment[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as {
    text?: unknown;
    strong?: unknown;
    type?: unknown;
    value?: unknown;
    marks?: unknown;
    children?: unknown;
  };

  // A Slate leaf: `{ text, strong: true }`.
  if (typeof n.text === 'string') {
    return n.text.length === 0 ? [] : [{ value: n.text, mark: n.strong === true }];
  }
  // A dast span: `{ type: 'span', value, marks: ['strong'] }`.
  if (n.type === 'span' && typeof n.value === 'string') {
    const mark = Array.isArray(n.marks) && n.marks.includes('strong');
    return n.value.length === 0 ? [] : [{ value: n.value, mark }];
  }
  if (Array.isArray(n.children)) return n.children.flatMap(collectSegments);
  return [];
}
