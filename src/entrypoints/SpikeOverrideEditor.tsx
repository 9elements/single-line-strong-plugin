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

import { useMemo } from 'react';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

type Span = { type: 'span'; value: string; marks?: string[] };
type Paragraph = { type: 'paragraph'; children: Span[] };
type DastDocument = {
  schema: 'dast';
  document: { type: 'root'; children: Paragraph[] };
};

/** Minimal valid dast for one paragraph, optionally all-bold. */
function buildDast(text: string, bold: boolean): DastDocument | null {
  if (text === '') return null;
  return {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            bold
              ? { type: 'span', value: text, marks: ['strong'] }
              : { type: 'span', value: text },
          ],
        },
      ],
    },
  };
}

/** Flatten whatever is stored back to text + "is anything bold". Tolerant by design. */
function readDast(value: unknown): { text: string; bold: boolean } {
  const doc = (value as DastDocument | null)?.document;
  if (!doc || !Array.isArray(doc.children)) return { text: '', bold: false };

  const spans = doc.children.flatMap((child) =>
    Array.isArray(child?.children) ? child.children : [],
  );

  return {
    text: spans.map((span) => span?.value ?? '').join(''),
    bold: spans.some((span) => span?.marks?.includes('strong')),
  };
}

export function SpikeOverrideEditor({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  const rawValue = ctx.formValues[ctx.fieldPath] as unknown;
  const { text, bold } = useMemo(() => readDast(rawValue), [rawValue]);

  // G1's answer, read straight off the field record the host handed us.
  const editorIdentity = ctx.field.attributes.appearance.editor;
  const addons = ctx.field.attributes.appearance.addons ?? [];
  const identityIsNative = editorIdentity === 'structured_text';

  const write = (nextText: string, nextBold: boolean) => {
    ctx.setFieldValue(ctx.fieldPath, buildDast(nextText, nextBold));
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
