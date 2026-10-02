import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  connect,
  type ManualFieldExtensionsCtx,
  type RenderFieldExtensionCtx,
  type RenderManualFieldExtensionConfigScreenCtx,
} from 'datocms-plugin-sdk';
import 'datocms-react-ui/styles.css';

import { SingleLineStrongEditor } from './entrypoints/SingleLineStrongEditor';
import { StrongEditorConfigScreen } from './entrypoints/StrongEditorConfigScreen';
import { SpikeOverrideEditor } from './entrypoints/SpikeOverrideEditor';

// The manual field extension the editor picks as the JSON field's editor.
const FIELD_EXTENSION_ID = 'singleLineStrong';

// SPIKE ONLY — see SPIKE.md. Everything below marked SPIKE is throwaway and
// must not be merged to main.
//
// The override and the addon are two halves of one question. The addon is the
// opt-in signal: enabling it on a field in the Presentation tab is how an editor
// says "treat this field as single-line strong". The override then claims
// exactly those fields at render time. The point of routing it this way rather
// than registering a manual EDITOR extension is that neither an addon nor a
// render-time override rewrites the field's editor identity — which is what
// `ai-translations` dispatches on.
const SPIKE_OVERRIDE_ID = 'spikeOverride';
const SPIKE_ADDON_ID = 'spikeOptIn';

// DatoCMS re-invokes the render hook whenever ctx changes (e.g. on every
// keystroke, as the field value updates). Create the React root ONCE and
// re-render into it so React reconciles the existing tree instead of
// remounting it — otherwise the <input> is recreated each render and loses
// focus after a single character.
let root: Root | null = null;

function render(component: React.ReactNode) {
  if (!root) {
    root = createRoot(document.getElementById('root')!);
  }
  root.render(<StrictMode>{component}</StrictMode>);
}

connect({
  manualFieldExtensions(_ctx: ManualFieldExtensionsCtx) {
    return [
      {
        id: FIELD_EXTENSION_ID,
        name: 'Single-line strong',
        type: 'editor',
        // Restricts the extension so it can only be attached to JSON fields.
        fieldTypes: ['json'],
        // Enables the per-field config screen (renderManualFieldExtensionConfigScreen).
        configurable: true,
      },
      // SPIKE — the opt-in signal. An addon lands in appearance.addons and
      // leaves appearance.editor alone, which is the whole point.
      {
        id: SPIKE_ADDON_ID,
        name: 'SPIKE — single-line strong opt-in',
        type: 'addon',
        fieldTypes: ['structured_text'],
      },
    ];
  },
  // SPIKE — claims any structured_text field carrying the opt-in addon.
  // Synchronous by contract: no awaiting anything in here.
  overrideFieldExtensions(field) {
    if (field.attributes.field_type !== 'structured_text') return;

    const optedIn = field.attributes.appearance.addons.some(
      (addon) => addon.field_extension === SPIKE_ADDON_ID,
    );
    if (!optedIn) return;

    return { editor: { id: SPIKE_OVERRIDE_ID } };
  },
  renderFieldExtension(fieldExtensionId, ctx: RenderFieldExtensionCtx) {
    if (fieldExtensionId === FIELD_EXTENSION_ID) {
      render(<SingleLineStrongEditor ctx={ctx} />);
    }
    // SPIKE
    if (fieldExtensionId === SPIKE_OVERRIDE_ID) {
      render(<SpikeOverrideEditor ctx={ctx} />);
    }
    // SPIKE — the addon renders nothing; it exists only as a flag the
    // override reads. Rendering an empty canvas keeps the field tidy.
    if (fieldExtensionId === SPIKE_ADDON_ID) {
      render(null);
    }
  },
  renderManualFieldExtensionConfigScreen(
    fieldExtensionId,
    ctx: RenderManualFieldExtensionConfigScreenCtx,
  ) {
    if (fieldExtensionId === FIELD_EXTENSION_ID) {
      render(<StrongEditorConfigScreen ctx={ctx} />);
    }
  },
});
