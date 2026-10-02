/**
 * SPIKE ONLY — throwaway. See SPIKE.md.
 *
 * A deliberately crude editor used to answer G1 and G2: does
 * `overrideFieldExtensions` leave a field's editor identity intact, and does
 * `ai-translations` then work on that field?
 *
 * There is no Lexical here and no bridge. Bold is applied to a whole value or
 * not at all, because the question is whether the mark SURVIVES a translation
 * round trip — not whether we can author marks nicely. Resist improving it.
 */

import { useMemo, useState } from 'react';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

/**
 * IMPORTANT, and the first real finding of this spike: inside the form,
 * ctx.formValues holds the editor's own Slate-flavoured shape
 *
 *   [{ type: 'paragraph', children: [{ text: 'hi', strong: true }] }]
 *
 * — a bare array, `text` rather than `value`, and marks as boolean keys on the
 * leaf. That is NOT dast. Dast ({ schema, document } with `value` and a `marks`
 * array) is what the CMA and GraphQL return. Writing dast here is rejected,
 * which is why saving failed.
 */

type Leaf = { text: string; strong?: boolean };
type Block = { type: 'paragraph'; children: Leaf[] };

/**
 * One paragraph in the form's Slate shape.
 *
 * `strong: true` on a leaf is confirmed correct — it is what DatoCMS's own
 * editor writes. What does NOT survive is a single leaf carrying the mark for
 * the entire value; the native editor always emits separate leaves per run.
 * So when bold is on, split the last word into its own marked leaf, which is
 * enough to prove mark round-tripping through translation.
 */
function buildValue(text: string, bold: boolean): Block[] | null {
  if (text === '') return null;

  if (!bold) {
    return [{ type: 'paragraph', children: [{ text }] }];
  }

  const splitAt = text.lastIndexOf(' ');
  const children: Leaf[] =
    splitAt === -1
      ? [{ text: ' ' }, { text, strong: true }]
      : [
          { text: text.slice(0, splitAt + 1) },
          { text: text.slice(splitAt + 1), strong: true },
        ];

  return [{ type: 'paragraph', children }];
}

/**
 * Flatten the stored value back to text + "is anything bold".
 *
 * Reads BOTH shapes on purpose. A freshly loaded record can hand us dast
 * ({ schema, document }, `value`, `marks: [...]`) while the live form hands us
 * the Slate array — so an editor that understands only one of them goes inert
 * after a reload, which is exactly what happened here.
 */
function readValue(value: unknown): { text: string; bold: boolean } {
  // dast — what the CMA and GraphQL return.
  const dastDocument = (value as { document?: { children?: unknown[] } } | null)
    ?.document;
  if (dastDocument && Array.isArray(dastDocument.children)) {
    const spans = dastDocument.children.flatMap((child) => {
      const children = (child as { children?: unknown[] })?.children;
      return Array.isArray(children) ? children : [];
    }) as { value?: string; marks?: string[] }[];

    return {
      text: spans.map((span) => span?.value ?? '').join(''),
      bold: spans.some((span) => span?.marks?.includes('strong')),
    };
  }

  // Slate — what the live form holds.
  const blocks = Array.isArray(value) ? (value as Block[]) : [];
  const leaves = blocks.flatMap((block) =>
    Array.isArray(block?.children) ? block.children : [],
  );

  return {
    text: leaves.map((leaf) => leaf?.text ?? '').join(''),
    bold: leaves.some((leaf) => leaf?.strong === true),
  };
}

export function SpikeOverrideEditor({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  const [lastWrite, setLastWrite] = useState<string | null>(null);
  // SPIKE FINDING: on a LOCALIZED field, ctx.fieldPath is "headline.de" but
  // ctx.formValues is keyed by the bare field name, holding a per-locale
  // object: { headline: { de: <value>, en: <value> } }. Reading
  // formValues[fieldPath] therefore yields undefined and the editor looks
  // permanently empty. Resolve the path properly instead.
  const rawValue = useMemo(() => {
    const [fieldName, locale] = ctx.fieldPath.split('.');
    const atField = ctx.formValues[fieldName] as unknown;
    if (!locale) return atField;
    return (atField as Record<string, unknown> | null)?.[locale];
  }, [ctx.formValues, ctx.fieldPath]);
  const fromForm = useMemo(() => readValue(rawValue), [rawValue]);

  // SPIKE FINDING: ctx.formValues does NOT reflect what setFieldValue just
  // wrote — the write resolves OK, but reading the path back still yields the
  // previous value. Driving the input straight off formValues therefore loses
  // every keystroke but the last. Local state owns what is being typed;
  // formValues only seeds it.
  const [draft, setDraft] = useState<{ text: string; bold: boolean } | null>(
    null,
  );
  const { text, bold } = draft ?? fromForm;

  // G1's answer, read straight off the field record the host handed us.
  const editorIdentity = ctx.field?.attributes?.appearance?.editor;
  const addons = ctx.field?.attributes?.appearance?.addons ?? [];
  const identityIsNative = editorIdentity === 'structured_text';

  const write = (nextText: string, nextBold: boolean) => {
    setDraft({ text: nextText, bold: nextBold });
    const next = buildValue(nextText, nextBold);
    // `strong: true` on the leaf is a GUESS at DatoCMS's internal Slate mark
    // key, and it does not survive a save — the value comes back unbolded.
    // The native editor's own output is the only authority here; see the
    // "disable override" switch below.

    // Write to the dotted path only. The earlier bare-path write was a
    // mistake: on a localized field it replaces the whole per-locale object,
    // which would wipe every other locale.
    setLastWrite(`sent to "${ctx.fieldPath}"`);

    Promise.resolve(ctx.setFieldValue(ctx.fieldPath, next))
      .then(() => setLastWrite(`OK ${JSON.stringify(next)}`))
      .catch((error: unknown) =>
        setLastWrite(`REJECTED ${String(error)} — sent ${JSON.stringify(next)}`),
      );
  };

  return (
    <Canvas ctx={ctx}>
      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={text}
            disabled={ctx.disabled}
            placeholder="Spike override — type here"
            onChange={(event) => write(event.target.value, bold)}
            style={{
              flex: 1,
              padding: '8px',
              fontWeight: bold ? 700 : 400,
              font: 'inherit',
              color: 'inherit',
              background: 'transparent',
              border: '1px solid currentColor',
              borderRadius: '3px',
            }}
          />
          <button
            type="button"
            disabled={ctx.disabled}
            onClick={() => write(text, !bold)}
            style={{ fontWeight: 700, padding: '8px 12px' }}
          >
            B
          </button>
        </div>

        {/* The spike's actual output. Read these, record them in SPIKE.md. */}
        <dl
          style={{
            margin: 0,
            padding: '8px',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 12px',
            background: identityIsNative ? '#e8f5e9' : '#ffebee',
            // Set explicitly: DatoCMS's dark theme inherits a near-white text
            // colour, which is invisible on these light panels.
            color: identityIsNative ? '#1b5e20' : '#b71c1c',
            border: `1px solid ${identityIsNative ? '#66bb6a' : '#ef5350'}`,
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          <dt>
            <strong>G1</strong> appearance.editor
          </dt>
          <dd style={{ margin: 0 }}>
            {String(editorIdentity)} {identityIsNative ? '— PASS' : '— FAIL'}
          </dd>

          <dt>field_type</dt>
          <dd style={{ margin: 0 }}>{ctx.field.attributes.field_type}</dd>

          <dt>
            <strong>S1</strong> addons
          </dt>
          <dd style={{ margin: 0 }}>
            {addons.length === 0
              ? 'none'
              : addons
                  .map((a) => `${a.id}/${a.field_extension ?? '?'}`)
                  .join(', ')}
          </dd>

          <dt>disabled</dt>
          <dd style={{ margin: 0 }}>
            {String(ctx.disabled)}
            {ctx.disabled ? ' — INPUT IS LOCKED' : ''}
          </dd>

          <dt>locale / fieldPath</dt>
          <dd style={{ margin: 0 }}>
            {String(ctx.locale)} / {String(ctx.fieldPath)}
          </dd>

          <dt>last write</dt>
          <dd style={{ margin: 0, wordBreak: 'break-all' }}>
            {lastWrite ?? 'nothing written yet'}
          </dd>

          <dt>formValues keys</dt>
          <dd style={{ margin: 0, wordBreak: 'break-all' }}>
            {Object.keys(ctx.formValues).join(', ') || '(none)'}
          </dd>

          <dt>draft vs form</dt>
          <dd style={{ margin: 0 }}>
            draft "{text}" {bold ? '(bold)' : ''} / form "{fromForm.text}"
            {fromForm.text === text ? ' — in sync' : ' — FORM IS STALE'}
          </dd>

          <dt>shape</dt>
          <dd style={{ margin: 0 }}>
            {rawValue === null || rawValue === undefined
              ? 'empty'
              : Array.isArray(rawValue)
                ? 'slate (form)'
                : (rawValue as { document?: unknown })?.document
                  ? 'dast (stored)'
                  : 'UNKNOWN'}
          </dd>

          <dt>stored value</dt>
          <dd style={{ margin: 0, wordBreak: 'break-all' }}>
            {rawValue === null || rawValue === undefined
              ? 'null'
              : JSON.stringify(rawValue)}
          </dd>
        </dl>
      </div>
    </Canvas>
  );
}
