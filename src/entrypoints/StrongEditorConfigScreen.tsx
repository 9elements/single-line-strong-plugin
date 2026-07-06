import { Canvas, TextField } from 'datocms-react-ui';
import type { RenderManualFieldExtensionConfigScreenCtx } from 'datocms-plugin-sdk';

/** The per-field parameters an admin sets on the config screen. */
export type StrongEditorParameters = {
  /** Optional cap on the visible-text length; omitted means no limit. */
  maxLength?: number;
};

type Props = {
  ctx: RenderManualFieldExtensionConfigScreenCtx;
};

/**
 * The manual field extension's config screen (rendered by Dato when an admin
 * attaches this editor to a field). It exposes a single optional setting: a
 * maximum character count. Leaving it empty stores no `maxLength`, which
 * disables the counter and input limit in the editor.
 */
export function StrongEditorConfigScreen({ ctx }: Props) {
  const { maxLength } = ctx.parameters as StrongEditorParameters;

  return (
    <Canvas ctx={ctx}>
      <TextField
        id="maxLength"
        name="maxLength"
        label="Maximum character count"
        hint="Optional. Counts visible text only — bold markup doesn't count toward the limit. Leave empty for no limit."
        value={maxLength == null ? '' : String(maxLength)}
        textInputProps={{ type: 'number', min: 1, step: 1 }}
        onChange={(value) => {
          const parsed = Number.parseInt(value, 10);
          // Empty / non-numeric / non-positive all mean "no limit" (undefined),
          // so the setting round-trips cleanly and never stores a bogus cap.
          const next =
            Number.isNaN(parsed) || parsed < 1 ? undefined : parsed;
          void ctx.setParameters({ maxLength: next });
        }}
      />
    </Canvas>
  );
}
