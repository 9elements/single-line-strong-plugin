import { Canvas, TextField } from 'datocms-react-ui';
import type { RenderManualFieldExtensionConfigScreenCtx } from 'datocms-plugin-sdk';

import './StrongEditorConfigScreen.css';

/** Where the structured_text setup instructions live. */
const STRUCTURED_TEXT_SETUP_URL =
  'https://github.com/9elements/single-line-strong-plugin#using-it-on-a-structured-text-field';

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
 * disables the counter and input limit in the editor. Below it, a quiet note points
 * new fields at the structured_text route; it never blocks configuring this one.
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
      {/* Guidance, not a warning: this field works correctly, it is just the older route. */}
      <p className="sls-legacy-note">
        This is the legacy route: supported, but not recommended for new fields. For a
        new field, use a Structured text field with the Single-line strong addon.{' '}
        <a href={STRUCTURED_TEXT_SETUP_URL} target="_blank" rel="noreferrer">
          Setup instructions
        </a>
      </p>
    </Canvas>
  );
}
