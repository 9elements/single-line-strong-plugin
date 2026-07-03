import { Canvas, TextField } from 'datocms-react-ui';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

type Props = {
  ctx: RenderFieldExtensionCtx;
};

/**
 * Walking-skeleton editor (issue #1).
 *
 * A plain text input bound to the JSON field's raw value. It reads the current
 * value from the form state and writes it back verbatim via `setFieldValue` —
 * no bold, no Lexical, no segment-array normalization yet. The point is only to
 * prove the end-to-end pipe: build → attach to a JSON field → value persists →
 * GraphQL returns it.
 */
export function SingleLineStrongEditor({ ctx }: Props) {
  // JSON fields hand us the stored value verbatim (a string, or null when empty).
  const rawValue = ctx.formValues[ctx.fieldPath];
  const value = typeof rawValue === 'string' ? rawValue : '';

  return (
    <Canvas ctx={ctx}>
      <TextField
        id="single-line-strong-raw"
        name="single-line-strong-raw"
        label={ctx.field.attributes.label}
        value={value}
        hint="Walking skeleton: raw value round-trip (no formatting yet)."
        placeholder="Type here…"
        onChange={(newValue) => {
          // Store null for an empty field so Dato `required`/"is empty" semantics
          // stay clean; otherwise persist the raw string as-is.
          ctx.setFieldValue(ctx.fieldPath, newValue === '' ? null : newValue);
        }}
      />
    </Canvas>
  );
}
