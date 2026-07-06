import { Canvas, TextField } from 'datocms-react-ui';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

type Props = {
  ctx: RenderFieldExtensionCtx;
};

/** The stored data contract (see SPEC.md): an array of text segments. */
type Segment = { text: string; bold: boolean };

/**
 * Walking-skeleton editor (issue #1), storing to a JSON field.
 *
 * A plain text input — no bold, no Lexical yet. Its only job is to prove the
 * end-to-end pipe: build → attach to a JSON field → value persists → GraphQL
 * returns it.
 *
 * A DatoCMS `json` field only accepts a **stringified object/array** (or `null`);
 * a top-level scalar like `"hello"` is rejected with `INVALID_FORMAT`. So even
 * the skeleton must serialize into the SPEC's segment-array shape — here a single
 * non-bold segment. Issue #3 swaps the plain input for a Lexical editor that
 * produces real multi-segment (bold) arrays on top of this same contract.
 */
export function SingleLineStrongEditor({ ctx }: Props) {
  const value = readText(ctx.formValues[ctx.fieldPath]);

  return (
    <Canvas ctx={ctx}>
      <TextField
        id="single-line-strong-raw"
        name="single-line-strong-raw"
        label={ctx.field.attributes.label}
        value={value}
        hint="Walking skeleton: plain text round-trip (no formatting yet)."
        placeholder="Type here…"
        onChange={(newValue) => {
          // Empty → null so Dato `required`/"is empty" semantics stay clean.
          // Otherwise store a single non-bold segment as stringified JSON.
          const segments: Segment[] = [{ text: newValue, bold: false }];
          ctx.setFieldValue(
            ctx.fieldPath,
            newValue === '' ? null : JSON.stringify(segments),
          );
        }}
      />
    </Canvas>
  );
}

/** Reads the stored segment array back into plain text (concatenates segments). */
function readText(rawValue: unknown): string {
  if (typeof rawValue !== 'string' || rawValue.length === 0) return '';
  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return '';
    return parsed
      .map((seg) =>
        seg && typeof seg === 'object' && 'text' in seg
          ? String((seg as Segment).text)
          : '',
      )
      .join('');
  } catch {
    // Stored value isn't JSON we recognise — start from empty rather than crash.
    return '';
  }
}
