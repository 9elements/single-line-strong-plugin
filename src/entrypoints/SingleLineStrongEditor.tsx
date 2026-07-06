import { useRef } from 'react';
import { Canvas } from 'datocms-react-ui';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

import { parseFieldValue, serializeFieldValue, type Segment } from '../segments';
import { StrongEditor } from './StrongEditor';

type Props = {
  ctx: RenderFieldExtensionCtx;
};

/**
 * The manual field extension: a single-line, bold-only text editor bound to a
 * DatoCMS `json` field.
 *
 * The stored value is a normalized segment array (see SPEC.md). We parse it into
 * the editor on mount and write it back — serialized, with `null` for empty — on
 * every change. Actual editing (bold toggle, single-line enforcement, plain-text
 * paste, WYSIWYG) lives in {@link StrongEditor}.
 */
export function SingleLineStrongEditor({ ctx }: Props) {
  const initialSegments = parseFieldValue(ctx.formValues[ctx.fieldPath]);
  // Per-field placeholder comes from the extension's instance parameters
  // (configured on the config screen built in issue #4).
  const { placeholder } = ctx.parameters as { placeholder?: string };

  // Track the last value we serialized so we can skip redundant writes. Seeded
  // with the stored value so the editor's onChange-on-mount doesn't write the
  // field back to itself; updated on every real change below. (Dato also
  // re-renders us after each setFieldValue — this guard absorbs that too.)
  const lastWritten = useRef<string | null>(serializeFieldValue(initialSegments));

  const handleChange = (segments: Segment[]) => {
    const value = serializeFieldValue(segments);
    if (value === lastWritten.current) return;
    lastWritten.current = value;
    ctx.setFieldValue(ctx.fieldPath, value);
  };

  return (
    <Canvas ctx={ctx}>
      <StrongEditor
        // Remount when the field/locale changes so the stored value for the new
        // locale is loaded as the editor's initial state.
        key={ctx.fieldPath}
        initialSegments={initialSegments}
        onChange={handleChange}
        label={ctx.field.attributes.label}
        placeholder={placeholder}
        disabled={ctx.disabled}
      />
    </Canvas>
  );
}
