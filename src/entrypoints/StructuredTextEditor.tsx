import { Canvas } from 'datocms-react-ui';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

import { nativeMaxLength } from '../field-config';
import { getValueAtPath } from '../field-path';
import type { Segment } from '../segments';
import { parseSlateValue, valueToWrite, wasNormalised } from '../slate';
import { StrongEditor } from './StrongEditor';
import './StructuredTextEditor.css';

type Props = {
  ctx: RenderFieldExtensionCtx;
};

/**
 * The override's editor: the same single-line, bold-only editor the JSON route
 * uses, bound to a `structured_text` field that carries the plugin's addon.
 *
 * It renders {@link StrongEditor} exactly as the JSON route's wrapper does, so the
 * two look and behave alike — one box, the B button on the left — and anyone seeing
 * them side by side recognises one plugin. Only the value mapping differs: the
 * stored value is the form's Slate-flavoured shape, read and written through
 * `slate.ts`, and the field keeps identifying as `structured_text` to every other
 * tool because this is an override, not a manual editor extension.
 */
export function StructuredTextEditor({ ctx }: Props) {
  const stored = getValueAtPath(ctx.formValues, ctx.fieldPath);
  const initialSegments = parseSlateValue(stored);
  // Only while the stored value still differs from what is shown: once the person
  // edits, the normalised form is persisted and the notice goes away on its own.
  const adjusted = wasNormalised(stored);
  const maxLength = nativeMaxLength(ctx.field);
  const visibleLength = initialSegments.reduce((n, s) => n + s.value.length, 0);
  // DatoCMS reports a failed length validator with a raw `fieldError.undefined`
  // that a plugin cannot replace, so say in words what is wrong.
  const overLimit = maxLength !== undefined && visibleLength > maxLength;

  const handleChange = (segments: Segment[]) => {
    // Nothing to write when the editor merely reports what is already stored. That
    // absorbs its onChange-on-mount and DatoCMS's re-render after each write, and is
    // what keeps opening a record from modifying it.
    const write = valueToWrite(stored, segments);
    if (!write) return;

    // Always the dotted path. Writing the bare field name would replace the whole
    // per-locale object and destroy every other locale.
    ctx.setFieldValue(ctx.fieldPath, write.value);
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
        // The limit is the field's native length validator, which DatoCMS enforces
        // at save. The counter and input limit are only the editing affordance.
        maxLength={maxLength}
        disabled={ctx.disabled}
        // A translation can land in this editor while it has focus, and must show up
        // without waiting for the user to click away.
        adoptExternalWhileFocused
      />
      {overLimit && (
        <p className="st-editor__notice" role="alert">
          This text has {visibleLength} characters; the field allows {maxLength}.
          Shorten it to save the record.
        </p>
      )}
      {adjusted && (
        <p className="st-editor__notice" role="status">
          This value was adjusted to fit a single line with bold only. Nothing is
          saved until you edit the field.
        </p>
      )}
    </Canvas>
  );
}
