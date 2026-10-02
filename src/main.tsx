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
  // SPIKE — to hand the field back to DatoCMS's native editor, change the
  // plugin's registered entry point URL to http://localhost:5173/?spikeOff=1
  // and reload. Needed to discover the real Slate mark key: make a value bold
  // natively, then remove the flag and read what was actually stored.
  //
  // NOT localStorage: the plugin runs in its own iframe on its own origin, so
  // storage set in the DatoCMS tab is invisible here.
  overrideFieldExtensions(field) {
    if (new URLSearchParams(window.location.search).has('spikeOff')) return;

    // Called for EVERY field in the project, so anything that throws here
    // takes down the whole plugin handshake. Defend accordingly: `addons` is
    // documented as required but is absent on some fields in practice.
    if (field?.attributes?.field_type !== 'structured_text') return;

    const addons = field.attributes.appearance?.addons;
    if (!Array.isArray(addons)) return;

    const optedIn = addons.some(
      (addon) => addon?.field_extension === SPIKE_ADDON_ID,
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
    // SPIKE — the addon is only a flag for the override to read, so it renders
    // nothing. Deliberately NOT render(null): every extension in this bundle
    // shares one React root, and rendering null into it unmounts whatever the
    // override just mounted in its own frame — which presents as an input that
    // silently refuses to accept typing.
    //
    // For the real implementation: a shared root across extensions is a trap.
    // Key the root per extension id, or give the addon its own.
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
