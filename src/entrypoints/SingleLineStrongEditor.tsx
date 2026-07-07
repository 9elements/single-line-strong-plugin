import { Canvas } from 'datocms-react-ui';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

import { parseFieldValue, serializeFieldValue, type Segment } from '../segments';
import { StrongEditor } from './StrongEditor';
import type { StrongEditorParameters } from './StrongEditorConfigScreen';

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
  // Per-field settings come from the extension's instance parameters, set on the
  // config screen (see StrongEditorConfigScreen). `maxLength` is optional.
  const { maxLength } = ctx.parameters as StrongEditorParameters;

  const handleChange = (segments: Segment[]) => {
    const value = serializeFieldValue(segments);
    // Skip writing back a value equal to what's already stored. This absorbs the
    // editor's onChange-on-mount, Dato's re-render after each setFieldValue, and
    // the reconciliation write when a late-arriving stored value is adopted into
    // the editor (see ExternalValueSyncPlugin) — none of which should mark the
    // record dirty. Comparing the round-tripped current value keeps the check
    // canonical regardless of how Dato hands the stored value back.
    const current = serializeFieldValue(parseFieldValue(ctx.formValues[ctx.fieldPath]));
    if (value === current) return;
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
        maxLength={maxLength}
        disabled={ctx.disabled}
      />
    </Canvas>
  );
}
